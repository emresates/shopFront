"use client";
import Link from "next/link";
import {
  Heart,
  MapPin,
  Package,
  LogOut,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth, useFavorites } from "./providers";
import { Button, Empty, ErrorState, PageTitle, Skeleton } from "./ui";
import { ProductCard } from "./products";
export function Account() {
  const { currentUser: user, logout } = useAuth();
  return (
    <>
      <PageTitle
        eyebrow="SANA ÖZEL"
        title={`Merhaba, ${user?.name || "hoş geldin"}.`}
        description="Favorilerin, siparişlerin ve tüm detayların bir arada."
      >
        <Button className="btn-secondary" onClick={logout}>
          <LogOut size={16} />
          Çıkış yap
        </Button>
      </PageTitle>
      <div className="account-profile">
        <div className="avatar">
          {user?.name?.slice(0, 1).toLocaleUpperCase("tr-TR") || "F"}
        </div>
        <div>
          <h2>{user?.name}</h2>
          <p className="muted">{user?.email}</p>
        </div>
        <span className="badge">
          {user?.role === "Admin" ? "Yönetici" : "Müşteri"}
        </span>
      </div>
      <div className="account-links">
        {[
          {
            href: "/orders",
            icon: Package,
            title: "Siparişlerim",
            text: "Siparişlerini ve detaylarını görüntüle.",
          },
          {
            href: "/favorites",
            icon: Heart,
            title: "Favorilerim",
            text: "Sevdiğin ürünlere yeniden göz at.",
          },
          {
            href: "/account/addresses",
            icon: MapPin,
            title: "Adreslerim",
            text: "Teslimat adreslerini düzenle.",
          },
          ...(user?.role === "Admin"
            ? [
                {
                  href: "/admin",
                  icon: ShieldCheck,
                  title: "Yönetim paneli",
                  text: "Ürünleri ve kategorileri yönet.",
                },
              ]
            : []),
        ].map((item) => (
          <Link className="account-link" key={item.href} href={item.href}>
            <item.icon size={25} strokeWidth={1.4} />
            <h3>{item.title}</h3>
            <p className="muted">{item.text}</p>
            <ArrowUpRight size={22} />
          </Link>
        ))}
      </div>
    </>
  );
}
export function Favorites() {
  const favorites = useFavorites();
  return (
    <>
      <PageTitle
        eyebrow="SENİN SEÇKİN"
        title="Biraz daha sevdiklerin."
        description="Gözüne takılanlar, aklında kalanlar. Hepsi burada."
      />
      {favorites.isPending ? (
        <Skeleton />
      ) : favorites.isError ? (
        <ErrorState
          error={favorites.error}
          retry={() => void favorites.refetch()}
        />
      ) : favorites.data?.data?.length ? (
        <div className="product-grid">
          {favorites.data.data.map((p) => (
            <ProductCard key={p.productId} product={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="Henüz favori ürününüz yok."
          description="Sevdiğin ürünlerdeki kalbe dokun, burada bir araya gelsinler."
          href="/products"
        />
      )}
    </>
  );
}
