import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireUser();
  return (
    <div className="min-h-screen">
      <Nav name={s.name} role={s.role} />
      <main className="px-4 pb-24 pt-4 md:ml-60 md:px-8 md:pb-8 md:pt-6">{children}</main>
    </div>
  );
}
