import { request, json } from "./client";
import type { Product, ProductInput, ProductImage } from "@/types";
export type ProductFilters = {
  search?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
  pageSize?: string;
};
export const productsApi = {
  list: (filters: ProductFilters = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return request<Product[]>(`/api/products?${query}`, { signal });
  },
  get: (id: number) => request<Product>(`/api/products/${id}`),
  create: (value: ProductInput) =>
    request<Product>("/api/products", { method: "POST", body: json(value) }),
  update: (id: number, value: ProductInput) =>
    request<Product>(`/api/products/${id}`, {
      method: "PUT",
      body: json(value),
    }),
  remove: (id: number) =>
    request<void>(`/api/products/${id}`, { method: "DELETE" }),
  upload: (id: number, file: File, isMain: boolean) => {
    const body = new FormData();
    body.append("File", file);
    body.append("IsMain", String(isMain));
    return request<ProductImage>(`/api/products/${id}/images`, {
      method: "POST",
      body,
    });
  },
  main: (id: number, imageId: number) =>
    request<void>(`/api/products/${id}/images/${imageId}/main`, {
      method: "PATCH",
    }),
  removeImage: (id: number, imageId: number) =>
    request<void>(`/api/products/${id}/images/${imageId}`, {
      method: "DELETE",
    }),
};
