import { Suspense } from "react";
import { ProductListing } from "@/components/products";
import { Skeleton } from "@/components/ui";
export const metadata = { title: "Ürünler" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <div className="container page-space">
        <ProductListing />
      </div>
    </Suspense>
  );
}
