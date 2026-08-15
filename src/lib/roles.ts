import type { UserRole } from "@/types/database";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  hr: "HR",
  supervisor: "Supervisor",
  karyawan: "Karyawan",
};

export const ROLE_BADGE_COLOR: Record<UserRole, string> = {
  admin: "bg-violet-50 text-violet-700 ring-violet-600/20",
  hr: "bg-sky-50 text-sky-700 ring-sky-600/20",
  supervisor: "bg-amber-50 text-amber-700 ring-amber-600/20",
  karyawan: "bg-slate-100 text-slate-700 ring-slate-500/20",
};
