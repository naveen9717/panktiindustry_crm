import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLayout } from "@/components/layout/admin-layout";
import { TeamMembersTable } from "@/components/team-members/team-members-table";
import { getTeamMembers } from "@/lib/services/team-member";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function TeamMembersPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const db = await getDb();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MASTER_ADMIN") {
    redirect("/team/dashboard");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = params.status || "";

  const data = await getTeamMembers({ db, 
    page,
    pageSize: 10,
    search,
    status,
  });

  return (
    <AdminLayout user={user}>
      <div className="p-6">
        <TeamMembersTable
          members={data.members}
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
          totalPages={data.totalPages}
          currentFilters={{ search, status }}
        />
      </div>
    </AdminLayout>
  );
}
