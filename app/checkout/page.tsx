import { Suspense } from "react";
import { Checkout } from "@/components/orders";
import { Guard, Skeleton } from "@/components/ui";
export const metadata = { title: "Siparişi tamamla" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <div className="container page-space">
        <Guard>
          <Checkout />
        </Guard>
      </div>
    </Suspense>
  );
}
