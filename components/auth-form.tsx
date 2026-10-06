"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { requiredText } from "@/lib/validation";
import { authApi } from "@/lib/api/auth";
import { safeReturnPath } from "@/lib/auth/token";
import { useAuth, useToast } from "./providers";
import { Button } from "./ui";
export function AuthForm({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeReturnPath(params.get("next"));
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");
      const name = String(form.get("name") || "").trim();
      if (register) requiredText(name, "Ad soyad");
      return register
        ? authApi.register(name, email, password)
        : authApi.login(email, password);
    },
    onSuccess: (result) => {
      auth.login(result.data.accessToken);
      toast(register ? "Hesabınız oluşturuldu." : "Giriş başarılı.");
      router.replace(next);
    },
  });
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <span className="eyebrow">SENİN ALANIN. SENİN FORMUN.</span>
        <h1>
          Güzel şeyler,
          <br />
          burada başlar.
        </h1>
        <p>
          Favorilerini bir arada tut.
          <br />
          Kendine ait bir koleksiyon oluştur.
        </p>
        <div className="abstract-mark" aria-hidden="true">
          f.
        </div>
      </div>
      <div className="auth-panel">
        <p className="eyebrow">FORM’A HOŞ GELDİN</p>
        <h2>{register ? "Aramıza katıl." : "Yeniden merhaba."}</h2>
        <p className="muted">
          {register
            ? "Kendi dünyanı keşfetmek için hesabını oluştur."
            : "Kaldığın yerden devam etmek için giriş yap."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!mutation.isPending)
              mutation.mutate(new FormData(e.currentTarget));
          }}
        >
          {register && (
            <label>
              Ad soyad
              <input
                name="name"
                required
                minLength={2}
                maxLength={150}
                autoComplete="name"
                placeholder="Adınız ve soyadınız"
              />
            </label>
          )}
          <label>
            E-posta
            <input
              name="email"
              required
              type="email"
              autoComplete="email"
              placeholder="ornek@email.com"
            />
          </label>
          <label>
            Şifre
            <input
              name="password"
              required
              minLength={register ? 6 : 1}
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              placeholder={register ? "En az 6 karakter" : "Şifreniz"}
            />
          </label>
          {mutation.error && (
            <p className="field-error" role="alert">
              {mutation.error.message}
            </p>
          )}
          <Button type="submit" pending={mutation.isPending}>
            {register ? "Hesap oluştur" : "Giriş yap"}
            <ArrowRight size={17} />
          </Button>
        </form>
        <p className="auth-switch">
          {register ? "Zaten hesabın var mı?" : "Henüz hesabın yok mu?"}{" "}
          <Link
            href={`${register ? "/login" : "/register"}?next=${encodeURIComponent(next)}`}
          >
            {register ? "Giriş yap" : "Hesap oluştur"}
          </Link>
        </p>
      </div>
    </div>
  );
}
