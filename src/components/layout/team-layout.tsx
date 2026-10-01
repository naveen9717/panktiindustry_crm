"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, Settings } from "lucide-react";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";

interface TeamLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

const teamNavItems = [
  { href: "/team/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/team/customers", label: "My Customers", icon: <Users className="h-5 w-5" /> },
  { href: "/team/payments", label: "My Payments", icon: <CreditCard className="h-5 w-5" /> },
  { href: "/team/settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
];

export function TeamLayout({ children, user }: TeamLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          user={user}
          navItems={teamNavItems}
          isCollapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar
        user={user}
        navItems={teamNavItems}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <div className={`transition-all duration-300 ${collapsed ? "lg:ml-16" : "lg:ml-64"}`}>
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
