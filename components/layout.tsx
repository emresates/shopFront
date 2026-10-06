"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Search,
  Heart,
  ShoppingBag,
  UserRound,
  Menu,
  X,
  Sun,
  Moon,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { useAuth, useCart } from "./providers";
import {
  subscribeTheme,
  getTheme,
  getServerTheme,
  restoreTheme,
  toggleTheme,
} from "@/lib/theme";
import { categoriesApi } from "@/lib/api/categories";
export function Header() {
  const { currentUser, logout } = useAuth();
  const cart = useCart();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const dark = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  useEffect(() => {
    restoreTheme();
  }, []);
  const toggle = toggleTheme;
  return (
    <>
      <div className="announcement">
        <span>İyi tasarım, günlük hayatın bir parçası.</span>
        <Link href="/products">
          Koleksiyonu keşfet <ArrowUpRight size={12} />
        </Link>
      </div>
      <header className="header">
        <div className="header-main container">
          <Link href="/" className="logo" aria-label="form ana sayfa">
            form<span>®</span>
          </Link>
          <nav className="desktop-nav" aria-label="Ana menü">
            <Link
              className={pathname === "/products" ? "active" : ""}
              href="/products"
            >
              Tüm ürünler
            </Link>
            <Link href="/products#categories">Kategoriler</Link>
            {currentUser?.role === "Admin" && (
              <Link href="/admin">Yönetim</Link>
            )}
          </nav>
          <form action="/products" className="header-search">
            <Search size={17} />
            <input
              name="search"
              aria-label="Ürün ara"
              placeholder="Aradığınız bir şey var mı?"
            />
            <button
              type="submit"
              className="search-submit"
              aria-label="Aramayı gönder"
            >
              ARA
            </button>
          </form>
          <div className="header-actions">
            <button
              onClick={toggle}
              className="icon-btn theme-button"
              aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link href="/favorites" className="icon-btn" aria-label="Favoriler">
              <Heart size={21} />
            </Link>
            <Link
              href="/cart"
              className="icon-btn cart-icon"
              aria-label={`Sepet, ${cart.data?.data?.totalQuantity ?? 0} ürün`}
            >
              <ShoppingBag size={21} />
              {!!cart.data?.data?.totalQuantity && (
                <span className="cart-badge">
                  {cart.data.data.totalQuantity}
                </span>
              )}
            </Link>
            <Link
              href={currentUser ? "/account" : "/login"}
              className="icon-btn account-icon"
              aria-label={currentUser ? "Hesabım" : "Giriş yap"}
            >
              <UserRound size={21} />
            </Link>
            {currentUser && (
              <button
                onClick={logout}
                className="icon-btn logout-button"
                aria-label="Çıkış yap"
                title="Çıkış yap"
              >
                <LogOut size={20} />
              </button>
            )}
            <button
              className="icon-btn mobile-menu"
              aria-expanded={menu}
              aria-label="Menüyü aç"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav
            className="mobile-panel"
            aria-label="Mobil menü"
            onClick={() => setMenu(false)}
          >
            <Link href="/products">Tüm ürünler</Link>
            <Link href="/account">Hesabım</Link>
            <Link href="/orders">Siparişlerim</Link>
            {currentUser?.role === "Admin" && (
              <Link href="/admin">Yönetim</Link>
            )}
            {currentUser && (
              <button type="button" className="text-button" onClick={logout}>
                Çıkış yap
              </button>
            )}
          </nav>
        )}
        <div className="category-bar container">
          <Link href="/products" className="category-all">
            Keşfet <ArrowRight size={13} />
          </Link>
          {categories.data?.data?.map((category) => (
            <Link
              key={category.id}
              href={`/products?categoryId=${category.id}`}
            >
              {category.name}
            </Link>
          ))}
          <span className="category-tag">Az. Öz. Senin.</span>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div>
          <Link className="logo" href="/">
            form<span>®</span>
          </Link>
          <p>
            Hayatına iyi gelen detaylar.
            <br />
            Kendi alanını, kendi tarzınla oluştur.
          </p>
        </div>
        <div>
          <p className="eyebrow">KEŞFET</p>
          <Link href="/products">Tüm ürünler</Link>
          <Link href="/favorites">Favorilerim</Link>
        </div>
        <div>
          <p className="eyebrow">HESABIM</p>
          <Link href="/orders">Siparişlerim</Link>
          <Link href="/account/addresses">Adreslerim</Link>
        </div>
        <Link href="/products" className="footer-cta">
          Sıradaki favorini bul.
          <ArrowUpRight size={28} />
        </Link>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} form. Tüm hakları saklıdır.</span>
        <span>Özenle seç. Uzun süre sev.</span>
      </div>
    </footer>
  );
}
