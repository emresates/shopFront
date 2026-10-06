import { Suspense } from "react";
import { Favorites } from "@/components/account";
import { Guard, Skeleton } from "@/components/ui";
export const metadata = { title: "Favorilerim" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <div className="container page-space">
        <Guard>
          <Favorites />
        </Guard>
      </div>
    </Suspense>
  );
}
