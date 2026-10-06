import { Suspense } from "react";
import { Account } from "@/components/account";
import { Guard, Skeleton } from "@/components/ui";
export const metadata = { title: "Hesabım" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <div className="container page-space">
        <Guard>
          <Account />
        </Guard>
      </div>
    </Suspense>
  );
}
