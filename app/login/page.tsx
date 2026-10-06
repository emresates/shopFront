import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Skeleton } from "@/components/ui";
export const metadata = { title: "Giriş yap" };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <div className="container page-space">
        <AuthForm />
      </div>
    </Suspense>
  );
}
