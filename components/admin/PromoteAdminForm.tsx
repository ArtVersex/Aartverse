"use client";

import { useActionState } from "react";
import { promoteToAdminAction, type PromoteAdminState } from "@/app/admin/admins/actions";

const initialState: PromoteAdminState = {};

/** Email-based "make someone an admin" form -- same lookup-by-email
 *  convention as scripts/create-admin.mjs, just reachable from the UI for
 *  the super admin instead of the shell (see ./actions.ts for the gating). */
export default function PromoteAdminForm() {
  const [state, formAction, isPending] = useActionState(promoteToAdminAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 border border-line bg-white p-6 sm:flex-row sm:items-end sm:gap-4"
    >
      <div className="flex-1">
        <label htmlFor="promote-email" className="field-label">
          Make someone an admin
        </label>
        <input
          id="promote-email"
          name="email"
          type="email"
          required
          placeholder="their-email@example.com"
        />
        <p className="mt-1 font-sans text-xs text-muted">
          They need an existing account (Google or email/password) first -- this just grants admin
          access to it.
        </p>
        {state.error && <p className="field-error">{state.error}</p>}
        {state.success && (
          <p className="mt-1 font-sans text-xs text-emerald-800">
            Done -- they now have full admin access.
          </p>
        )}
      </div>
      <button type="submit" disabled={isPending} className="btn-secondary shrink-0">
        {isPending ? "Promoting..." : "Promote to admin"}
      </button>
    </form>
  );
}
