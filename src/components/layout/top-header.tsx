"use client";

import * as React from "react";
import { Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getInitials } from "@/lib/utils";
import { useTheme } from "@/lib/hooks/use-theme";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  action: string;
  description: string | null;
  entityType: string;
  createdAt: string;
  actor: string;
}

interface TopHeaderProps {
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
  onMenuClick?: () => void;
  onLogout: () => void;
}

export function TopHeader({ user, onMenuClick, onLogout }: TopHeaderProps) {
  const { mounted, theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setNotifications(data.notifications);
          setUnread(data.unread);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    onLogout();
  };

  const bell = (
    <button
      type="button"
      aria-label="Notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Left: mobile nav trigger */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            aria-label="Open menu"
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Right: notifications, theme, user, sign out */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Notifications */}
        <DropdownMenu trigger={bell} align="end">
          <div className="w-80 sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              {unread > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {unread} new
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  No notifications yet
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900">
                        {n.description || `${n.actor} performed ${n.action}`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {n.actor} ·{" "}
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DropdownMenu>

        {/* Dark / light mode */}
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* User */}
        <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-2.5 pr-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-sm font-semibold text-white">
            {getInitials(user.firstName, user.lastName)}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold leading-tight text-slate-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs leading-tight text-slate-500">
              {user.role === "MASTER_ADMIN" ? "Admin" : "Team Member"}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 sm:px-3"
          )}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
