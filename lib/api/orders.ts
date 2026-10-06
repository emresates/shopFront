import { request, json } from "./client";
import type { Order, OrderStatus } from "@/types";
export const ordersApi = {
  list: () => request<Order[]>("/api/orders"),
  get: (id: number) => request<Order>(`/api/orders/${id}`),
  create: (addressId: number) =>
    request<Order>("/api/orders", {
      method: "POST",
      body: json({ addressId }),
    }),
  updateStatus: (orderId: number, status: OrderStatus) =>
    request<Order>(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: json({ status }),
    }),
};
export const updateOrderStatus = ordersApi.updateStatus;
