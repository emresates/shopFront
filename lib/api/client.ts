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
    body = parsed as Partial<ApiResponse<T>>;
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
    const message =
      body.errCode === "categoryHasProducts"
        ? "İçerisinde ürün bulunan kategori silinemez."
        : body.message ||
          (status === 403
            ? "Bu işlem için yetkiniz bulunmuyor."
            : status === 401
              ? "Oturumunuz sona erdi. Tekrar giriş yapın."
              : "İşlem tamamlanamadı.");
    throw new ApiError(message, status, body.errCode);
  }
  return { ...body, data: body.data as T, statusCode: status };
}
export const json = (value: unknown) => JSON.stringify(value);
