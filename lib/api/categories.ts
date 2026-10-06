import { request, json } from "./client";
import type { Category } from "@/types";
export const categoriesApi = {
  list: () => request<Category[]>("/api/categories"),
  get: (id: number) => request<Category>(`/api/categories/${id}`),
  create: (name: string) =>
    request<Category>("/api/categories", {
      method: "POST",
      body: json({ name }),
    }),
  update: (id: number, name: string) =>
    request<Category>(`/api/categories/${id}`, {
      method: "PUT",
      body: json({ name }),
    }),
  remove: (id: number) =>
    request<void>(`/api/categories/${id}`, { method: "DELETE" }),
};
