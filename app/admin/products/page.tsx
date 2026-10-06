import { Suspense } from "react";
import { AdminProducts } from "@/components/admin";
import { Skeleton } from "@/components/ui";
export const metadata = { title: "Ürün yönetimi" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AdminProducts />
    </Suspense>
  );
}
