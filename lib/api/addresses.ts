import { request, json } from "./client";
import type { Address, AddressInput } from "@/types";
export const addressesApi = {
  list: () => request<Address[]>("/api/addresses"),
  create: (value: AddressInput) =>
    request<Address>("/api/addresses", { method: "POST", body: json(value) }),
  update: (id: number, value: AddressInput) =>
    request<Address>(`/api/addresses/${id}`, {
      method: "PUT",
      body: json(value),
    }),
  remove: (id: number) =>
    request<void>(`/api/addresses/${id}`, { method: "DELETE" }),
};
