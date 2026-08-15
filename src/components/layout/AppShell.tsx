import { type ReactNode, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  Clock,
  Download,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ScrollText,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { initials } from "@/lib/format";
import { ROLE_BADGE_COLOR, ROLE_LABEL } from "@/lib/roles";
import { fetchApprovalQueue, fetchMyLeaveRequests } from "@/lib/leave";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const PERSONAL_ITEMS: NavItem[] = [
  { to: "/absen", label: "Absen", icon: Clock },
  { to: "/riwayat", label: "Riwayat Absensi", icon: History },
  { to: "/pengajuan-izin", label: "Pengajuan Izin", icon: FileText },
];

const ADMIN_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Manajemen User", icon: Users },
  { to: "/admin/lokasi", label: "Lokasi & Jam Kerja", icon: MapPin },
  { to: "/admin/koreksi-absensi", label: "Koreksi Absensi", icon: ClipboardList },
  { to: "/admin/rekap", label: "Rekap & Export", icon: BarChart3 },
  { to: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

function buildNavGroups(role: string | undefined): NavGroup[] {
  if (role === "admin") {
    return [
      { label: "Administrasi", items: ADMIN_ITEMS },
      { label: "Absensi Pribadi", items: PERSONAL_ITEMS },
    ];
  }

  const items: NavItem[] = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    ...PERSONAL_ITEMS,
  ];
  if (role === "supervisor" || role === "hr")
    items.push({ to: "/approval", label: "Approval Izin", icon: CheckSquare });
  if (role === "hr") items.push({ to: "/rekap", label: "Rekap & Export", icon: BarChart3 });
  return [{ label: "Menu", items }];
}

export function AppShell({ title, children }: { title: string; children?: ReactNode }) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navGroups = buildNavGroups(profile?.role);
  const isReviewer = profile?.role === "supervisor" || profile?.role === "hr";
  const { canInstall, promptInstall } = useInstallPrompt();

  // Badge angka kecil di menu sidebar (bukan kartu terpisah di Dashboard,
  // biar informasinya nempel langsung ke menu yang relevan, gak dobel).
  const myLeaveQuery = useQuery({
    queryKey: ["leave-requests", "mine", profile?.id],
    queryFn: () => fetchMyLeaveRequests(profile!.id),
    enabled: !!profile,
  });
  const approvalQueueQuery = useQuery({
    queryKey: ["leave-requests", "queue"],
    queryFn: fetchApprovalQueue,
    enabled: isReviewer,
  });

  const navBadges: Record<string, number> = {
    "/pengajuan-izin": (myLeaveQuery.data ?? []).filter((r) => r.status === "pending").length,
    "/approval": (approvalQueueQuery.data ?? []).filter(
      (r) => r.status === "pending" && r.user_id !== profile?.id,
    ).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 sm:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 sm:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 flex-none items-center gap-2.5 border-b border-slate-100 px-4">
          <img src="/logo_acc.png" alt="ACC" className="h-9 w-9 flex-none object-contain" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-900">Sistem Kehadiran</p>
            <p className="truncate text-[11px] text-slate-400">Astra Credit Companies</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
            className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 sm:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
              <div className="mt-1.5 space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 flex-none" />
                    <span className="flex-1">{item.label}</span>
                    {!!navBadges[item.to] && (
                      <span className="flex h-5 min-w-5 flex-none items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                        {navBadges[item.to]}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <Link
          to="/profil"
          onClick={() => setMobileOpen(false)}
          className="flex flex-none items-center gap-2.5 border-t border-slate-100 p-3 hover:bg-slate-50"
        >
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {profile ? initials(profile.nama) : ""}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-slate-900">{profile?.nama}</p>
            {profile && (
              <span
                className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${ROLE_BADGE_COLOR[profile.role]}`}
              >
                {ROLE_LABEL[profile.role]}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void signOut();
            }}
            title="Keluar"
            aria-label="Keluar"
            className="flex-none rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </Link>
      </aside>

      <div className="flex min-h-screen flex-col sm:pl-64">
        <header className="flex h-16 flex-none items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 sm:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-base font-semibold text-slate-900">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            {canInstall && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="hidden items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 sm:inline-flex"
              >
                <Download className="h-4 w-4" />
                Install App
              </button>
            )}
            <NotificationBell />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
