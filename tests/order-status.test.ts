import { test } from "node:test";
import assert from "node:assert/strict";
import { request, setAccessToken, ApiError } from "../lib/api/client";
import { ordersApi, updateOrderStatus } from "../lib/api/orders";
import {
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
  await context.test("403 for customers keeps a readable message", async () => {
    globalThis.fetch = async () => new Response(null, { status: 403 });
    await assert.rejects(
      request("/api/orders/1/status", { method: "PATCH" }),
      (error) => error instanceof ApiError && error.status === 403,
    );
  });
});
