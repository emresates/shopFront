import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProduct, validateAddress } from "../lib/validation";
test("product validation rejects blank text, invalid price, fractional stock and missing category", () => {
  const value = {
    name: "Ürün",
    description: "Açıklama",
    price: 10,
    stock: 2,
    categoryId: 1,
  };
  for (const patch of [
    { name: "   " },
    { description: "" },
    { price: 0 },
    { price: NaN },
    { stock: 1.5 },
    { stock: -1 },
    { categoryId: 0 },
  ])
    assert.throws(() => validateProduct({ ...value, ...patch }));
  assert.doesNotThrow(() => validateProduct(value));
});
test("address validation rejects whitespace-only required fields", () => {
  const value = {
    title: "Ev",
    fullName: "Test",
    phone: "123",
    city: "İstanbul",
    district: "Kadıköy",
    addressLine: "Adres",
    isDefault: true,
  };
  assert.throws(() => validateAddress({ ...value, city: " " }));
  assert.doesNotThrow(() => validateAddress(value));
});
