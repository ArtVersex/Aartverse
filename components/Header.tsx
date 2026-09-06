import Link from "next/link";

const NAV_LINKS = [
  { href: "/artworks", label: "Artworks" },
  { href: "/artists", label: "Artists" },
  { href: "/categories", label: "Categories" },
  { href: "/week-best", label: "Week Best" },
  { href: "/about", label: "About" },
];

export default function Header() {
  return (
    <header className="border-b border-line bg-canvas/90 backdrop-blur">
      <div className="container-gallery flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" aria-hidden className="h-8 w-8" />
          <span className="font-display text-2xl tracking-tight">AartVerse</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="eyebrow link-underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/search"
          aria-label="Search artworks and artists"
          className="eyebrow link-underline"
        >
          Search
        </Link>
      </div>
      <nav className="container-gallery flex items-center gap-6 overflow-x-auto pb-4 md:hidden">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="eyebrow whitespace-nowrap">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
