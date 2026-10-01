import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-slate-900 text-white",
      secondary: "bg-slate-100 text-slate-700",
      destructive: "bg-red-100 text-red-700",
      outline: "border border-slate-200 text-slate-700",
      success: "bg-emerald-100 text-emerald-700",
      warning: "bg-amber-100 text-amber-700",
      info: "bg-blue-100 text-blue-700",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };

export function getLeadStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" {
  switch (status) {
    case "NEW": return "info";
    case "CONTACTED": return "secondary";
    case "FOLLOW_UP": return "warning";
    case "INTERESTED": return "info";
    case "QUALIFIED": return "default";
    case "PROPOSAL_SENT": return "secondary";
    case "NEGOTIATION": return "warning";
    case "CONVERTED": return "success";
    case "LOST": return "destructive";
    case "NOT_INTERESTED": return "destructive";
    default: return "secondary";
  }
}

export function getPaymentStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" {
  switch (status) {
    case "PAID": return "success";
    case "PENDING": return "warning";
    case "PARTIAL": return "info";
    case "FAILED": return "destructive";
    case "REFUNDED": return "secondary";
    default: return "secondary";
  }
}

export function getUserStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" {
  switch (status) {
    case "ACTIVE": return "success";
    case "INACTIVE": return "destructive";
    case "DELETED": return "secondary";
    default: return "secondary";
  }
}
