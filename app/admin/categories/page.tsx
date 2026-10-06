import { Suspense } from "react";
import { AdminCategories } from "@/components/admin";
import { Skeleton } from "@/components/ui";
export const metadata = { title: "Kategori yönetimi" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AdminCategories />
    </Suspense>
  );
}
