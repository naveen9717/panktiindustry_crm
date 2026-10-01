import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLayout } from "@/components/layout/admin-layout";
import { CustomerDetail } from "@/components/customers/customer-detail";
import { getCustomerById } from "@/lib/services/customer";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MASTER_ADMIN") {
    redirect("/team/customers");
  }

  const { id } = await params;
  const customer = await getCustomerById(id, user.id, user.role);

  if (!customer) {
    notFound();
  }

  return (
    <AdminLayout user={user}>
      <CustomerDetail customer={customer} user={user} />
    </AdminLayout>
  );
}
