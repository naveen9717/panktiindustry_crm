import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/local";
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
  const db = await getDb();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MASTER_ADMIN") {
    redirect("/team/customers");
  }

  const { id } = await params;
  const customer = await getCustomerById(db, id, user.id, user.role);

  if (!customer) {
    notFound();
  }

  return (
    <AdminLayout user={user}>
      <CustomerDetail customer={customer} user={user} />
    </AdminLayout>
  );
}
