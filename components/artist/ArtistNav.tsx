"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/artist/dashboard", label: "Dashboard" },
  { href: "/artist/artworks", label: "Artworks" },
  { href: "/artist/profile", label: "Profile" },
];

// No sign-out control here -- components/Header.tsx (the site-wide header,
// rendered above this on every page) already has one. Having a second copy
// here duplicated it on every artist page; the one in the header is the
// one that's always reachable at the top of the page.
export default function ArtistNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 border-b border-line pb-3 sm:mb-8 sm:pb-4">
      {/* Horizontal scroll rather than wrap on narrow screens -- keeps the
          tabs one tidy row at any width. */}
      <nav className="flex gap-4 overflow-x-auto sm:flex-wrap sm:gap-6">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`eyebrow shrink-0 whitespace-nowrap py-1 ${active ? "text-ink underline decoration-1 underline-offset-4" : "text-muted hover:text-ink"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
