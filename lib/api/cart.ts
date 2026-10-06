import { request, json } from "./client";
import type { Cart } from "@/types";
export const cartApi = {
  get: () => request<Cart>("/api/cart"),
  add: (id: number, quantity: number) =>
    request<Cart>(`/api/cart/items/${id}`, {
      method: "POST",
      body: json({ quantity }),
    }),
  update: (id: number, quantity: number) =>
    request<Cart>(`/api/cart/items/${id}`, {
      method: "PUT",
      body: json({ quantity }),
    }),
  remove: (id: number) =>
    request<void>(`/api/cart/items/${id}`, { method: "DELETE" }),
  clear: () => request<void>("/api/cart", { method: "DELETE" }),
};
