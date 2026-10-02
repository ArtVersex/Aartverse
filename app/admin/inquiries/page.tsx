import Link from "next/link";
import { listInquiries } from "@/lib/queries/inquiries";
import InquiryStatusControl from "@/components/admin/InquiryStatusControl";
import type { InquiryStatus, InquiryType } from "@/lib/types";

export const metadata = { title: "Inquiries" };

const TYPE_LABEL: Record<InquiryType, string> = {
  artwork: "Artwork",
  general: "General",
  custom: "Custom order",
};

const TYPE_FILTERS: Array<{ value: InquiryType | undefined; label: string }> = [
  { value: undefined, label: "All" },
  { value: "artwork", label: "Artwork" },
  { value: "general", label: "General" },
  { value: "custom", label: "Custom order" },
];

interface Props {
  searchParams: Promise<{ type?: string; status?: string }>;
}

/**
 * Every customer inquiry -- artwork enquiries, general questions, and
 * customized-product requests -- in one place. Without this page, an
 * inquiry's only visible trace is the one-time email every admin gets when
 * it comes in (see lib/email/templates.ts#sendNewInquiryAdminEmail); this
 * is where the team actually works the list over time (mark it contacted,
 * mark it closed once resolved). Any admin can use this -- responding to
 * customers isn't a super-admin-only capability.
 */
export default async function AdminInquiriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const type = (params.type as InquiryType | undefined) || undefined;
  const status = (params.status as InquiryStatus | undefined) || undefined;

  const inquiries = await listInquiries({ type, status });

  function filterHref(next: { type?: InquiryType; status?: InquiryStatus }) {
    const merged = { type, status, ...next };
    const qs = new URLSearchParams();
    if (merged.type) qs.set("type", merged.type);
    if (merged.status) qs.set("status", merged.status);
    const query = qs.toString();
    return query ? `/admin/inquiries?${query}` : "/admin/inquiries";
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl">Inquiries</h2>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <nav className="flex flex-wrap gap-3">
          {TYPE_FILTERS.map((f) => (
            <Link
              key={f.label}
              href={filterHref({ type: f.value })}
              className={`eyebrow link-underline ${type === f.value ? "text-ink" : "text-muted"}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <span className="text-muted">|</span>
        <nav className="flex flex-wrap gap-3">
          {(["new", "contacted", "closed"] as InquiryStatus[]).map((s) => (
            <Link
              key={s}
              href={filterHref({ status: status === s ? undefined : s })}
              className={`eyebrow link-underline ${status === s ? "text-ink" : "text-muted"}`}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </nav>
      </div>

      {inquiries.length === 0 ? (
        <p className="text-sm text-muted">No inquiries yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id} className="row-card">
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="eyebrow">{TYPE_LABEL[inquiry.type]}</span>
                    {inquiry.category_id && <span className="eyebrow text-muted">· {inquiry.category_id}</span>}
                    <span className="text-xs text-muted">
                      {new Date(inquiry.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 font-display text-base">{inquiry.name}</p>
                  <p className="font-sans text-xs text-muted">
                    <a href={`mailto:${inquiry.email}`} className="link-underline">
                      {inquiry.email}
                    </a>
                    {inquiry.phone && <> · {inquiry.phone}</>}
                  </p>
                  {inquiry.artwork_id && (
                    <Link
                      href={`/artworks/${inquiry.artwork_id}`}
                      target="_blank"
                      className="eyebrow link-underline mt-1 inline-block"
                    >
                      View artwork
                    </Link>
                  )}
                  <p className="mt-2 max-w-xl whitespace-pre-wrap font-sans text-sm text-ink">
                    {inquiry.message}
                  </p>
                </div>

                <div className="shrink-0">
                  <InquiryStatusControl inquiryId={inquiry.id} status={inquiry.status} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
