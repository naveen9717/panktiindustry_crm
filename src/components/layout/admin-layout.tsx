"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users, UserCog, CreditCard, Settings, Bell } from "lucide-react";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { TopHeader } from "./top-header";

interface AdminLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/admin/customers", label: "Customers", icon: <Users className="h-5 w-5" /> },
  { href: "/admin/team-members", label: "Team Members", icon: <UserCog className="h-5 w-5" /> },
  { href: "/admin/payments", label: "Payments", icon: <CreditCard className="h-5 w-5" /> },
  { href: "/admin/notifications", label: "Notifications", icon: <Bell className="h-5 w-5" /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
];

export function AdminLayout({ children, user }: AdminLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-page">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          user={user}
          navItems={adminNavItems}
          isCollapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar
        user={user}
        navItems={adminNavItems}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <div className={`transition-all duration-300 ${collapsed ? "lg:ml-16" : "lg:ml-64"}`}>
        <TopHeader
          user={user}
          onMenuClick={() => setMobileOpen(true)}
          onLogout={handleLogout}
        />
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
