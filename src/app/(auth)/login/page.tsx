import { redirect } from "next/navigation";

/** Login lives on the domain root now — keep /login working as a redirect. */
export default function LoginPage() {
  redirect("/");
}
