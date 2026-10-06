import type { Metadata } from "next";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { Header, Footer } from "@/components/layout";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "form — Hayatına iyi gelen detaylar",
    template: "%s | form",
  },
  description:
    "Kendi alanını, kendi tarzınla oluştur. form koleksiyonunu keşfet.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">
          İçeriğe geç
        </a>
        <Providers>
          <Suspense>
            <Header />
          </Suspense>
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
