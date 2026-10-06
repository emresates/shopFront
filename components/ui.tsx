"use client";
import {
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  PackageOpen,
  LoaderCircle,
  X,
  Minus,
  Plus,
  ImageIcon,
} from "lucide-react";
import { useAuth } from "./providers";
import { ApiError } from "@/lib/api/client";
export function Button({
  pending,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || pending}
      className={`btn ${className}`}
      aria-busy={pending}
    >
      {pending && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  description,
  href,
  cta = "Ürünleri keşfet",
}: {
  title: string;
  description?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <PackageOpen size={30} strokeWidth={1.3} />
      </div>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {href && (
        <Link className="btn" href={href}>
          {cta}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const missing = error instanceof ApiError && error.status === 404;
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={25} />
      <div>
        <h3>
          {missing ? "Aradığınız kayıt bulunamadı." : "Şu an yüklenemiyor"}
        </h3>
        <p>{error instanceof Error ? error.message : "Bir hata oluştu."}</p>
      </div>
      {retry && !missing && (
        <Button className="btn-secondary" onClick={retry}>
          Tekrar dene
        </Button>
      )}
      {missing && (
        <Link className="btn" href="/products">
          Mağazaya dön
        </Link>
      )}
    </div>
  );
}
export function Skeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="product-grid" aria-label="Yükleniyor" role="status">
      {Array.from({ length: cards }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton-image" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
export function Guard({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [auth.isLoading, auth.isAuthenticated, pathname, router]);
  if (auth.isLoading || !auth.isAuthenticated) return <Skeleton cards={3} />;
  if (admin && auth.currentUser?.role !== "Admin")
    return (
      <Empty
        title="Erişim izniniz yok."
        description="Bu alan yalnızca yöneticilere açıktır."
        href="/"
        cta="Ana sayfaya dön"
      />
    );
  return children;
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Pencereyi kapat"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Quantity({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="quantity">
      <button
        aria-label="Adedi azalt"
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={15} />
      </button>
      <input
        aria-label="Adet"
        type="number"
        min={1}
        max={max}
        value={value}
        disabled={disabled || max < 1}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isInteger(n) && n >= 1 && n <= max) onChange(n);
        }}
      />
      <button
        aria-label="Adedi artır"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function ProductPhoto({
  src,
  name,
  className = "",
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const valid =
    src &&
    (/^https?:\/\//.test(src) ||
      (src.startsWith("/") && !src.startsWith("//")));
  return (
    <div className={`product-photo ${className}`}>
      {valid ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
          unoptimized
          style={{ objectFit: "contain" }}
        />
      ) : (
        <div className="photo-placeholder">
          <ImageIcon size={38} strokeWidth={1} />
          <span>Görsel bulunmuyor</span>
        </div>
      )}
    </div>
  );
}
