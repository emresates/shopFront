import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, setAccessToken } from "../lib/api/client";
import {
  createReview,
  deleteReview,
  getProductReviews,
  getReviewSummary,
  updateReview,
} from "../lib/api/reviews";
import { isOwnReview, ratingDistribution } from "../lib/reviews";
import { validateReview } from "../lib/validation";
test("review validation mirrors CreateReviewDto", () => {
  assert.deepEqual(validateReview(5, "  Harika  "), {
    rating: 5,
    comment: "Harika",
  });
  assert.deepEqual(validateReview(1, "   "), { rating: 1, comment: null });
  for (const rating of [0, 6, 2.5, Number.NaN])
    assert.throws(() => validateReview(rating, ""), /1 ile 5/);
  assert.throws(() => validateReview(3, "a".repeat(1001)), /1000/);
  assert.doesNotThrow(() => validateReview(3, "a".repeat(1000)));
});
test("rating distribution counts each star from 5 to 1", () => {
  const reviews = [5, 5, 4, 1, 5, 3].map((rating) => ({ rating }));
  assert.deepEqual(ratingDistribution(reviews), [
    { star: 5, count: 3 },
    { star: 4, count: 1 },
    { star: 3, count: 1 },
    { star: 2, count: 0 },
    { star: 1, count: 1 },
  ]);
  assert.deepEqual(
    ratingDistribution([]).map((d) => d.count),
    [0, 0, 0, 0, 0],
  );
});
test("review ownership compares the numeric API id with the JWT id", () => {
  assert.equal(isOwnReview({ userId: 7 }, "7"), true);
  assert.equal(isOwnReview({ userId: 7 }, "8"), false);
  assert.equal(isOwnReview({ userId: 7 }, undefined), false);
});
test("review API contract", async (context) => {
  process.env.NEXT_PUBLIC_API_URL = "https://shopapi.example.test/";
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
    setAccessToken(null);
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  const calls: {
    url: string;
    method?: string;
    body?: unknown;
    auth: string | null;
  }[] = [];
  const respond = (data: unknown, status = 200) =>
    Response.json({ data, statusCode: status }, { status });
  globalThis.fetch = async (url, options) => {
    calls.push({
      url: String(url),
      method: options?.method,
      body: options?.body ? JSON.parse(String(options.body)) : undefined,
      auth: new Headers(options?.headers).get("Authorization"),
    });
    return respond({ id: 1 });
  };
  await context.test("public reads work without a token", async () => {
    setAccessToken(null);
    await getProductReviews(5);
    await getReviewSummary(5);
    assert.deepEqual(
      calls.splice(0).map((c) => [c.url, c.method, c.auth]),
      [
        ["https://shopapi.example.test/api/reviews/product/5", undefined, null],
        [
          "https://shopapi.example.test/api/reviews/product/5/summary",
          undefined,
          null,
        ],
      ],
    );
  });
  await context.test(
    "mutations send bearer auth and the DTO body",
    async () => {
      setAccessToken("customer-token");
      await createReview(5, { rating: 4, comment: null });
      await updateReview(9, { rating: 2, comment: "Fena değil" });
      await deleteReview(9);
      assert.deepEqual(calls.splice(0), [
        {
          url: "https://shopapi.example.test/api/reviews/product/5",
          method: "POST",
          body: { rating: 4, comment: null },
          auth: "Bearer customer-token",
        },
        {
          url: "https://shopapi.example.test/api/reviews/9",
          method: "PUT",
          body: { rating: 2, comment: "Fena değil" },
          auth: "Bearer customer-token",
        },
        {
          url: "https://shopapi.example.test/api/reviews/9",
          method: "DELETE",
          body: undefined,
          auth: "Bearer customer-token",
        },
      ]);
    },
  );
  for (const [status, errCode, message] of [
    [
      403,
      "productNotPurchased",
      "Bu ürünü değerlendirebilmek için önce satın almış olmalısınız.",
    ],
    [409, "reviewAlreadyExists", "Bu ürünü zaten değerlendirdiniz."],
    [404, "reviewNotFound", "Değerlendirme bulunamadı."],
  ] as const)
    await context.test(
      `${status} ${errCode} maps to friendly copy`,
      async () => {
        globalThis.fetch = async () =>
          Response.json(
            {
              data: null,
              message: "backend text",
              errCode,
              statusCode: status,
            },
            { status },
          );
        await assert.rejects(
          createReview(5, { rating: 5 }),
          (error) =>
            error instanceof ApiError &&
            error.status === status &&
            error.code === errCode &&
            error.message === message,
        );
      },
    );
  await context.test("PascalCase middleware errors are read", async () => {
    globalThis.fetch = async () =>
      Response.json(
        {
          Data: null,
          Message: "Sipariş zaten bu durumda.",
          ErrCode: "orderAlreadyInStatus",
          StatusCode: 409,
        },
        { status: 409 },
      );
    await assert.rejects(
      deleteReview(1),
      (error) =>
        error instanceof ApiError &&
        error.status === 409 &&
        error.code === "orderAlreadyInStatus" &&
        error.message === "Sipariş zaten bu durumda.",
    );
  });
  await context.test("ProblemDetails validation codes are mapped", async () => {
    globalThis.fetch = async () =>
      Response.json(
        {
          title: "One or more validation errors occurred.",
          status: 400,
          errors: { Comment: ["commentTooLong"] },
        },
        { status: 400 },
      );
    await assert.rejects(
      updateReview(9, { rating: 5, comment: "x" }),
      (error) =>
        error instanceof ApiError &&
        error.code === "commentTooLong" &&
        error.message === "Yorum en fazla 1000 karakter olabilir.",
    );
  });
});
