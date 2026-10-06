import { test } from "node:test";
import assert from "node:assert/strict";
import { request, setAccessToken, ApiError } from "../lib/api/client";
import { ordersApi } from "../lib/api/orders";
import { productsApi } from "../lib/api/products";
// Transport doubles are confined to tests. Application data always comes from ShopApi.
test("API transport contract", async (context) => {
  process.env.NEXT_PUBLIC_API_URL = "https://shopapi.example.test/";
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
    setAccessToken(null);
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  await context.test(
    "order transmits only addressId with bearer authorization",
    async () => {
      setAccessToken("test-token");
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "https://shopapi.example.test/api/orders");
        assert.equal(options?.method, "POST");
        assert.deepEqual(JSON.parse(String(options?.body)), { addressId: 3 });
        assert.equal(
          new Headers(options?.headers).get("Authorization"),
          "Bearer test-token",
        );
        return Response.json({ data: { id: 8 }, statusCode: 200 });
      };
      assert.equal((await ordersApi.create(3)).data.id, 8);
    },
  );
  await context.test(
    "multipart upload preserves browser boundary",
    async () => {
      globalThis.fetch = async (_url, options) => {
        assert.equal(new Headers(options?.headers).has("Content-Type"), false);
        assert.ok(options?.body instanceof FormData);
        assert.equal(options.body.get("IsMain"), "true");
        assert.ok(options.body.get("File") instanceof File);
        return Response.json({ data: { id: 2 }, statusCode: 200 });
      };
      await productsApi.upload(
        1,
        new File(["image"], "image.png", { type: "image/png" }),
        true,
      );
    },
  );
  await context.test(
    "pagination and backend messages survive normalization",
    async () => {
      globalThis.fetch = async () =>
        Response.json({
          data: [],
          pagination: { page: 2, totalPages: 3 },
          statusCode: 200,
        });
      assert.equal(
        (await request<unknown[]>("/api/products")).pagination?.page,
        2,
      );
      globalThis.fetch = async () =>
        Response.json(
          {
            message: "Stok yetersiz.",
            errCode: "insufficientStock",
            statusCode: 409,
          },
          { status: 409 },
        );
      await assert.rejects(
        request("/api/cart"),
        (error) =>
          error instanceof ApiError &&
          error.message === "Stok yetersiz." &&
          error.code === "insufficientStock",
      );
    },
  );
  await context.test(
    "network failures and missing URL never turn into empty product data",
    async () => {
      globalThis.fetch = async () => {
        throw new TypeError("offline");
      };
      await assert.rejects(
        request("/api/products"),
        (error) => error instanceof ApiError && error.status === 0,
      );
      delete process.env.NEXT_PUBLIC_API_URL;
      await assert.rejects(
        request("/api/products"),
        (error) => error instanceof ApiError && error.code === "configuration",
      );
    },
  );
});
