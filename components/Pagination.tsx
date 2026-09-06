import Link from "next/link";

/** Builds a query string that keeps all existing filters and only changes `page`. */
function pageHref(basePath: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `${basePath}?${next.toString()}`;
}

export default function Pagination({
  basePath,
  searchParams,
  page,
  totalPages,
}: {
  basePath: string;
  searchParams: URLSearchParams;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav className="mt-16 flex items-center justify-center gap-8 border-t border-line pt-8">
      {prev ? (
        <Link href={pageHref(basePath, searchParams, prev)} className="eyebrow link-underline">
          ← Previous
        </Link>
      ) : (
        <span className="eyebrow text-line">← Previous</span>
      )}

      <span className="text-sm text-muted">
        Page {page} of {totalPages}
      </span>

      {next ? (
        <Link href={pageHref(basePath, searchParams, next)} className="eyebrow link-underline">
          Next →
        </Link>
      ) : (
        <span className="eyebrow text-line">Next →</span>
      )}
    </nav>
  );
}
