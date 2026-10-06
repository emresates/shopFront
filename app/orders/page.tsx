import { Orders } from "@/components/orders";
import { Guard } from "@/components/ui";
export const metadata = { title: "Siparişlerim" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const query = await searchParams;
  return (
    <div className="container page-space">
      <Guard>
        <Orders success={query.success === "1"} />
      </Guard>
    </div>
  );
}
