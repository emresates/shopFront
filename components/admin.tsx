"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Package,
  Shapes,
  Plus,
  Pencil,
  Trash2,
  Images,
  Upload,
  Star,
  ArrowUpRight,
  ClipboardList,
} from "lucide-react";
import type { Product, ProductInput, Category } from "@/types";
import { validateProduct, requiredText } from "@/lib/validation";
import { productsApi } from "@/lib/api/products";
import { categoriesApi } from "@/lib/api/categories";
import { errorMessage, money } from "@/lib/format";
import { useToast } from "./providers";
import {
  Button,
  Empty,
  ErrorState,
  Guard,
  Modal,
  PageTitle,
  ProductPhoto,
  Skeleton,
} from "./ui";
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <Guard admin>
      <div className="admin-layout">
        <aside className="admin-nav">
          <p className="eyebrow">YÖNETİM PANELİ</p>
          {[
            { href: "/admin", title: "Genel bakış", icon: LayoutDashboard },
            { href: "/admin/products", title: "Ürünler", icon: Package },
            { href: "/admin/categories", title: "Kategoriler", icon: Shapes },
            { href: "/admin/orders", title: "Siparişler", icon: ClipboardList },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={path === link.href ? "active" : ""}
            >
              <link.icon size={18} />
              {link.title}
            </Link>
          ))}
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </Guard>
  );
}
export function AdminOverview() {
  const products = useQuery({
    queryKey: ["products", "overview"],
    queryFn: () => productsApi.list({ page: "1", pageSize: "1" }),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  return (
    <>
      <PageTitle
        eyebrow="FORM / YÖNETİM"
        title="Mağazana genel bakış."
        description="Koleksiyonu düzenle, ürünlerini öne çıkar."
      />
      {products.isError && (
        <ErrorState
          error={products.error}
          retry={() => void products.refetch()}
        />
      )}
      {categories.isError && (
        <ErrorState
          error={categories.error}
          retry={() => void categories.refetch()}
        />
      )}
      <div className="account-links">
        <Link className="account-link" href="/admin/products">
          <Package />
          <h3>Ürünler</h3>
          <p className="stat">
            {products.isPending
              ? "…"
              : (products.data?.pagination?.totalCount ?? "—")}
          </p>
          <p className="muted">Ürünleri ve görselleri yönet</p>
          <ArrowUpRight />
        </Link>
        <Link className="account-link" href="/admin/categories">
          <Shapes />
          <h3>Kategoriler</h3>
          <p className="stat">
            {categories.isPending
              ? "…"
              : (categories.data?.data?.length ?? "—")}
          </p>
          <p className="muted">Koleksiyonun yapısını düzenle</p>
          <ArrowUpRight />
        </Link>
      </div>
    </>
  );
}
function ProductForm({
  product,
  close,
  saved,
}: {
  product?: Product;
  close: () => void;
  saved: (product: Product) => void;
}) {
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const client = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: async (value: ProductInput) => {
      validateProduct(value);
      return product
        ? productsApi.update(product.id, value)
        : productsApi.create(value);
    },
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["products"] });
      void client.invalidateQueries({ queryKey: ["product"] });
      void client.invalidateQueries({ queryKey: ["categories"] });
      toast("Ürün kaydedildi.");
      if (result.data?.id) saved(result.data);
      else close();
    },
  });
  return (
    <Modal
      title={product ? "Ürünü düzenle" : "Yeni ürün oluştur"}
      close={() => {
        if (!save.isPending) close();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (save.isPending) return;
          const data = new FormData(event.currentTarget);
          save.mutate({
            name: String(data.get("name")).trim(),
            description: String(data.get("description")).trim(),
            price: Number(data.get("price")),
            stock: Number(data.get("stock")),
            categoryId: Number(data.get("categoryId")),
          });
        }}
      >
        <label>
          Ürün adı
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={product?.name}
          />
        </label>
        <label>
          Açıklama
          <textarea
            name="description"
            rows={4}
            required
            defaultValue={product?.description}
          />
        </label>
        <div className="form-row">
          <label>
            Fiyat (₺)
            <input
              name="price"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={product?.price}
            />
          </label>
          <label>
            Stok
            <input
              name="stock"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={product?.stock ?? 0}
            />
          </label>
        </div>
        <label>
          Kategori
          <select
            name="categoryId"
            key={String(!!categories.data)}
            required
            defaultValue={product?.categoryId ?? ""}
          >
            <option value="" disabled>
              Kategori seçin
            </option>
            {categories.data?.data?.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {categories.isError && (
          <ErrorState
            error={categories.error}
            retry={() => void categories.refetch()}
          />
        )}{" "}
        {!product && (
          <p className="muted">
            Ürünü kaydettikten sonra görsellerini ekleyebilirsin.
          </p>
        )}
        {save.error && (
          <p className="field-error" role="alert">
            {save.error.message}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            className="btn-secondary"
            onClick={close}
            disabled={save.isPending}
          >
            Vazgeç
          </Button>
          <Button
            type="submit"
            pending={save.isPending}
            disabled={!categories.data?.data?.length}
          >
            Ürünü kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ImageManager({ id, close }: { id: number; close: () => void }) {
  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.get(id),
  });
  const client = useQueryClient();
  const toast = useToast();
  const [progress, setProgress] = useState("");
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["product", id] }),
      client.invalidateQueries({ queryKey: ["products"] }),
    ]);
  };
  const change = useMutation({
    mutationFn: async (
      action:
        | { type: "upload"; files: File[]; main: boolean }
        | { type: "main" | "delete"; imageId: number },
    ) => {
      if (action.type === "upload") {
        for (let index = 0; index < action.files.length; index++) {
          setProgress(`${index + 1} / ${action.files.length} yükleniyor`);
          await productsApi.upload(
            id,
            action.files[index],
            action.main && index === 0,
          );
        }
      } else if (action.type === "main")
        await productsApi.main(id, action.imageId);
      else await productsApi.removeImage(id, action.imageId);
    },
    onSuccess: () => toast("Görseller güncellendi."),
    onError: (error) => toast(errorMessage(error), true),
    onSettled: async () => {
      setProgress("");
      await refresh();
    },
  });
  return (
    <Modal
      title="Ürün görselleri"
      close={() => {
        if (!change.isPending) close();
      }}
    >
      {product.isPending ? (
        <Skeleton cards={2} />
      ) : product.isError ? (
        <ErrorState
          error={product.error}
          retry={() => void product.refetch()}
        />
      ) : (
        <>
          <p className="muted">{product.data.data.name}</p>
          <div className="image-manager">
            {product.data.data.images?.map((image) => (
              <div key={image.id}>
                <ProductPhoto
                  src={image.imageUrl}
                  name={product.data.data.name}
                />
                <div className="image-tools">
                  <Button
                    className="btn-secondary"
                    disabled={change.isPending || image.isMain}
                    onClick={() =>
                      change.mutate({ type: "main", imageId: image.id })
                    }
                  >
                    <Star
                      size={14}
                      fill={image.isMain ? "currentColor" : "none"}
                    />
                    {image.isMain ? "Ana görsel" : "Ana görsel yap"}
                  </Button>
                  <button
                    className="icon-btn danger"
                    aria-label="Görseli sil"
                    disabled={change.isPending}
                    onClick={() =>
                      change.mutate({ type: "delete", imageId: image.id })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (change.isPending) return;
              const data = new FormData(event.currentTarget);
              const files = data
                .getAll("images")
                .filter(
                  (file): file is File => file instanceof File && file.size > 0,
                );
              if (!files.length) return;
              if (
                files.some(
                  (file) =>
                    ![
                      "image/jpeg",
                      "image/png",
                      "image/webp",
                      "image/avif",
                    ].includes(file.type),
                )
              ) {
                toast("JPEG, PNG, WebP veya AVIF görsel seçin.", true);
                return;
              }
              change.mutate({
                type: "upload",
                files,
                main: data.get("main") === "on",
              });
              event.currentTarget.reset();
            }}
          >
            <label className="upload-field">
              <Upload size={24} />
              <span>Görsel ekle</span>
              <input
                name="images"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                required
                disabled={change.isPending}
              />
              <small>Dosyalar sırayla ShopApi’ye yüklenir.</small>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="main" disabled={change.isPending} />
              İlk yüklenen dosya ana görsel olsun
            </label>
            <Button type="submit" pending={change.isPending}>
              {progress || "Görselleri yükle"}
            </Button>
          </form>
        </>
      )}
    </Modal>
  );
}
export function AdminProducts() {
  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    page: "1",
    pageSize: "12",
  });
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [images, setImages] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const client = useQueryClient();
  const toast = useToast();
  const products = useQuery({
    queryKey: ["products", "admin", filters],
    queryFn: () => productsApi.list(filters),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const remove = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["products"] });
      void client.invalidateQueries({ queryKey: ["categories"] });
      void client.invalidateQueries({ queryKey: ["favorites"] });
      void client.invalidateQueries({ queryKey: ["cart"] });
      toast("Ürün silindi.");
      setDeleting(null);
    },
    onError: (error) => toast(errorMessage(error), true),
  });
  return (
    <>
      <PageTitle eyebrow="KOLEKSİYON YÖNETİMİ" title="Ürünler.">
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} />
          Ürün ekle
        </Button>
      </PageTitle>
      <form
        className="admin-filters"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setFilters((old) => ({
            ...old,
            search: String(data.get("search")),
            categoryId: String(data.get("categoryId")),
            page: "1",
          }));
        }}
      >
        <input
          aria-label="Ürün ara"
          name="search"
          placeholder="Ürün adı ara…"
        />
        <select name="categoryId" aria-label="Kategori">
          <option value="">Tüm kategoriler</option>
          {categories.data?.data?.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" className="btn-secondary">
          Filtrele
        </Button>
      </form>
      {products.isPending ? (
        <Skeleton cards={3} />
      ) : products.isError ? (
        <ErrorState
          error={products.error}
          retry={() => void products.refetch()}
        />
      ) : !products.data.data?.length ? (
        <Empty title="Ürün bulunamadı." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Kategori</th>
                <th>Fiyat</th>
                <th>Stok</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {products.data.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/products/${p.id}`}>{p.name}</Link>
                    <small>#{p.id}</small>
                  </td>
                  <td>{p.categoryName}</td>
                  <td className="nowrap">{money(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-btn"
                        aria-label={`${p.name} düzenle`}
                        onClick={() => setEditing(p)}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`${p.name} görselleri`}
                        onClick={() => setImages(p.id)}
                      >
                        <Images size={17} />
                      </button>
                      <button
                        className="icon-btn danger"
                        aria-label={`${p.name} sil`}
                        onClick={() => setDeleting(p)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {products.data?.pagination && products.data.pagination.totalPages > 1 && (
        <div className="pagination">
          <Button
            className="btn-secondary"
            disabled={Number(filters.page) <= 1}
            onClick={() =>
              setFilters((f) => ({ ...f, page: String(Number(f.page) - 1) }))
            }
          >
            Önceki
          </Button>
          <span>
            {filters.page} / {products.data.pagination.totalPages}
          </span>
          <Button
            className="btn-secondary"
            disabled={
              Number(filters.page) >= products.data.pagination.totalPages
            }
            onClick={() =>
              setFilters((f) => ({ ...f, page: String(Number(f.page) + 1) }))
            }
          >
            Sonraki
          </Button>
        </div>
      )}
      {editing && (
        <ProductForm
          product={editing === "new" ? undefined : editing}
          close={() => setEditing(null)}
          saved={(p) => {
            setEditing(null);
            setImages(p.id);
          }}
        />
      )}{" "}
      {images !== null && (
        <ImageManager id={images} close={() => setImages(null)} />
      )}{" "}
      {deleting && (
        <Modal
          title="Ürün silinsin mi?"
          close={() => {
            if (!remove.isPending) setDeleting(null);
          }}
        >
          <p>“{deleting.name}” kalıcı olarak silinecek.</p>
          <div className="form-actions">
            <Button
              className="btn-secondary"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              Vazgeç
            </Button>
            <Button
              className="btn-danger"
              pending={remove.isPending}
              onClick={() => remove.mutate(deleting.id)}
            >
              Ürünü sil
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function AdminCategories() {
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const client = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: async (name: string) => {
      requiredText(name, "Kategori adı");
      return editing && editing !== "new"
        ? categoriesApi.update(editing.id, name)
        : categoriesApi.create(name);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["categories"] });
      void client.invalidateQueries({ queryKey: ["products"] });
      toast("Kategori kaydedildi.");
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["categories"] });
      toast("Kategori silindi.");
      setDeleting(null);
    },
    onError: (error) => toast(errorMessage(error), true),
  });
  return (
    <>
      <PageTitle eyebrow="KOLEKSİYON YÖNETİMİ" title="Kategoriler.">
        <Button
          onClick={() => {
            save.reset();
            setEditing("new");
          }}
        >
          <Plus size={16} />
          Kategori ekle
        </Button>
      </PageTitle>
      {categories.isPending ? (
        <Skeleton cards={3} />
      ) : categories.isError ? (
        <ErrorState
          error={categories.error}
          retry={() => void categories.refetch()}
        />
      ) : !categories.data.data?.length ? (
        <Empty title="Henüz kategori eklenmedi." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Ürün sayısı</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {categories.data.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.name}
                    <small>#{c.id}</small>
                  </td>
                  <td>{c.productCount}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-btn"
                        aria-label={`${c.name} düzenle`}
                        onClick={() => {
                          save.reset();
                          setEditing(c);
                        }}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-btn danger"
                        aria-label={`${c.name} sil`}
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <Modal
          title={editing === "new" ? "Kategori ekle" : "Kategoriyi düzenle"}
          close={() => {
            if (!save.isPending) setEditing(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!save.isPending)
                save.mutate(
                  String(new FormData(e.currentTarget).get("name")).trim(),
                );
            }}
          >
            <label>
              Kategori adı
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={editing === "new" ? "" : editing.name}
              />
            </label>
            {save.error && (
              <p className="field-error" role="alert">
                {save.error.message}
              </p>
            )}
            <Button type="submit" pending={save.isPending}>
              Kaydet
            </Button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Kategori silinsin mi?"
          close={() => {
            if (!remove.isPending) setDeleting(null);
          }}
        >
          <p>
            “{deleting.name}” kategorisi kaldırılacak. Ürün içeren kategoriler
            silinemez.
          </p>
          <div className="form-actions">
            <Button
              className="btn-secondary"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              Vazgeç
            </Button>
            <Button
              className="btn-danger"
              pending={remove.isPending}
              onClick={() => remove.mutate(deleting.id)}
            >
              Kategoriyi sil
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
