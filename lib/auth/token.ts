import type { CurrentUser } from "@/types";
export function decodeUser(token: string): CurrentUser | null {
  try {
    const part = token.split(".")[1];
    const payload: unknown = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
          c.charCodeAt(0),
        ),
      ),
    );
    if (!payload || typeof payload !== "object") return null;
    const claims = payload as Record<string, unknown>;
    const read = (...keys: string[]) => {
      for (const key of keys)
        if (typeof claims[key] === "string") return claims[key] as string;
      return "";
    };
    const expiresAt = typeof claims.exp === "number" ? claims.exp * 1000 : 0;
    if (!expiresAt || expiresAt <= Date.now()) return null;
    const id = read(
      "sub",
      "nameid",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
    );
    if (!id) return null;
    return {
      id,
      name: read(
        "name",
        "unique_name",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      ),
      email: read(
        "email",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      ),
      role: read(
        "role",
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
      ),
      expiresAt,
    };
  } catch {
    return null;
  }
}
export function safeReturnPath(value: string | null) {
  if (!value?.startsWith("/")) return "/account";
  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      Array.from(decoded).some((character) => character.charCodeAt(0) <= 32) ||
      decoded.startsWith("/login") ||
      decoded.startsWith("/register")
    )
      return "/account";
    return value;
  } catch {
    return "/account";
  }
}
