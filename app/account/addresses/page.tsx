import { Suspense } from "react";
import { Addresses } from "@/components/addresses";
import { Guard, Skeleton } from "@/components/ui";
export const metadata = { title: "Adreslerim" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <div className="container page-space">
        <Guard>
          <Addresses />
        </Guard>
      </div>
    </Suspense>
  );
}
