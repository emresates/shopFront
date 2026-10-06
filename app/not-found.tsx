import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container empty not-found">
      <p className="eyebrow">404 / BİR ŞEYLER EKSİK</p>
      <h1>Bu sayfa burada değil.</h1>
      <p className="muted">
        Aradığın sayfa taşınmış veya kaldırılmış olabilir.
      </p>
      <Link href="/products" className="btn">
        Koleksiyona dön
      </Link>
    </div>
  );
}
