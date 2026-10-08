import { request, json } from "./client";
import type { AdminOrder, Order, OrderStatus } from "@/types";
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
  cancel: (orderId: number) =>
    request<Order>(`/api/orders/${orderId}/cancel`, { method: "PATCH" }),
  adminList: () => request<AdminOrder[]>("/api/orders/admin"),
};
export const getAdminOrders = ordersApi.adminList;
export const updateOrderStatus = ordersApi.updateStatus;
export const cancelOrder = ordersApi.cancel;
