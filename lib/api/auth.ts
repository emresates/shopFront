import { request, json } from "./client";
export const authApi = {
  login: (email: string, password: string) =>
    request<{ accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: json({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<{ accessToken: string }>("/api/auth/register", {
      method: "POST",
      body: json({ name, email, password }),
    }),
};
