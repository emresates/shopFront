import { AdminShell } from "@/components/admin";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container page-space">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
