"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge, getUserStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Phone, Users, Target, TrendingUp, IndianRupee, Calendar } from "lucide-react";
import type { User } from "@/db/schema";

type TeamMemberDetailType = Pick<User, "id" | "firstName" | "lastName" | "email" | "phone" | "role" | "status" | "profileImage" | "lastLoginAt" | "createdAt" | "updatedAt"> & {
  _count: { assignedCustomers: number };
  activeLeads: number;
  convertedLeads: number;
  paymentsReceived: number;
};

interface TeamMemberDetailProps {
  member: TeamMemberDetailType;
}

export function TeamMemberDetail({ member }: TeamMemberDetailProps) {
  const router = useRouter();

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to team members
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar firstName={member.firstName} lastName={member.lastName} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {member.firstName} {member.lastName}
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <Badge variant={getUserStatusBadgeVariant(member.status)}>
                {member.status}
              </Badge>
              <span className="text-sm text-slate-500">
                {member.role === "MASTER_ADMIN" ? "Master Admin" : "Team Member"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/team-members/${member.id}/customers`}>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4" />
              View Customers
            </Button>
          </Link>
          <Link href={`/admin/team-members/${member.id}/payments`}>
            <Button variant="outline" size="sm">
              <IndianRupee className="h-4 w-4" />
              View Payments
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Customers</p>
                <p className="text-xl font-bold text-slate-900">{member._count.assignedCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Leads</p>
                <p className="text-xl font-bold text-slate-900">{member.activeLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Converted</p>
                <p className="text-xl font-bold text-slate-900">{member.convertedLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                <IndianRupee className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Payments Received</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(member.paymentsReceived)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm text-slate-900">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <p className="text-sm text-slate-900">{member.phone || "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Member Since</p>
              <p className="text-sm text-slate-900">{formatDate(member.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Last Login</p>
              <p className="text-sm text-slate-900">
                {member.lastLoginAt ? formatDate(member.lastLoginAt) : "Never"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
