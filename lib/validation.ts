import type { AddressInput, ProductInput, ReviewRequest } from "@/types";
export function requiredText(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} alanını doldurun.`);
}
export function validateProduct(value: ProductInput) {
  requiredText(value.name, "Ürün adı");
  requiredText(value.description, "Açıklama");
  if (!Number.isFinite(value.price) || value.price <= 0)
    throw new Error("Fiyat sıfırdan büyük olmalıdır.");
  if (!Number.isInteger(value.stock) || value.stock < 0)
    throw new Error("Stok sıfır veya pozitif bir tam sayı olmalıdır.");
  if (!Number.isInteger(value.categoryId) || value.categoryId < 1)
    throw new Error("Bir kategori seçin.");
}
export function validateAddress(value: AddressInput) {
  const fields: [keyof AddressInput, string][] = [
    ["title", "Adres başlığı"],
    ["fullName", "Ad soyad"],
    ["phone", "Telefon"],
    ["city", "İl"],
    ["district", "İlçe"],
    ["addressLine", "Açık adres"],
  ];
  for (const [key, label] of fields)
    requiredText(String(value[key] ?? ""), label);
}
export const REVIEW_COMMENT_MAX = 1000;
// Mirrors CreateReviewDto; returns the payload ShopApi expects.
export function validateReview(rating: number, comment: string): ReviewRequest {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error("1 ile 5 arasında yıldız seçmelisiniz.");
  const text = comment.trim();
  if (text.length > REVIEW_COMMENT_MAX)
    throw new Error("Yorum en fazla 1000 karakter olabilir.");
  return { rating, comment: text || null };
}
