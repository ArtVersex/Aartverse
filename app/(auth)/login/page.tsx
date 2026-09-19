import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In",
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/artist/dashboard");
  }

  return (
    <>
      <p className="eyebrow mb-2 text-accent">Welcome back</p>
      <h1 className="mb-6 font-display text-3xl">Sign in</h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 font-sans text-sm text-muted">
        New to AartVerse?{" "}
        <Link href="/register" className="link-underline text-ink">
          Register as an artist
        </Link>
      </p>
    </>
  );
}
