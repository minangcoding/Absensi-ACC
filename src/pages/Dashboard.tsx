import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { fetchTodayAttendance, STATUS_COLOR, STATUS_LABEL } from "@/lib/attendance";

export function Dashboard() {
  const { profile } = useAuth();

  const todayQuery = useQuery({
    queryKey: ["attendance", "today", profile?.id],
    queryFn: () => fetchTodayAttendance(profile!.id),
    enabled: !!profile,
  });

  const today = todayQuery.data;
  const belumAbsenMasuk = !today?.jam_masuk;
  const belumAbsenPulang = today?.jam_masuk && !today?.jam_pulang;

  return (
    <AppShell title="Dashboard">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-slate-600">
          Selamat datang, <span className="font-medium text-slate-900">{profile?.nama}</span>.
        </p>

        {!todayQuery.isLoading && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm text-slate-500">Status hari ini</p>
              <p className="text-sm font-medium text-slate-900">
                {today?.status ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[today.status]}`}
                  >
                    {STATUS_LABEL[today.status]}
                  </span>
                ) : (
                  "Belum absen"
                )}
              </p>
            </div>
            {(belumAbsenMasuk || belumAbsenPulang) && (
              <Link
                to="/absen"
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
              >
                {belumAbsenMasuk ? "Absen Masuk" : "Absen Pulang"}
              </Link>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
