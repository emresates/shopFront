import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/orders";
import { Guard } from "@/components/ui";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1)
    notFound();
  return (
    <div className="container page-space">
      <Guard>
        <OrderDetail id={Number(id)} success={query.success === "1"} />
      </Guard>
    </div>
  );
}
