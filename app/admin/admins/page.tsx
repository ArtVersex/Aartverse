import { requireSuperAdmin } from "@/lib/auth/session";
import { listAdminUsers } from "@/lib/queries/users";
import PromoteAdminForm from "@/components/admin/PromoteAdminForm";
import AdminRowActions from "@/components/admin/AdminRowActions";

export const metadata = { title: "Manage Admins" };

/**
 * Super-admin-only screen for granting and revoking admin access --
 * app/admin/layout.tsx only enforces requireAdmin() for every /admin/*
 * route, so this page independently calls requireSuperAdmin() too (same
 * defense-in-depth every other admin mutation in this codebase follows).
 * A regular admin who guesses this URL is bounced straight back to
 * /admin, and the "Admins" tab in AdminNav.tsx is hidden from them
 * entirely so there's nothing to guess from in the first place.
 */
export default async function AdminAdminsPage() {
  const currentUser = await requireSuperAdmin();
  const admins = await listAdminUsers();

  return (
    <div>
      <h2 className="mb-2 font-display text-2xl">Admins</h2>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Only you, as the super admin, can grant or revoke admin access. Everyone you promote gets
        the exact same admin capabilities you have everywhere else on this site -- just not the
        ability to promote or revoke other admins.
      </p>

      <div className="mb-8">
        <PromoteAdminForm />
      </div>

      <ul className="divide-y divide-line border-y border-line">
        {admins.map((admin) => (
          <li key={admin.id} className="row-card">
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-display text-base">{admin.name}</p>
                  {admin.is_super_admin ? (
                    <span className="badge-featured">Super admin</span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate font-sans text-xs text-muted">{admin.email}</p>
              </div>

              {!admin.is_super_admin && admin.id !== currentUser.id && (
                <div className="shrink-0">
                  <AdminRowActions userId={admin.id} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
