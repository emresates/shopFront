import type { OrderStatus } from "@/types";
// UX only: the API enforces these transitions and remains the source of truth.
const transitions: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Paid", "Cancelled"],
  Paid: ["Preparing", "Cancelled"],
  Preparing: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};
export const orderStatusLabels: Record<OrderStatus, string> = {
  Pending: "Bekliyor",
  Paid: "Ödendi",
  Preparing: "Hazırlanıyor",
  Shipped: "Kargoya Verildi",
  Delivered: "Teslim Edildi",
  Cancelled: "İptal Edildi",
};
export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && Object.hasOwn(transitions, value);
export const getAllowedOrderTransitions = (status: OrderStatus) =>
  isOrderStatus(status) ? [...transitions[status]] : [];
export const orderStatusLabel = (status: OrderStatus) =>
  isOrderStatus(status) ? orderStatusLabels[status] : String(status);
