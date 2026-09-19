import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="eyebrow mb-2 text-accent">Account recovery</p>
      <h1 className="mb-6 font-display text-3xl">Reset your password</h1>
      <ForgotPasswordForm />
      <p className="mt-6 font-sans text-sm text-muted">
        <Link href="/login" className="link-underline text-ink">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
