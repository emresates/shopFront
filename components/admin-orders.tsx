"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import type { AdminOrder } from "@/types";
import { ordersApi } from "@/lib/api/orders";
import { date, money } from "@/lib/format";
import { OrderStatusBadge, OrderStatusSelect } from "./orders";
import { Empty, ErrorState, Modal, PageTitle, Skeleton } from "./ui";
export function AdminOrdersTable({
  orders,
  showDetail,
}: {
  orders: AdminOrder[];
  showDetail: (order: AdminOrder) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="admin-orders-table">
        <thead>
          <tr>
            <th>Sipariş</th>
            <th>Müşteri</th>
            <th>Tarih</th>
            <th>Adet</th>
            <th>Tutar</th>
            <th>Durum</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="nowrap">#{order.id}</td>
              <td>
                {order.customerName}
                <small>{order.customerEmail}</small>
              </td>
              <td className="nowrap">{date(order.createdAt)}</td>
              <td>{order.totalQuantity}</td>
              <td className="nowrap">{money(order.totalPrice)}</td>
              <td>
                <OrderStatusBadge status={order.status} />
              </td>
              <td>
                <div className="table-actions">
                  <button
                    className="icon-btn"
                    aria-label={`Sipariş #${order.id} detayı`}
                    onClick={() => showDetail(order)}
                  >
                    <Eye size={17} />
                  </button>
                  <OrderStatusSelect orderId={order.id} status={order.status} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function AdminOrders() {
  const orders = useQuery({
    queryKey: ["orders", "admin"],
    queryFn: ordersApi.adminList,
  });
  const [detailId, setDetailId] = useState<number | null>(null);
  // Read from the live list so the dialog reflects status changes.
  const detail = orders.data?.data?.find((o) => o.id === detailId);
  return (
    <>
      <PageTitle
        eyebrow="SİPARİŞ YÖNETİMİ"
        title="Siparişler."
        description="Tüm müşteri siparişleri, en yeniden eskiye."
      />
      {orders.isPending ? (
        <Skeleton cards={3} />
      ) : orders.isError ? (
        <ErrorState error={orders.error} retry={() => void orders.refetch()} />
      ) : !orders.data.data?.length ? (
        <Empty title="Henüz sipariş yok." />
      ) : (
        <AdminOrdersTable
          orders={orders.data.data}
          showDetail={(order) => setDetailId(order.id)}
        />
      )}
      {detail && (
        <Modal title={`Sipariş #${detail.id}`} close={() => setDetailId(null)}>
          <dl className="order-facts">
            <div>
              <dt>Müşteri</dt>
              <dd>
                {detail.customerName}
                <small>{detail.customerEmail}</small>
              </dd>
            </div>
            <div>
              <dt>Sipariş tarihi</dt>
              <dd>{date(detail.createdAt)}</dd>
            </div>
            <div>
              <dt>Toplam ürün adedi</dt>
              <dd>{detail.totalQuantity}</dd>
            </div>
            <div>
              <dt>Toplam tutar</dt>
              <dd>{money(detail.totalPrice)}</dd>
            </div>
            <div>
              <dt>Durum</dt>
              <dd>
                <OrderStatusBadge status={detail.status} />
              </dd>
            </div>
          </dl>
          <p className="muted">
            Durum değişiklikleri sipariş tablosundan yapılır.
          </p>
        </Modal>
      )}
    </>
  );
}
