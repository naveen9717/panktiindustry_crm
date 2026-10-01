import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { TeamLayout } from "@/components/layout/team-layout";
import { TeamCustomerDetail } from "@/components/customers/team-customer-detail";
import { getCustomerById } from "@/lib/services/customer";

export const dynamic = "force-dynamic";

export default async function TeamCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "MASTER_ADMIN") {
    redirect("/admin/customers/" + (await params).id);
  }

  const { id } = await params;
  const customer = await getCustomerById(id, user.id, user.role);

  if (!customer) {
    notFound();
  }

  return (
    <TeamLayout user={user}>
      <TeamCustomerDetail customer={customer} user={user} />
    </TeamLayout>
  );
}
