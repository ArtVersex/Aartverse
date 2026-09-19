import Link from "next/link";

export default function SectionHeading({
  eyebrow,
  title,
  href,
  hrefLabel = "View all",
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        {eyebrow && <p className="eyebrow mb-3 text-accent">{eyebrow}</p>}
        <h2 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="nav-link !text-[13px]">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}
