import Link from "next/link";
import { consumeVerificationToken } from "@/lib/queries/tokens";
import { markEmailVerified } from "@/lib/queries/users";

export const metadata = {
  title: "Verify Email",
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  let outcome: "missing" | "success" | "invalid" = "missing";

  if (token) {
    const userId = await consumeVerificationToken(token);
    if (userId) {
      await markEmailVerified(userId);
      outcome = "success";
    } else {
      outcome = "invalid";
    }
  }

  return (
    <>
      <p className="eyebrow mb-2 text-accent">Email verification</p>
      <h1 className="mb-6 font-display text-3xl">
        {outcome === "success" ? "Email verified" : "Verify your email"}
      </h1>

      {outcome === "success" && (
        <p className="callout-banner">
          Thanks, your email address is confirmed.{" "}
          <Link href="/artist/dashboard" className="link-underline text-ink">
            Go to your dashboard
          </Link>
          .
        </p>
      )}

      {outcome === "invalid" && (
        <p className="callout-banner">
          This verification link is invalid or has expired. You can request a new one from your
          dashboard&apos;s account settings after signing in.
        </p>
      )}

      {outcome === "missing" && (
        <p className="callout-banner">This link is missing its verification token.</p>
      )}
    </>
  );
}
