"use client";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Plus,
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  Check,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Product, Favorite, ApiResponse } from "@/types";
import { productsApi, type ProductFilters } from "@/lib/api/products";
import { categoriesApi } from "@/lib/api/categories";
import { cartApi } from "@/lib/api/cart";
import { favoritesApi } from "@/lib/api/favorites";
import { money, errorMessage } from "@/lib/format";
import { useAuth, useFavorites, useToast } from "./providers";
import { formatRating, ProductReviews, RatingInline } from "./reviews";
import {
  Button,
  Empty,
  ErrorState,
  PageTitle,
  ProductPhoto,
  Quantity,
  Skeleton,
} from "./ui";
export function ProductActions({
  id,
  stock,
  compact = false,
  quantity = 1,
}: {
  id: number;
  stock: number;
  compact?: boolean;
  quantity?: number;
}) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const favorites = useFavorites();
  const toast = useToast();
  const client = useQueryClient();
  const favorite =
    favorites.data?.data?.some((item) => item.productId === id) ?? false;
  const add = useMutation({
    mutationFn: () => cartApi.add(id, quantity),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["cart"] });
      toast("Ürün sepete eklendi.");
    },
    onError: (error) => toast(errorMessage(error), true),
  });
  const toggle = useMutation({
    mutationFn: () =>
      favorite ? favoritesApi.remove(id) : favoritesApi.add(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["favorites"] });
      toast(
        favorite ? "Ürün favorilerden çıkarıldı." : "Ürün favorilere eklendi.",
      );
    },
    onError: (error) => toast(errorMessage(error), true),
  });
  const authorized = (action: () => void) => {
    if (!auth.isAuthenticated)
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
    else action();
  };
  return (
    <div className={compact ? "card-actions" : "product-actions"}>
      <Button
        className={compact ? "icon-btn add-button" : ""}
        disabled={stock < 1 || auth.isLoading}
        pending={add.isPending}
        aria-label="Sepete ekle"
        onClick={() => authorized(() => add.mutate())}
      >
        {!add.isPending &&
          (compact ? <Plus size={20} /> : <ShoppingBag size={18} />)}
        {!compact && (stock < 1 ? "Stokta yok" : "Sepete ekle")}
      </Button>
      <button
        className={`icon-btn favorite-button ${favorite ? "is-favorite" : ""}`}
        aria-label={favorite ? "Favorilerden çıkar" : "Favorilere ekle"}
        aria-pressed={favorite}
        disabled={
          toggle.isPending ||
          auth.isLoading ||
          (auth.isAuthenticated && favorites.isPending)
        }
        onClick={() => authorized(() => toggle.mutate())}
      >
        <Heart size={19} fill={favorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
export function ProductCard({ product }: { product: Product | Favorite }) {
  const id = "id" in product ? product.id : product.productId;
  const image =
    "images" in product
      ? (product.images?.find((i) => i.isMain) ?? product.images?.[0])?.imageUrl
      : product.mainImageUrl;
  return (
    <article className="product-card">
      <Link href={`/products/${id}`} className="product-visual">
        <ProductPhoto src={image} name={product.name} />
        {product.stock < 1 && <span className="stock-badge">Stokta yok</span>}
        <span className="view-product">
          Ürünü incele <ArrowUpRight size={16} />
        </span>
      </Link>
      <div className="product-card-body">
        <p className="product-category">{product.categoryName}</p>
        <Link href={`/products/${id}`}>
          <h3>{product.name}</h3>
        </Link>
        {/* Favorites carry no rating fields; never fetch per card. */}
        {"averageRating" in product && (
          <RatingInline
            averageRating={product.averageRating}
            reviewCount={product.reviewCount}
          />
        )}
        <p className="product-price">{money(product.price)}</p>
        <span className="stock-note">
          {product.stock > 0 ? `${product.stock} adet stokta` : "Tükendi"}
        </span>
        <ProductActions id={id} stock={product.stock} compact />
      </div>
    </article>
  );
}
export function ProductListing() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters: ProductFilters = {
    search: params.get("search") || "",
    categoryId: params.get("categoryId") || "",
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
    page: params.get("page") || "1",
    pageSize: "12",
  };
  const products = useQuery({
    queryKey: ["products", filters],
    queryFn: ({ signal }) => productsApi.list(filters, signal),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const [filterError, setFilterError] = useState("");
  const pagination = products.data?.pagination;
  const page = Math.max(1, Number(filters.page) || 1);
  const goPage = (value: number) => {
    const query = new URLSearchParams(params);
    query.set("page", String(value));
    router.push(`${pathname}?${query}`);
  };
  return (
    <>
      <PageTitle
        eyebrow="FORM KOLEKSİYONU"
        title="İyi şeylere yer aç."
        description="Tarzına ve hayatına eşlik edecek detayları keşfet."
      />
      <div className="shop-layout">
        <aside className="filters" id="categories">
          <div className="filter-title">
            <SlidersHorizontal size={17} />
            <h2>Filtrele</h2>
            <Link href={pathname}>Temizle</Link>
          </div>
          <form
            key={params.toString()}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const min = String(form.get("minPrice") || "");
              const max = String(form.get("maxPrice") || "");
              if (min && max && Number(min) > Number(max)) {
                setFilterError("Minimum fiyat maksimum fiyattan büyük olamaz.");
                return;
              }
              setFilterError("");
              const query = new URLSearchParams();
              for (const [key, value] of form)
                if (String(value).trim()) query.set(key, String(value).trim());
              router.push(`${pathname}?${query}`);
            }}
          >
            <label>
              Ürün ara
              <input
                name="search"
                defaultValue={filters.search}
                placeholder="Bir ürün keşfet…"
              />
            </label>
            <label>
              Kategori
              <select
                key={String(!!categories.data)}
                name="categoryId"
                defaultValue={filters.categoryId}
              >
                <option value="">Tüm kategoriler</option>
                {categories.data?.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.productCount})
                  </option>
                ))}
              </select>
            </label>
            {categories.isError && (
              <p className="field-error">
                Kategoriler yüklenemedi.{" "}
                <button type="button" onClick={() => void categories.refetch()}>
                  Tekrar dene
                </button>
              </p>
            )}
            <fieldset>
              <legend>Fiyat aralığı</legend>
              <div className="form-row">
                <label>
                  <span className="sr-only">Minimum fiyat</span>
                  <input
                    name="minPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={filters.minPrice}
                    placeholder="Min ₺"
                  />
                </label>
                <label>
                  <span className="sr-only">Maksimum fiyat</span>
                  <input
                    name="maxPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={filters.maxPrice}
                    placeholder="Maks ₺"
                  />
                </label>
              </div>
            </fieldset>
            {filterError && (
              <p className="field-error" role="alert">
                {filterError}
              </p>
            )}
            <Button type="submit">
              Ürünleri göster <ArrowRight size={16} />
            </Button>
          </form>
          <div className="filter-note">
            <span className="logo">
              form<span>®</span>
            </span>
            <p>
              Daha az karmaşa.
              <br />
              Daha çok sen.
            </p>
          </div>
        </aside>
        <div>
          <div className="results-heading">
            <p>
              {pagination ? (
                <>
                  <strong>{pagination.totalCount}</strong> ürün
                </>
              ) : (
                "Koleksiyon"
              )}
              {filters.search && ` · “${filters.search}”`}
            </p>
            <span>Özenle keşfet.</span>
          </div>
          {products.isPending ? (
            <Skeleton cards={6} />
          ) : products.isError ? (
            <ErrorState
              error={products.error}
              retry={() => void products.refetch()}
            />
          ) : !products.data.data?.length ? (
            <Empty
              title="Filtrelere uygun ürün bulunamadı."
              description="Farklı bir arama veya fiyat aralığı deneyin."
              href={pathname}
              cta="Filtreleri temizle"
            />
          ) : (
            <div className="product-grid listing-grid">
              {products.data.data.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          {pagination && pagination.totalPages > 1 && (
            <nav className="pagination" aria-label="Sayfalama">
              <Button
                className="btn-secondary"
                disabled={page <= 1 || products.isFetching}
                onClick={() => goPage(page - 1)}
              >
                <ChevronLeft size={17} />
                Önceki
              </Button>
              <span>
                {page} / {pagination.totalPages}
              </span>
              <Button
                className="btn-secondary"
                disabled={page >= pagination.totalPages || products.isFetching}
                onClick={() => goPage(page + 1)}
              >
                Sonraki
                <ChevronRight size={17} />
              </Button>
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
export function ProductDetail({
  id,
  initialData,
}: {
  id: number;
  initialData?: ApiResponse<Product>;
}) {
  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.get(id),
    initialData,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  if (product.isPending) return <Skeleton cards={2} />;
  if (product.isError)
    return (
      <ErrorState error={product.error} retry={() => void product.refetch()} />
    );
  const p = product.data.data;
  if (!p) return <Empty title="Ürün bulunamadı." href="/products" />;
  const main =
    p.images?.find((i) => i.id === selected) ??
    p.images?.find((i) => i.isMain) ??
    p.images?.[0];
  return (
    <>
      <div className="breadcrumbs">
        <Link href="/products">Koleksiyon</Link>
        <span>/</span>
        <Link href={`/products?categoryId=${p.categoryId}`}>
          {p.categoryName}
        </Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>
      <div className="product-detail">
        <div>
          <ProductPhoto
            src={main?.imageUrl}
            name={p.name}
            className="detail-photo"
          />
          <div className="thumbnails">
            {p.images?.map((i) => (
              <button
                key={i.id}
                className={main?.id === i.id ? "selected" : ""}
                aria-label={`${p.name} görsel ${i.id}`}
                aria-pressed={main?.id === i.id}
                onClick={() => setSelected(i.id)}
              >
                <ProductPhoto src={i.imageUrl} name={p.name} />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <p className="eyebrow">{p.categoryName}</p>
          <h1>{p.name}</h1>
          <a
            className="detail-rating"
            href="#reviews"
            aria-label={
              p.reviewCount
                ? `5 üzerinden ${formatRating(p.averageRating)} puan, ${p.reviewCount} değerlendirme. Değerlendirmelere git`
                : "Henüz değerlendirilmemiş. Değerlendirmelere git"
            }
          >
            <RatingInline
              averageRating={p.averageRating}
              reviewCount={p.reviewCount}
              size="md"
            />
          </a>
          <p className="detail-price">{money(p.price)}</p>
          <p className="description">{p.description}</p>
          <p className={`availability ${p.stock < 1 ? "unavailable" : ""}`}>
            <Check size={15} />
            {p.stock > 0 ? `Stokta · ${p.stock} adet` : "Stokta yok"}
          </p>
          <div className="buy-row">
            <Quantity
              value={Math.min(quantity, Math.max(p.stock, 1))}
              max={p.stock}
              onChange={setQuantity}
            />
            <ProductActions
              id={p.id}
              stock={p.stock}
              quantity={Math.min(quantity, Math.max(p.stock, 1))}
            />
          </div>
          <div className="detail-note">
            <span>DETAYLARDA FORM VAR.</span>
            <p>Kendin için seç. Günlük hayatına dahil et.</p>
          </div>
        </div>
      </div>
      <ProductReviews productId={p.id} />
    </>
  );
}
