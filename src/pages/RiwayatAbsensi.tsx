import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/lib/auth/AuthProvider";
import { fetchAttendanceHistory, STATUS_COLOR, STATUS_LABEL } from "@/lib/attendance";
import { usePagination } from "@/lib/usePagination";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function RiwayatAbsensi() {
  const { profile } = useAuth();

  const historyQuery = useQuery({
    queryKey: ["attendance", "history", profile?.id],
    queryFn: () => fetchAttendanceHistory(profile!.id, 365),
    enabled: !!profile,
  });

  const { page, setPage, pageCount, pageRows, totalItems, pageSize } = usePagination(
    historyQuery.data ?? [],
    15,
  );

  return (
    <AppShell title="Riwayat Absensi">
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Tanggal</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Jam Masuk</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Jam Pulang</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historyQuery.isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Memuat...
                </td>
              </tr>
            )}
            {!historyQuery.isLoading && totalItems === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Belum ada riwayat absensi.
                </td>
              </tr>
            )}
            {pageRows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-slate-900">{formatDate(row.tanggal)}</td>
                <td className="px-4 py-3 text-slate-700">{formatTime(row.jam_masuk)}</td>
                <td className="px-4 py-3 text-slate-700">{formatTime(row.jam_pulang)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[row.status]}`}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
              </tr>
            ))}
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
    </AppShell>
  );
}
