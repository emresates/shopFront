import { Suspense } from "react";
import { AdminOverview } from "@/components/admin";
import { Skeleton } from "@/components/ui";
export const metadata = { title: "Yönetim" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AdminOverview />
    </Suspense>
  );
}
