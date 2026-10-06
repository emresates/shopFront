import { request } from "./client";
import type { Favorite } from "@/types";
export const favoritesApi = {
  list: () => request<Favorite[]>("/api/favorites"),
  add: (id: number) =>
    request<void>(`/api/favorites/${id}`, { method: "POST" }),
  remove: (id: number) =>
    request<void>(`/api/favorites/${id}`, { method: "DELETE" }),
};
