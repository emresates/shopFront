"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { X, Check, AlertCircle } from "lucide-react";
import { decodeUser } from "@/lib/auth/token";
import { ApiError } from "@/lib/api/client";
import { cartApi } from "@/lib/api/cart";
import { favoritesApi } from "@/lib/api/favorites";
import type { CurrentUser } from "@/types";
import {
  subscribeSession,
  getSession,
  getServerSession,
  restoreSession,
  updateSession,
} from "@/lib/auth/store";
interface AuthState {
  accessToken: string | null;
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthState | null>(null);
const ToastContext = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export const useToast = () => useContext(ToastContext);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider eksik.");
  return context;
}
function AuthProvider({ children }: { children: ReactNode }) {
  const { accessToken, currentUser, isLoading } = useSyncExternalStore(
    subscribeSession,
    getSession,
    getServerSession,
  );
  const queryClient = useQueryClient();
  const router = useRouter();
  const clear = useCallback(() => {
    updateSession(null);
    queryClient.clear();
  }, [queryClient]);
  useEffect(() => {
    restoreSession();
    const unauthorized = () => clear();
    window.addEventListener("shop:unauthorized", unauthorized);
    return () => window.removeEventListener("shop:unauthorized", unauthorized);
  }, [clear]);
  useEffect(() => {
    if (!currentUser) return;
    const check = () => {
      if (currentUser.expiresAt <= Date.now()) clear();
    };
    const timer = setInterval(check, 15000);
    const timeout = setTimeout(
      check,
      Math.min(Math.max(0, currentUser.expiresAt - Date.now()), 2147483647),
    );
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
      window.removeEventListener("focus", check);
    };
  }, [currentUser, clear]);
  const login = (value: string) => {
    if (!decodeUser(value))
      throw new Error("Geçerli oturum bilgisi alınamadı.");
    queryClient.clear();
    updateSession(value);
  };
  return (
    <AuthContext.Provider
      value={{
        accessToken,
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout: () => {
          clear();
          router.push("/login");
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useCart() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["cart", currentUser?.id],
    queryFn: cartApi.get,
    enabled: !!currentUser,
  });
}
export function useFavorites() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["favorites", currentUser?.id],
    queryFn: favoritesApi.list,
    enabled: !!currentUser,
  });
}
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: (count, error) =>
              !(
                error instanceof ApiError &&
                (error.status === 0 || error.status < 500)
              ) && count < 1,
            refetchOnWindowFocus: true,
          },
          mutations: { retry: false },
        },
      }),
  );
  const [toasts, setToasts] = useState<
    { id: number; message: string; error: boolean }[]
  >([]);
  const toast = useCallback((message: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((old) => [...old.slice(-3), { id, message, error }]);
    setTimeout(() => setToasts((old) => old.filter((t) => t.id !== id)), 5500);
  }, []);
  return (
    <QueryClientProvider client={client}>
      <ToastContext.Provider value={toast}>
        <AuthProvider>{children}</AuthProvider>
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div className={`toast ${t.error ? "toast-error" : ""}`} key={t.id}>
              {t.error ? <AlertCircle size={19} /> : <Check size={19} />}
              <span>{t.message}</span>
              <button
                aria-label="Bildirimi kapat"
                onClick={() =>
                  setToasts((old) => old.filter((x) => x.id !== t.id))
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
