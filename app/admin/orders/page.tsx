import { Suspense } from "react";
import { AdminOrders } from "@/components/admin-orders";
import { Skeleton } from "@/components/ui";
export const metadata = { title: "Sipariş yönetimi" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AdminOrders />
    </Suspense>
  );
}
