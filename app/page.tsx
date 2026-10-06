import { Suspense } from "react";
import { ProductListing } from "@/components/products";
import { Skeleton } from "@/components/ui";
export default function Home() {
  return (
    <Suspense fallback={<Skeleton />}>
      <div className="container page-space">
        <ProductListing />
      </div>
    </Suspense>
  );
}
