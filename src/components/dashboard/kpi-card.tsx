"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeLabel?: string;
  iconClassName?: string;
}

export function KpiCard({ title, value, icon, change, changeLabel, iconClassName }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1">
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    change >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {change >= 0 ? "+" : ""}
                  {change}%
                </span>
                {changeLabel && (
                  <span className="text-xs text-slate-400">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconClassName)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
