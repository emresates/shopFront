"use client";
let theme = false;
const listeners = new Set<() => void>();
export const subscribeTheme = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
export const getTheme = () => theme;
export const getServerTheme = () => false;
function apply(enabled: boolean) {
  theme = enabled;
  document.documentElement.classList.toggle("dark", enabled);
  listeners.forEach((callback) => callback());
}
export function restoreTheme() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem("shop-theme");
  } catch {}
  apply(
    stored === "dark" ||
      (!stored && matchMedia("(prefers-color-scheme: dark)").matches),
  );
}
export function toggleTheme() {
  const value = !theme;
  try {
    localStorage.setItem("shop-theme", value ? "dark" : "light");
  } catch {}
  apply(value);
}
