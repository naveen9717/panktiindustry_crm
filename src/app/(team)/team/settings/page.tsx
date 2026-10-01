import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { TeamLayout } from "@/components/layout/team-layout";
import { SettingsPage } from "@/components/settings/settings-page";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "MASTER_ADMIN") {
    redirect("/admin/settings");
  }

  return (
    <TeamLayout user={user}>
      <div className="p-6">
        <SettingsPage user={user} isAdmin={false} />
      </div>
    </TeamLayout>
  );
}
