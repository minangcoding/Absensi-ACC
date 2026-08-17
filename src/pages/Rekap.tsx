import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/attendance";
import { toJakartaDateString } from "@/lib/date";
import { usePagination } from "@/lib/usePagination";
import {
  buildReportRows,
  exportAttendanceExcel,
  exportAttendancePdf,
  fetchActiveUsers,
  fetchAttendanceRange,
  STATUS_CHART_COLOR,
  summarizeByStatus,
} from "@/lib/reports";
import type { AttendanceStatus } from "@/types/database";

function toISODate(d: Date) {
  return toJakartaDateString(d);
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const PRESETS = [
  { key: "hari-ini", label: "Hari Ini" },
  { key: "minggu-ini", label: "Minggu Ini" },
  { key: "bulan-ini", label: "Bulan Ini" },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"] | "custom";

export function Rekap() {
  const today = new Date();
  const [preset, setPreset] = useState<PresetKey>("bulan-ini");
  const [customStart, setCustomStart] = useState(toISODate(startOfMonth(today)));
  const [customEnd, setCustomEnd] = useState(toISODate(today));
  const [search, setSearch] = useState("");

  const { startDate, endDate } = useMemo(() => {
    if (preset === "hari-ini") return { startDate: toISODate(today), endDate: toISODate(today) };
    if (preset === "minggu-ini")
      return { startDate: toISODate(startOfWeek(today)), endDate: toISODate(today) };
    if (preset === "bulan-ini")
      return { startDate: toISODate(startOfMonth(today)), endDate: toISODate(today) };
    return { startDate: customStart, endDate: customEnd };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customStart, customEnd]);

  const attendanceQuery = useQuery({
    queryKey: ["reports", "attendance-range", startDate, endDate],
    queryFn: () => fetchAttendanceRange(startDate, endDate),
  });

  const usersQuery = useQuery({
    queryKey: ["reports", "active-users"],
    queryFn: fetchActiveUsers,
  });

  const usersById = useMemo(
    () => new Map((usersQuery.data ?? []).map((u) => [u.id, u])),
    [usersQuery.data],
  );

  const rows = attendanceQuery.data ?? [];
  const summary = summarizeByStatus(rows);
  const chartData = (Object.keys(summary) as AttendanceStatus[]).map((status) => ({
    status: STATUS_LABEL[status],
    jumlah: summary[status],
    fill: STATUS_CHART_COLOR[status],
  }));

  const allReportRows = buildReportRows(rows, usersById);
  const reportRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allReportRows;
    return allReportRows.filter((r) => r.nama.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReportRows, search]);
  const title = `Rekap Absensi ${startDate} s.d. ${endDate}`;
  // Export ambil reportRows yang sudah kefilter search (biar konsisten sama
  // yang kelihatan di layar) — pagination di bawah cuma buat tabel di layar.
  const { page, setPage, pageCount, pageRows, totalItems, pageSize } = usePagination(reportRows, 5);

  return (
    <AppShell title="Rekap & Export Laporan">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  preset === p.key
                    ? "bg-brand-700 text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset("custom")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                preset === "custom"
                  ? "bg-brand-700 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Custom
            </button>
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama karyawan..."
            className="w-full sm:w-56"
          />

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => exportAttendanceExcel(reportRows, `${title}.xlsx`, title)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportAttendancePdf(reportRows, `${title}.pdf`, title)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(summary) as AttendanceStatus[]).map((status) => (
            <div key={status} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}>
                {STATUS_LABEL[status]}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary[status]}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Distribusi Status</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="jumlah" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Divisi</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Tanggal</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Jam Masuk</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Jam Pulang</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(attendanceQuery.isLoading || usersQuery.isLoading) && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Memuat...
                  </td>
                </tr>
              )}
              {totalItems === 0 && !attendanceQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Tidak ada data pada periode ini.
                  </td>
                </tr>
              )}
              {pageRows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-slate-900">{r.nama}</td>
                  <td className="px-4 py-3 text-slate-700">{r.divisi ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{r.tanggal}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.jam_masuk
                      ? new Date(r.jam_masuk).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.jam_pulang
                      ? new Date(r.jam_pulang).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
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
      </div>
    </AppShell>
  );
}
