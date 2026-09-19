import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import SignOutButton from "@/components/auth/SignOutButton";
import HeaderMobileMenu from "@/components/HeaderMobileMenu";

const NAV_LINKS = [
  { href: "/artworks", label: "Artworks" },
  { href: "/artists", label: "Artists" },
  { href: "/categories", label: "Categories" },
  { href: "/week-best", label: "Week Best" },
  { href: "/about", label: "About" },
];

export default async function Header() {
  const user = await getSessionUser();
  const dashboardHref = user?.role === "admin" ? "/admin" : "/artist/dashboard";

  return (
    // Sticky so Sign out/Dashboard/Search stay reachable at the top of the
    // page on a long scroll, on the artist/admin portals especially -- this
    // is also the ONLY place Sign out appears (see
    // components/artist/ArtistNav.tsx and components/admin/AdminNav.tsx's
    // own comments -- they used to render a second copy of their own).
    //
    // Premium refresh (2026-09-14): the old always-visible horizontal-scroll
    // mobile nav row is gone, replaced by HeaderMobileMenu's hamburger +
    // slide-out drawer; "Search" is no longer a plain link to /search but
    // expands into a real input right here (a checkbox+peer reveal, same
    // "no client JS needed" idiom as ReadMore.tsx and ArtworkFilters.tsx's
    // advanced-filters/color-slider reveals elsewhere in this codebase --
    // the mobile drawer is the one exception, which needs real state, see
    // its own doc comment for why).
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/95 backdrop-blur-md">
      {/* Sibling of the search input further down -- lives here so the
          peer-checked reveal below can reach it via a plain CSS sibling
          selector regardless of how deeply that input is nested. */}
      <div className="container-gallery flex h-20 items-center justify-between gap-4 sm:h-24">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-icon.png"
            alt=""
            aria-hidden
            className="h-9 w-9 transition-transform duration-300 group-hover:scale-105"
          />
          <span className="font-display text-2xl tracking-tight sm:text-[1.65rem]">AartVerse</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Expandable search -- desktop only; the mobile drawer has its
              own always-visible search field instead. */}
          <div className="hidden items-center sm:flex">
            <input type="checkbox" id="header-search-toggle" className="peer sr-only" />
            <form action="/search" method="get" className="flex items-center">
              <label
                htmlFor="header-search-toggle"
                aria-label="Search"
                className="flex h-9 w-9 cursor-pointer items-center justify-center text-ink/70 transition-colors hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </label>
              <input
                type="search"
                name="q"
                placeholder="Search…"
                aria-label="Search artworks and artists"
                className="w-0 border-b border-transparent bg-transparent py-1 pl-0 font-sans text-sm text-ink opacity-0 transition-all duration-300 pointer-events-none peer-checked:w-40 peer-checked:border-ink peer-checked:pl-2 peer-checked:opacity-100 peer-checked:pointer-events-auto lg:peer-checked:w-56"
              />
            </form>
          </div>

          {user ? (
            <div className="hidden items-center gap-6 md:flex">
              <Link href={dashboardHref} className="nav-link">
                Dashboard
              </Link>
              <SignOutButton className="nav-link" />
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden border border-ink/20 px-5 py-2.5 font-sans text-[13px] font-medium uppercase tracking-widest2 text-ink transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-canvas md:inline-flex"
            >
              Sign in
            </Link>
          )}

          <HeaderMobileMenu navLinks={NAV_LINKS} isSignedIn={Boolean(user)} dashboardHref={dashboardHref} />
        </div>
      </div>
    </header>
  );
}
