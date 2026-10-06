"use client";
import { ErrorState } from "@/components/ui";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container page-space">
      <ErrorState
        error={
          new Error(
            "Sayfa yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.",
          )
        }
        retry={reset}
      />
    </div>
  );
}
