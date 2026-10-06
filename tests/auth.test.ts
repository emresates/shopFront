import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeUser, safeReturnPath } from "../lib/auth/token";
const jwt = (payload: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
test("JWT extracts UTF-8 identity and Microsoft role claims", () => {
  const user = decodeUser(
    jwt({
      sub: "42",
      name: "Çağrı Şen",
      email: "cagri@example.com",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin",
      exp: Date.now() / 1000 + 3600,
    }),
  );
  assert.equal(user?.name, "Çağrı Şen");
  assert.equal(user?.role, "Admin");
  assert.equal(user?.id, "42");
});
test("expired, malformed and unidentified sessions are rejected", () => {
  assert.equal(decodeUser("invalid"), null);
  assert.equal(decodeUser(jwt({ sub: "1", exp: 1 })), null);
  assert.equal(decodeUser(jwt({ exp: Date.now() / 1000 + 3600 })), null);
});
test("return URL cannot redirect to an external origin or auth loop", () => {
  for (const input of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/login?next=/login",
    null,
  ])
    assert.equal(safeReturnPath(input), "/account");
  assert.equal(safeReturnPath("/checkout"), "/checkout");
});
