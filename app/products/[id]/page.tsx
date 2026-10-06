import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/products";
import { productsApi } from "@/lib/api/products";
import { ApiError } from "@/lib/api/client";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1)
    notFound();
  let initialData;
  try {
    initialData = await productsApi.get(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
  }
  return (
    <div className="container page-space">
      <ProductDetail id={Number(id)} initialData={initialData} />
    </div>
  );
}
