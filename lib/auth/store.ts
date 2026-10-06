"use client";
import { decodeUser } from "./token";
import { setAccessToken } from "@/lib/api/client";
import type { CurrentUser } from "@/types";
type Session = {
  accessToken: string | null;
  currentUser: CurrentUser | null;
  isLoading: boolean;
};
const initial: Session = {
  accessToken: null,
  currentUser: null,
  isLoading: true,
};
let session = initial;
const listeners = new Set<() => void>();
export const subscribeSession = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
export const getSession = () => session;
export const getServerSession = () => initial;
export function updateSession(accessToken: string | null) {
  const currentUser = accessToken ? decodeUser(accessToken) : null;
  const validToken = currentUser ? accessToken : null;
  try {
    if (validToken) sessionStorage.setItem("shop-token", validToken);
    else sessionStorage.removeItem("shop-token");
  } catch {
    /* Restricted storage: keep the current session in memory. */
  }
  setAccessToken(validToken);
  session = { accessToken: validToken, currentUser, isLoading: false };
  listeners.forEach((callback) => callback());
}
export function restoreSession() {
  if (!session.isLoading) return;
  let value: string | null = null;
  try {
    value = sessionStorage.getItem("shop-token");
  } catch {
    /* Storage may be unavailable. */
  }
  updateSession(value);
}
