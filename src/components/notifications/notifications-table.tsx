"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

interface Notification {
  id: string;
  action: string;
  description: string | null;
  entityType: string;
  createdAt: string;
  actor: string;
}

interface NotificationsTableProps {
  page: number;
}

export function NotificationsTable({ page }: NotificationsTableProps) {
  const router = useRouter();
  const [data, setData] = React.useState<Notification[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/notifications?page=${page}&pageSize=20`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (cancelled || !result) return;
        setData(result.notifications);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const columns: ColumnDef<Notification, any>[] = [
    {
      accessorKey: "actor",
      header: "Actor",
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">{row.original.actor}</span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.action.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-slate-600">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "entityType",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-slate-500">{row.original.entityType}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-slate-500">
          {formatDateTime(new Date(row.original.createdAt))}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-slate-500">Loading notifications…</p>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      totalItems={total}
      pageSize={20}
      currentPage={page}
      totalPages={totalPages}
      onPageChange={(p) => router.push(`/admin/notifications?page=${p}`)}
    />
  );
}
