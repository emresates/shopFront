import type { ApiResponse } from "@/types";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
// Friendly copy for ShopApi errCodes; anything else falls back to the API message.
const errorMessages: Record<string, string> = {
  categoryHasProducts: "İçerisinde ürün bulunan kategori silinemez.",
  productNotPurchased:
    "Bu ürünü değerlendirebilmek için önce satın almış olmalısınız.",
  reviewAlreadyExists: "Bu ürünü zaten değerlendirdiniz.",
  reviewNotFound: "Değerlendirme bulunamadı.",
  productNotFound: "Ürün bulunamadı.",
  ratingInvalid: "1 ile 5 arasında yıldız seçmelisiniz.",
  commentTooLong: "Yorum en fazla 1000 karakter olabilir.",
};
// ASP.NET model validation replies with ProblemDetails, carrying the DTO's
// ErrorMessage (e.g. "ratingInvalid") under `errors` instead of `errCode`.
function validationCode(body: object) {
  const errors = "errors" in body ? body.errors : null;
  if (!errors || typeof errors !== "object") return null;
  for (const value of Object.values(errors))
    for (const item of Array.isArray(value) ? value : [])
      if (typeof item === "string" && Object.hasOwn(errorMessages, item))
        return item;
  return null;
}
let token: string | null = null;
export function setAccessToken(value: string | null) {
  token = value;
}
export function apiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!value)
    throw new ApiError(
      "Mağaza bağlantısı henüz yapılandırılmadı. Lütfen daha sonra tekrar deneyin.",
      0,
      "configuration",
    );
  return value.replace(/\/$/, "");
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  const requestToken = token;
  if (requestToken) headers.set("Authorization", `Bearer ${requestToken}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Sunucuya bağlanılamadı. Bağlantınızı kontrol edip tekrar deneyin.",
      0,
    );
  }
  if (response.status === 204) return { data: undefined as T, statusCode: 204 };
  let body: Partial<ApiResponse<T>>;
  try {
    const parsed: unknown = await response.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Invalid API envelope");
    // ShopApi's exception middleware serializes the envelope in PascalCase
    // ("Message", "ErrCode"); controllers use camelCase. Accept both.
    body = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [
        key.charAt(0).toLowerCase() + key.slice(1),
        value,
      ]),
    ) as Partial<ApiResponse<T>>;
  } catch {
    if (
      response.status === 401 &&
      requestToken &&
      requestToken === token &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("shop:unauthorized"));
    throw new ApiError(
      response.status === 403
        ? "Bu işlem için yetkiniz bulunmuyor."
        : response.status === 401
          ? "Oturumunuz sona erdi. Tekrar giriş yapın."
          : "Sunucudan geçerli bir yanıt alınamadı.",
      response.status,
    );
  }
  const status = !response.ok
    ? response.status
    : body.statusCode || response.status;
  if (!response.ok || status >= 400) {
    if (
      status === 401 &&
      requestToken &&
      requestToken === token &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("shop:unauthorized"));
    const code = body.errCode || validationCode(body);
    const message =
      (code && Object.hasOwn(errorMessages, code) && errorMessages[code]) ||
      body.message ||
      (status === 403
        ? "Bu işlem için yetkiniz bulunmuyor."
        : status === 401
          ? "Oturumunuz sona erdi. Tekrar giriş yapın."
          : "İşlem tamamlanamadı.");
    throw new ApiError(message, status, code);
  }
  return { ...body, data: body.data as T, statusCode: status };
}
export const json = (value: unknown) => JSON.stringify(value);
