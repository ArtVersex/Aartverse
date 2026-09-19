/**
 * A collapsible section shared by the artist-facing forms (artwork
 * submission, profile) -- everything genuinely optional lives behind one of
 * these, so a long form still reads as short on a phone even though the
 * full field list underneath it is long. Uses <details> (open state via
 * Tailwind's built-in group-open: variant) instead of a client-side
 * accordion, so it needs no state -- or "use client" -- of its own and
 * works the same whether its parent is a client or server component.
 *
 * Extracted from components/artist/ArtworkForm.tsx (where this originally
 * lived as a private, unexported function) so components/artist/ProfileForm.tsx
 * can use the exact same section chrome instead of a second, slightly
 * different one drifting into existence.
 */
export default function FormSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="details-section group" open={defaultOpen}>
      <summary>
        <span>
          {title}
          {subtitle && <span className="ml-2 font-normal text-muted">{subtitle}</span>}
        </span>
        <span
          aria-hidden
          className="text-lg leading-none text-muted transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="details-section-body">{children}</div>
    </details>
  );
}
