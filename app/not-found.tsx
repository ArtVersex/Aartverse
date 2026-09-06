import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-gallery flex flex-col items-center justify-center gap-4 py-40 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-display text-4xl">We couldn&apos;t find that page</h1>
      <Link href="/" className="eyebrow link-underline mt-4">
        Back to Aartverse
      </Link>
    </div>
  );
}
