import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, CircleCheck, CircleX, ClockAlert, Users, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/ui/Pagination";
import { getSignedPhotoUrl, STATUS_COLOR, STATUS_LABEL } from "@/lib/attendance";
import { fetchActiveUsers, fetchTodayAttendanceAll } from "@/lib/reports";
import { initials } from "@/lib/format";
import { usePagination } from "@/lib/usePagination";

const POLL_INTERVAL_MS = 15000;

function formatTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: "slate" | "emerald" | "red" | "amber";
}

const TONE_STYLE: Record<StatCardProps["tone"], { icon: string; value: string }> = {
  slate: { icon: "bg-slate-100 text-slate-600", value: "text-slate-900" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", value: "text-emerald-700" },
  red: { icon: "bg-red-50 text-red-600", value: "text-red-700" },
  amber: { icon: "bg-amber-50 text-amber-600", value: "text-amber-700" },
};

function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  const style = TONE_STYLE[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${style.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`mt-0.5 text-2xl font-semibold ${style.value}`}>{value}</p>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const usersQuery = useQuery({
    queryKey: ["admin", "active-users"],
    queryFn: fetchActiveUsers,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const attendanceQuery = useQuery({
    queryKey: ["admin", "today-attendance"],
    queryFn: fetchTodayAttendanceAll,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const attendanceByUserId = useMemo(
    () => new Map((attendanceQuery.data ?? []).map((a) => [a.user_id, a])),
    [attendanceQuery.data],
  );

  const users = usersQuery.data ?? [];
  const sudahAbsen = users.filter((u) => attendanceByUserId.has(u.id)).length;
  const telat = (attendanceQuery.data ?? []).filter((a) => a.status === "telat").length;
  const belumAbsen = users.length - sudahAbsen;
  const { page, setPage, pageCount, pageRows, totalItems, pageSize } = usePagination(users, 10);

  return (
    <AppShell title="Admin Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Karyawan Aktif" value={users.length} icon={Users} tone="slate" />
          <StatCard label="Sudah Absen" value={sudahAbsen} icon={CircleCheck} tone="emerald" />
          <StatCard label="Belum Absen" value={belumAbsen} icon={CircleX} tone="red" />
          <StatCard label="Telat" value={telat} icon={ClockAlert} tone="amber" />
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Aktivitas Absen Hari Ini</h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Update otomatis setiap 15 detik
            </span>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Divisi</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Jam Masuk</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Jam Pulang</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(usersQuery.isLoading || attendanceQuery.isLoading) && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Memuat...
                  </td>
                </tr>
              )}
              {totalItems === 0 && !usersQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Belum ada karyawan aktif.
                  </td>
                </tr>
              )}
              {pageRows.map((u) => {
                const attendance = attendanceByUserId.get(u.id);
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
                          {initials(u.nama)}
                        </div>
                        <span className="font-medium text-slate-900">{u.nama}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{u.divisi ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{formatTime(attendance?.jam_masuk ?? null)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatTime(attendance?.jam_pulang ?? null)}</td>
                    <td className="px-4 py-3">
                      {attendance ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[attendance.status]}`}
                        >
                          {STATUS_LABEL[attendance.status]}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                          Belum Absen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {attendance?.foto_masuk ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const url = await getSignedPhotoUrl(attendance.foto_masuk);
                            if (url) window.open(url, "_blank");
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Lihat
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </div>
      </div>
    </AppShell>
  );
}
