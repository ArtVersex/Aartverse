import { requireAdmin } from "@/lib/auth/session";
import AdminNav from "@/components/admin/AdminNav";

/**
 * Guards every /admin/* route. requireAdmin() re-checks the role from the
 * database on every request (see lib/auth/session.ts) — role can only ever
 * come from the database (see scripts/create-admin.mjs); it is never
 * derived from Google email/domain or any client-supplied value.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="container-gallery py-8 sm:py-12">
      <p className="eyebrow mb-1">Admin</p>
      <h1 className="mb-6 font-display text-2xl">AartVerse Admin</h1>
      <AdminNav />
      {children}
    </div>
  );
}
