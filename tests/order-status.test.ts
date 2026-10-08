import { test } from "node:test";
import assert from "node:assert/strict";
import { request, setAccessToken, ApiError } from "../lib/api/client";
import { parseApiDate } from "../lib/format";
import {
  cancelOrder,
  getAdminOrders,
  getOrderStatusHistory,
  ordersApi,
  updateOrderStatus,
} from "../lib/api/orders";
import {
  canCancelOrder,
  getAllowedOrderTransitions,
  isOrderStatus,
  orderStatusLabel,
} from "../lib/order-status";
import type { OrderStatus } from "../types";
test("order status transitions mirror the API state machine", () => {
  const expected: Record<OrderStatus, OrderStatus[]> = {
    Pending: ["Paid", "Cancelled"],
    Paid: ["Preparing", "Cancelled"],
    Preparing: ["Shipped", "Cancelled"],
    Shipped: ["Delivered"],
    Delivered: [],
    Cancelled: [],
  };
  for (const [status, next] of Object.entries(expected))
    assert.deepEqual(getAllowedOrderTransitions(status as OrderStatus), next);
  assert.equal(
    getAllowedOrderTransitions("Pending").includes("Delivered"),
    false,
  );
  assert.equal(
    getAllowedOrderTransitions("Cancelled").includes("Shipped"),
    false,
  );
  assert.equal(getAllowedOrderTransitions("Delivered").includes("Paid"), false);
});
test("order status helpers tolerate unknown API values", () => {
  const unknown = "Refunded" as OrderStatus;
  assert.deepEqual(getAllowedOrderTransitions(unknown), []);
  assert.equal(orderStatusLabel(unknown), "Refunded");
  assert.equal(isOrderStatus("toString"), false);
  assert.equal(orderStatusLabel("Shipped"), "Kargoya Verildi");
});
test("customers can cancel only before shipping", () => {
  for (const status of ["Pending", "Paid", "Preparing"] as const)
    assert.equal(canCancelOrder(status), true);
  for (const status of ["Shipped", "Delivered", "Cancelled"] as const)
    assert.equal(canCancelOrder(status), false);
  assert.equal(canCancelOrder("Refunded" as OrderStatus), false);
});
test("API timestamps are read as UTC", () => {
  const utc = "2026-10-08T09:32:20.000Z";
  assert.equal(parseApiDate("2026-10-08T09:32:20").toISOString(), utc);
  assert.equal(parseApiDate("2026-10-08T09:32:20.000Z").toISOString(), utc);
  assert.equal(parseApiDate("2026-10-08T12:32:20+03:00").toISOString(), utc);
});
test("transition list cannot mutate the shared rules", () => {
  getAllowedOrderTransitions("Pending").push("Delivered");
  assert.deepEqual(getAllowedOrderTransitions("Pending"), [
    "Paid",
    "Cancelled",
  ]);
});
test("order status API contract", async (context) => {
  process.env.NEXT_PUBLIC_API_URL = "https://shopapi.example.test/";
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
    setAccessToken(null);
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  await context.test(
    "PATCH sends the English enum with bearer auth",
    async () => {
      setAccessToken("admin-token");
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "https://shopapi.example.test/api/orders/7/status");
        assert.equal(options?.method, "PATCH");
        assert.deepEqual(JSON.parse(String(options?.body)), {
          status: "Delivered",
        });
        assert.equal(
          new Headers(options?.headers).get("Authorization"),
          "Bearer admin-token",
        );
        return Response.json({
          data: { id: 7, status: "Delivered" },
          message: "Sipariş durumu güncellendi.",
          statusCode: 200,
        });
      };
      const result = await updateOrderStatus(7, "Delivered");
      assert.equal(result.data.status, "Delivered");
      assert.equal(result.message, "Sipariş durumu güncellendi.");
      assert.equal(updateOrderStatus, ordersApi.updateStatus);
    },
  );
  for (const errCode of [
    "invalidOrderStatusTransition",
    "orderAlreadyInStatus",
  ])
    await context.test(`409 ${errCode} surfaces the API message`, async () => {
      const message =
        "Pending durumundaki sipariş Delivered durumuna geçirilemez.";
      globalThis.fetch = async () =>
        Response.json(
          { data: null, message, errCode, statusCode: 409 },
          { status: 409 },
        );
      await assert.rejects(
        ordersApi.updateStatus(1, "Delivered"),
        (error) =>
          error instanceof ApiError &&
          error.status === 409 &&
          error.code === errCode &&
          error.message === message,
      );
    });
  await context.test("GET admin orders sends bearer auth", async () => {
    setAccessToken("admin-token");
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://shopapi.example.test/api/orders/admin");
      assert.equal(options?.method, undefined);
      assert.equal(
        new Headers(options?.headers).get("Authorization"),
        "Bearer admin-token",
      );
      return Response.json({
        data: [
          {
            id: 3,
            userId: 9,
            customerName: "Ada",
            customerEmail: "ada@example.test",
            status: "Paid",
            totalPrice: 120,
            createdAt: "2026-10-06T10:00:00Z",
            totalQuantity: 2,
          },
        ],
        statusCode: 200,
      });
    };
    const result = await getAdminOrders();
    assert.equal(result.data[0].customerEmail, "ada@example.test");
    assert.equal(result.data[0].totalQuantity, 2);
  });
  await context.test("PATCH cancel sends no body", async () => {
    setAccessToken("customer-token");
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://shopapi.example.test/api/orders/5/cancel");
      assert.equal(options?.method, "PATCH");
      assert.equal(options?.body, undefined);
      assert.equal(new Headers(options?.headers).get("Content-Type"), null);
      return Response.json({
        data: { id: 5, status: "Cancelled" },
        message: "Sipariş başarıyla iptal edildi.",
        statusCode: 200,
      });
    };
    const result = await cancelOrder(5);
    assert.equal(result.data.status, "Cancelled");
    assert.equal(result.message, "Sipariş başarıyla iptal edildi.");
  });
  await context.test(
    "409 on repeated cancel surfaces the API message",
    async () => {
      const message = "Sipariş zaten bu durumda.";
      globalThis.fetch = async () =>
        Response.json(
          {
            data: null,
            message,
            errCode: "orderAlreadyInStatus",
            statusCode: 409,
          },
          { status: 409 },
        );
      await assert.rejects(
        cancelOrder(5),
        (error) =>
          error instanceof ApiError &&
          error.status === 409 &&
          error.message === message,
      );
    },
  );
  await context.test("GET history keeps the API order and nulls", async () => {
    setAccessToken("customer-token");
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://shopapi.example.test/api/orders/5/history");
      assert.equal(
        new Headers(options?.headers).get("Authorization"),
        "Bearer customer-token",
      );
      return Response.json({
        data: [
          {
            id: 1,
            oldStatus: null,
            newStatus: "Pending",
            changedByUserId: 9,
            changedByName: "Ada",
            changedAt: "2026-10-08T09:00:00Z",
          },
          {
            id: 2,
            oldStatus: "Pending",
            newStatus: "Cancelled",
            changedByUserId: null,
            changedByName: null,
            changedAt: "2026-10-08T10:00:00Z",
          },
        ],
        statusCode: 200,
      });
    };
    const result = await getOrderStatusHistory(5);
    assert.deepEqual(
      result.data.map((h) => [h.oldStatus, h.newStatus]),
      [
        [null, "Pending"],
        ["Pending", "Cancelled"],
      ],
    );
    assert.equal(result.data[1].changedByName, null);
  });
  await context.test("another customer's history is a 404", async () => {
    globalThis.fetch = async () =>
      Response.json(
        {
          data: null,
          message: "Sipariş bulunamadı.",
          errCode: "orderNotFound",
          statusCode: 404,
        },
        { status: 404 },
      );
    await assert.rejects(
      getOrderStatusHistory(99),
      (error) =>
        error instanceof ApiError &&
        error.status === 404 &&
        error.message === "Sipariş bulunamadı.",
    );
  });
  await context.test("403 for customers keeps a readable message", async () => {
    globalThis.fetch = async () => new Response(null, { status: 403 });
    await assert.rejects(
      request("/api/orders/1/status", { method: "PATCH" }),
      (error) => error instanceof ApiError && error.status === 403,
    );
    globalThis.fetch = async () =>
      Response.json(
        { data: null, message: "Bu işlem için yetkiniz yok.", statusCode: 403 },
        { status: 403 },
      );
    await assert.rejects(
      getAdminOrders(),
      (error) =>
        error instanceof ApiError &&
        error.status === 403 &&
        error.message === "Bu işlem için yetkiniz yok.",
    );
  });
});
