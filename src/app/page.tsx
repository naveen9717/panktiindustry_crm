import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";

/**
 * The domain root IS the login page — no /login URL.
 * Logged-in visitors go straight to their dashboard.
 */
export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "MASTER_ADMIN" ? "/admin/dashboard" : "/team/dashboard");
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
