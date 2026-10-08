"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ArrowRight,
  CheckCircle2,
  MapPin,
  History,
  Package,
  XCircle,
} from "lucide-react";
import { ordersApi } from "@/lib/api/orders";
import { date, dateTime, errorMessage, money } from "@/lib/format";
import {
  canCancelOrder,
  getAllowedOrderTransitions,
  isOrderStatus,
  orderStatusLabel,
} from "@/lib/order-status";
import type { ApiResponse, Order, OrderStatus } from "@/types";
import { useAuth, useCart, useToast } from "./providers";
import { AddressForm, useAddresses } from "./addresses";
import {
  Button,
  Empty,
  ErrorState,
  Modal,
  PageTitle,
  ProductPhoto,
  Skeleton,
} from "./ui";
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`badge order-status ${isOrderStatus(status) ? `status-${status.toLowerCase()}` : ""}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
function TimelineSkeleton() {
  return (
    <div className="timeline" aria-label="Yükleniyor" role="status">
      {Array.from({ length: 2 }, (_, i) => (
        <div className="timeline-item" key={i}>
          <span className="timeline-dot skeleton" />
          <div className="timeline-body">
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  );
}
export function OrderStatusTimeline({
  orderId,
  currentStatus,
}: {
  orderId: number;
  currentStatus: OrderStatus;
}) {
  const { currentUser } = useAuth();
  // Nested under ["order"] so every order mutation's invalidation refreshes it.
  const history = useQuery({
    queryKey: ["order", currentUser?.id, orderId, "history"],
    queryFn: () => ordersApi.history(orderId),
  });
  // Newest first, so the current status leads the timeline.
  const entries = [...(history.data?.data ?? [])].reverse();
  return (
    <section className="order-history" aria-labelledby={`history-${orderId}`}>
      <h2 id={`history-${orderId}`}>
        <History size={20} />
        Sipariş Geçmişi
      </h2>
      {history.isPending ? (
        <TimelineSkeleton />
      ) : history.isError ? (
        <ErrorState
          error={history.error}
          retry={() => void history.refetch()}
        />
      ) : !entries.length ? (
        <p className="timeline-empty muted">
          Bu sipariş için kayıtlı bir durum değişikliği bulunmuyor.
        </p>
      ) : (
        <ol className="timeline">
          {entries.map((entry, index) => {
            const current = index === 0 && entry.newStatus === currentStatus;
            return (
              <li
                key={entry.id}
                className={`timeline-item ${current ? "current" : ""}`}
              >
                <span
                  className={`timeline-dot ${isOrderStatus(entry.newStatus) ? `status-${entry.newStatus.toLowerCase()}` : ""}`}
                  aria-hidden="true"
                />
                <div className="timeline-body">
                  <div className="timeline-head">
                    <OrderStatusBadge status={entry.newStatus} />
                    {current && <span className="timeline-now">Güncel</span>}
                  </div>
                  <p className="timeline-title">
                    {entry.oldStatus === null
                      ? "Sipariş oluşturuldu"
                      : `${orderStatusLabel(entry.oldStatus)} → ${orderStatusLabel(entry.newStatus)}`}
                  </p>
                  <p className="timeline-meta muted">
                    <time dateTime={entry.changedAt}>
                      {dateTime(entry.changedAt)}
                    </time>
                    {" · "}
                    {entry.changedByName ||
                      (entry.changedByUserId !== null
                        ? `Kullanıcı #${entry.changedByUserId}`
                        : "Kullanıcı bilgisi yok")}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: number;
  status: OrderStatus;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const allowed = getAllowedOrderTransitions(status);
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const update = useMutation({
    mutationFn: (next: OrderStatus) => ordersApi.updateStatus(orderId, next),
    onSuccess: (result, next) => {
      setConfirming(null);
      toast(result.message || "Sipariş durumu güncellendi.");
      if (next === "Cancelled") {
        // The API restores stock on cancellation.
        void client.invalidateQueries({ queryKey: ["products"] });
        void client.invalidateQueries({ queryKey: ["product"] });
      }
    },
    onError: (error) => {
      setConfirming(null);
      toast(errorMessage(error), true);
    },
    // Refetch either way: a 409 means our copy of the status is stale.
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["orders"] }),
        client.invalidateQueries({ queryKey: ["order"] }),
      ]),
  });
  if (!allowed.length)
    return <span className="muted status-final">Değiştirilemez</span>;
  return (
    <>
      <select
        className="status-select"
        aria-label={`Sipariş #${orderId} durumunu güncelle`}
        value=""
        disabled={update.isPending}
        onChange={(event) => {
          const next = event.target.value;
          if (isOrderStatus(next) && allowed.includes(next))
            setConfirming(next);
        }}
      >
        <option value="" disabled>
          {update.isPending ? "Güncelleniyor…" : "Durumu güncelle…"}
        </option>
        {allowed.map((next) => (
          <option key={next} value={next}>
            {orderStatusLabel(next)}
          </option>
        ))}
      </select>
      {confirming && (
        <Modal
          title="Durum güncellensin mi?"
          close={() => {
            if (!update.isPending) setConfirming(null);
          }}
        >
          <p>
            Sipariş #{orderId}, “{orderStatusLabel(status)}” durumundan “
            {orderStatusLabel(confirming)}” durumuna geçirilecek.
            {confirming === "Cancelled" &&
              " İptal edilen sipariş tekrar aktif edilemez ve stoklar geri yüklenir."}
          </p>
          <div className="form-actions">
            <Button
              className="btn-secondary"
              disabled={update.isPending}
              onClick={() => setConfirming(null)}
            >
              Vazgeç
            </Button>
            <Button
              className={confirming === "Cancelled" ? "btn-danger" : ""}
              pending={update.isPending}
              onClick={() => {
                if (!update.isPending) update.mutate(confirming);
              }}
            >
              {confirming === "Cancelled" ? "Siparişi iptal et" : "Onayla"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function CancelOrderDialog({
  order,
}: {
  order: Pick<Order, "id" | "status">;
}) {
  const { currentUser } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(order.id),
    onSuccess: (result) => {
      setOpen(false);
      client.setQueryData<ApiResponse<Order>>(
        ["order", currentUser?.id, order.id],
        (old) =>
          result.data
            ? result
            : old && { ...old, data: { ...old.data, status: "Cancelled" } },
      );
      client.setQueryData<ApiResponse<Order[]>>(
        ["orders", currentUser?.id],
        (old) =>
          old && {
            ...old,
            data: old.data?.map((o) =>
              o.id === order.id ? { ...o, status: "Cancelled" } : o,
            ),
          },
      );
      toast(result.message || "Sipariş iptal edildi.");
      // The API restores stock on cancellation.
      void client.invalidateQueries({ queryKey: ["products"] });
      void client.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (error) => {
      setOpen(false);
      toast(errorMessage(error), true);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["orders"] });
      void client.invalidateQueries({ queryKey: ["order"] });
    },
  });
  if (!canCancelOrder(order.status)) return null;
  return (
    <>
      <Button
        className="btn-secondary btn-cancel-order"
        pending={cancel.isPending}
        onClick={() => setOpen(true)}
      >
        <XCircle size={16} />
        Siparişi İptal Et
      </Button>
      {open && (
        <Modal
          title="Sipariş iptal edilsin mi?"
          close={() => {
            if (!cancel.isPending) setOpen(false);
          }}
        >
          <p>
            Bu siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri
            alınamaz.
          </p>
          <div className="form-actions">
            <Button
              className="btn-secondary"
              disabled={cancel.isPending}
              onClick={() => setOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              className="btn-danger"
              pending={cancel.isPending}
              onClick={() => {
                if (!cancel.isPending) cancel.mutate();
              }}
            >
              Siparişi iptal et
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Checkout() {
  const cart = useCart();
  const addresses = useAddresses();
  const client = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const [chosen, setChosen] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const selected =
    addresses.data?.data?.find((a) => a.id === chosen)?.id ??
    addresses.data?.data?.find((a) => a.isDefault)?.id ??
    addresses.data?.data?.[0]?.id;
  const order = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Bir teslimat adresi seçin.");
      return ordersApi.create(selected);
    },
    onSuccess: (result) => {
      client.removeQueries({ queryKey: ["cart"] });
      void client.invalidateQueries({ queryKey: ["cart"] });
      void client.invalidateQueries({ queryKey: ["orders"] });
      toast("Sipariş oluşturuldu.");
      router.replace(
        result.data?.id
          ? `/orders/${result.data.id}?success=1`
          : "/orders?success=1",
      );
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ["cart"] });
    },
  });
  if (order.isSuccess)
    return (
      <Empty
        title="Siparişiniz oluşturuldu."
        description="Sipariş detaylarına yönlendiriliyorsunuz."
        href="/orders"
        cta="Siparişlerime git"
      />
    );
  return (
    <>
      <PageTitle
        eyebrow="SON BİR ADIM"
        title="Sana doğru yola çıksın."
        description="Teslimat adresini seç ve siparişini onayla."
      />
      {cart.isPending || addresses.isPending ? (
        <Skeleton cards={3} />
      ) : cart.isError ? (
        <ErrorState error={cart.error} retry={() => void cart.refetch()} />
      ) : addresses.isError ? (
        <ErrorState
          error={addresses.error}
          retry={() => void addresses.refetch()}
        />
      ) : !cart.data?.data?.items.length ? (
        <Empty title="Sepetiniz boş." href="/products" />
      ) : (
        <div className="checkout-layout">
          <div>
            <div className="section-heading compact">
              <h2>01 / Teslimat adresi</h2>
              <Button className="btn-secondary" onClick={() => setAdding(true)}>
                <Plus size={16} />
                Yeni adres
              </Button>
            </div>
            {!addresses.data?.data?.length ? (
              <Empty
                title="Henüz kayıtlı adresiniz yok."
                description="Sipariş vermek için bir teslimat adresi ekleyin."
              />
            ) : (
              <fieldset className="address-grid">
                <legend className="sr-only">Teslimat adresi</legend>
                {addresses.data.data.map((a) => (
                  <label
                    className={`address-card selectable ${selected === a.id ? "selected" : ""}`}
                    key={a.id}
                  >
                    <div className="card-heading">
                      <input
                        type="radio"
                        name="address"
                        value={a.id}
                        checked={selected === a.id}
                        onChange={() => setChosen(a.id)}
                        disabled={order.isPending}
                      />
                      <h3>{a.title}</h3>
                      {a.isDefault && <span className="badge">Varsayılan</span>}
                    </div>
                    <strong>{a.fullName}</strong>
                    <p>{a.addressLine}</p>
                    <p>
                      {a.district} / {a.city}
                    </p>
                    <p className="muted">{a.phone}</p>
                  </label>
                ))}
              </fieldset>
            )}
            <h2 className="checkout-products-title">02 / Ürünlerin</h2>
            {cart.data.data.items.map((item) => (
              <div className="checkout-item" key={item.id}>
                <ProductPhoto src={item.mainImageUrl} name={item.productName} />
                <div>
                  <h3>{item.productName}</h3>
                  <p className="muted">
                    {item.quantity} adet × {money(item.unitPrice)}
                  </p>
                </div>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <aside className="summary">
            <p className="eyebrow">SİPARİŞ ÖZETİ</p>
            <h2>Hazırsan, tamam.</h2>
            <div className="summary-row">
              <span>Ürün adedi</span>
              <span>{cart.data.data.totalQuantity}</span>
            </div>
            <div className="summary-row total">
              <span>Toplam</span>
              <strong>{money(cart.data.data.totalPrice)}</strong>
            </div>
            <p className="summary-note">
              Sipariş tutarı güncel stok ve fiyatlarla sunucuda hesaplanır. Bu
              işlem online ödeme içermez.
            </p>
            {order.error && (
              <p className="field-error" role="alert">
                {order.error.message} Siparişlerim sayfasını kontrol ederek
                tekrar deneyin.
              </p>
            )}
            <Button
              pending={order.isPending}
              disabled={
                !selected ||
                cart.data.data.items.some((i) => i.quantity > i.stock)
              }
              onClick={() => {
                if (!order.isPending) order.mutate();
              }}
            >
              Siparişi onayla
              <ArrowRight size={17} />
            </Button>
            <Link className="text-link" href="/cart">
              Sepete dön
            </Link>
          </aside>
        </div>
      )}
      {adding && (
        <AddressForm close={() => setAdding(false)} saved={setChosen} />
      )}
    </>
  );
}
export function Orders({ success = false }: { success?: boolean }) {
  const { currentUser } = useAuth();
  const orders = useQuery({
    queryKey: ["orders", currentUser?.id],
    queryFn: ordersApi.list,
  });
  return (
    <>
      <PageTitle
        eyebrow="HESABIM"
        title="Siparişlerim."
        description="Seçtiklerin ve yolculukları."
      />
      {success && (
        <div className="success-banner">
          <CheckCircle2 />
          Siparişiniz başarıyla oluşturuldu.
        </div>
      )}
      {orders.isPending ? (
        <Skeleton cards={3} />
      ) : orders.isError ? (
        <ErrorState error={orders.error} retry={() => void orders.refetch()} />
      ) : !orders.data.data?.length ? (
        <Empty title="Henüz siparişiniz yok." href="/products" />
      ) : (
        <div className="orders-list">
          {orders.data.data.map((order) => (
            <div className="order-entry" key={order.id}>
              <Link className="order-card" href={`/orders/${order.id}`}>
                <div className="order-icon">
                  <Package size={25} />
                </div>
                <div>
                  <h3>Sipariş #{order.id}</h3>
                  <p className="muted">
                    {date(order.createdAt)} ·{" "}
                    {order.items?.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    ) ?? 0}{" "}
                    ürün
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
                <strong>{money(order.totalPrice)}</strong>
                <ArrowRight size={20} />
              </Link>
              {canCancelOrder(order.status) && (
                <div className="order-entry-actions">
                  <CancelOrderDialog order={order} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
export function OrderDetail({
  id,
  success = false,
}: {
  id: number;
  success?: boolean;
}) {
  const { currentUser } = useAuth();
  const query = useQuery({
    queryKey: ["order", currentUser?.id, id],
    queryFn: () => ordersApi.get(id),
  });
  if (query.isPending) return <Skeleton cards={2} />;
  if (query.isError)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const order = query.data.data;
  if (!order)
    return (
      <Empty
        title="Sipariş bulunamadı."
        href="/orders"
        cta="Siparişlerime dön"
      />
    );
  return (
    <>
      {success && (
        <div className="success-banner">
          <CheckCircle2 />
          Siparişiniz başarıyla oluşturuldu.
        </div>
      )}
      <PageTitle eyebrow={date(order.createdAt)} title={`Sipariş #${order.id}`}>
        <OrderStatusBadge status={order.status} />
      </PageTitle>
      <div className="checkout-layout">
        <div className="order-detail-main">
          <div className="panel">
            <h2>Siparişindeki ürünler</h2>
            {order.items.map((item, index) => (
              <div className="order-line" key={`${item.productId}-${index}`}>
                <div>
                  <Link href={`/products/${item.productId}`}>
                    <h3>{item.productName}</h3>
                  </Link>
                  <p className="muted">
                    {item.quantity} adet × {money(item.unitPrice)}
                  </p>
                </div>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
            <div className="summary-row total">
              <span>Sipariş toplamı</span>
              <strong>{money(order.totalPrice)}</strong>
            </div>
          </div>
          <div className="panel">
            <OrderStatusTimeline
              orderId={order.id}
              currentStatus={order.status}
            />
          </div>
        </div>
        <aside className="summary">
          <MapPin size={25} />
          <h2>Teslimat adresi</h2>
          <strong>{order.shippingFullName}</strong>
          <p>{order.shippingAddressLine}</p>
          <p>
            {order.shippingDistrict} / {order.shippingCity}
          </p>
          <CancelOrderDialog order={order} />
          <Link href="/orders" className="text-link">
            Tüm siparişler <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
}
