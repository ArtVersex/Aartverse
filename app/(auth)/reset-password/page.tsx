import Link from "next/link";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Reset Password",
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <>
      <p className="eyebrow mb-2 text-accent">Account recovery</p>
      <h1 className="mb-6 font-display text-3xl">Choose a new password</h1>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="callout-banner">
          This reset link is missing its token.{" "}
          <Link href="/forgot-password" className="link-underline text-ink">
            Request a new link
          </Link>
          .
        </p>
      )}
    </>
  );
}
