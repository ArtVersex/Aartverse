import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Register as an Artist",
};

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/artist/dashboard");
  }

  return (
    <>
      <p className="eyebrow mb-2 text-accent">Join AartVerse</p>
      <h1 className="mb-6 font-display text-3xl">Register as an artist</h1>
      <RegisterForm />
      <p className="mt-6 font-sans text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="link-underline text-ink">
          Sign in
        </Link>
      </p>
    </>
  );
}
