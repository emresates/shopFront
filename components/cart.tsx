"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Trash2, ArrowLeft } from "lucide-react";
import { cartApi } from "@/lib/api/cart";
import { errorMessage, money } from "@/lib/format";
import { useCart, useToast } from "./providers";
import {
  Button,
  Empty,
  ErrorState,
  Modal,
  PageTitle,
  ProductPhoto,
  Quantity,
  Skeleton,
} from "./ui";
export function CartPage() {
  const cart = useCart();
  const client = useQueryClient();
  const toast = useToast();
  const [clearOpen, setClearOpen] = useState(false);
  const change = useMutation({
    mutationFn: async (
      action:
        | { type: "update"; id: number; quantity: number }
        | { type: "remove"; id: number }
        | { type: "clear" },
    ) => {
      if (action.type === "update")
        await cartApi.update(action.id, action.quantity);
      else if (action.type === "remove") await cartApi.remove(action.id);
      else await cartApi.clear();
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["cart"] });
      setClearOpen(false);
    },
    onError: (error) => toast(errorMessage(error), true),
  });
  const data = cart.data?.data;
  return (
    <>
      <PageTitle
        eyebrow="GÜZEL SEÇİMLER"
        title="Alışveriş sepetin."
        description={
          data
            ? `${data.totalQuantity} ürün, sana bir adım daha yakın.`
            : undefined
        }
      />
      {cart.isPending ? (
        <Skeleton cards={3} />
      ) : cart.isError ? (
        <ErrorState error={cart.error} retry={() => void cart.refetch()} />
      ) : !data?.items?.length ? (
        <Empty
          title="Sepetiniz boş."
          description="Hayatına iyi gelecek bir şeyler bulalım."
          href="/products"
        />
      ) : (
        <div className="checkout-layout">
          <div>
            <div className="cart-items">
              {data.items.map((item) => (
                <article className="cart-item" key={item.id}>
                  <Link href={`/products/${item.productId}`}>
                    <ProductPhoto
                      src={item.mainImageUrl}
                      name={item.productName}
                    />
                  </Link>
                  <div className="cart-item-info">
                    <Link href={`/products/${item.productId}`}>
                      <h3>{item.productName}</h3>
                    </Link>
                    <p className="muted">{money(item.unitPrice)} / adet</p>
                    {item.quantity > item.stock && (
                      <p className="field-error">
                        Stok değişti. Adedi güncelleyin veya ürünü kaldırın.
                      </p>
                    )}
                    <Quantity
                      value={item.quantity}
                      max={item.stock}
                      disabled={change.isPending}
                      onChange={(quantity) =>
                        change.mutate({ type: "update", id: item.id, quantity })
                      }
                    />
                  </div>
                  <div className="cart-item-end">
                    <strong>{money(item.lineTotal)}</strong>
                    <button
                      className="icon-btn"
                      aria-label={`${item.productName} ürününü sepetten çıkar`}
                      disabled={change.isPending}
                      onClick={() =>
                        change.mutate({ type: "remove", id: item.id })
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="cart-bottom">
              <Link href="/products" className="text-link">
                <ArrowLeft size={16} />
                Alışverişe devam et
              </Link>
              <button
                className="text-button"
                onClick={() => setClearOpen(true)}
                disabled={change.isPending}
              >
                Sepeti temizle
              </button>
            </div>
          </div>
          <aside className="summary">
            <p className="eyebrow">SİPARİŞ ÖZETİ</p>
            <h2>Hepsi bir arada.</h2>
            <div className="summary-row">
              <span>Ürün adedi</span>
              <span>{data.totalQuantity}</span>
            </div>
            <div className="summary-row total">
              <span>Toplam</span>
              <strong>{money(data.totalPrice)}</strong>
            </div>
            {data.items.some((item) => item.stock < item.quantity) ? (
              <p className="field-error">
                Devam etmek için stok miktarlarını kontrol edin.
              </p>
            ) : (
              <Link href="/checkout" className="btn">
                Siparişi tamamla
                <ArrowRight size={18} />
              </Link>
            )}
            <p className="summary-note">
              Son tutar sipariş oluşturulurken güncel ürün fiyatlarıyla
              hesaplanır.
            </p>
          </aside>
        </div>
      )}
      {clearOpen && (
        <Modal
          title="Sepet temizlensin mi?"
          close={() => {
            if (!change.isPending) setClearOpen(false);
          }}
        >
          <p>Sepetindeki tüm ürünler kaldırılacak.</p>
          <div className="form-actions">
            <Button
              className="btn-secondary"
              disabled={change.isPending}
              onClick={() => setClearOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              className="btn-danger"
              pending={change.isPending}
              onClick={() => change.mutate({ type: "clear" })}
            >
              Sepeti temizle
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
