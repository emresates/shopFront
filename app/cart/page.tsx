import { Suspense } from "react";
import { CartPage } from "@/components/cart";
import { Guard, Skeleton } from "@/components/ui";
export const metadata = { title: "Sepetim" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <div className="container page-space">
        <Guard>
          <CartPage />
        </Guard>
      </div>
    </Suspense>
  );
}
