import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Field, inputClass } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAuth } from "@/lib/auth/AuthProvider";
import { STATUS_LABEL } from "@/lib/attendance";
import { addManualAttendance, correctAttendance, fetchAttendanceForCorrection } from "@/lib/admin";
import { fetchActiveUsers } from "@/lib/reports";
import { toJakartaDateString } from "@/lib/date";
import { usePagination } from "@/lib/usePagination";
import type { AttendanceStatus } from "@/types/database";

function toISODate(d: Date) {
  return toJakartaDateString(d);
}

const STATUS_OPTIONS: AttendanceStatus[] = ["hadir", "telat", "alpha", "izin", "sakit", "cuti"];

export function KoreksiAbsensi() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();
  const [startDate, setStartDate] = useState(toISODate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [endDate, setEndDate] = useState(toISODate(today));
  const [search, setSearch] = useState("");
  const [newRow, setNewRow] = useState({ user_id: "", tanggal: toISODate(today), status: "izin" as AttendanceStatus, keterangan: "" });

  const attendanceQuery = useQuery({
    queryKey: ["admin", "attendance-correction", startDate, endDate],
    queryFn: () => fetchAttendanceForCorrection(startDate, endDate),
  });

  const usersQuery = useQuery({ queryKey: ["admin", "active-users-correction"], queryFn: fetchActiveUsers });

  const usersById = useMemo(
    () => new Map((usersQuery.data ?? []).map((u) => [u.id, u])),
    [usersQuery.data],
  );

  const correctMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof correctAttendance>[2] }) =>
      correctAttendance(id, profile!.id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "attendance-correction"] });
    },
  });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendanceQuery.data ?? [];
    return (attendanceQuery.data ?? []).filter((a) =>
      (usersById.get(a.user_id)?.nama ?? "").toLowerCase().includes(q),
    );
  }, [attendanceQuery.data, usersById, search]);

  const { page, setPage, pageCount, pageRows, totalItems, pageSize } = usePagination(
    filteredRows,
    15,
  );

  const addMutation = useMutation({
    mutationFn: () =>
      addManualAttendance({
        user_id: newRow.user_id,
        tanggal: newRow.tanggal,
        status: newRow.status,
        keterangan: newRow.keterangan || undefined,
        adminId: profile!.id,
      }),
    onSuccess: () => {
      setNewRow({ user_id: "", tanggal: toISODate(today), status: "izin", keterangan: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin", "attendance-correction"] });
    },
  });

  return (
    <AppShell title="Koreksi Data Absensi">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div>
            <label className="text-xs text-slate-500">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-0.5 block rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-0.5 block rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama karyawan..."
            className="w-full sm:w-64"
          />
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Tambah Data Manual</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Buat baris absensi baru untuk karyawan yang lupa absen, dengan alasan.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate();
            }}
            className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
          >
            <Field label="Karyawan" htmlFor="manual_user_id" required>
              <select
                id="manual_user_id"
                required
                value={newRow.user_id}
                onChange={(e) => setNewRow((f) => ({ ...f, user_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Pilih karyawan</option>
                {usersQuery.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal" htmlFor="manual_tanggal" required>
              <input
                id="manual_tanggal"
                required
                type="date"
                value={newRow.tanggal}
                onChange={(e) => setNewRow((f) => ({ ...f, tanggal: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="Status" htmlFor="manual_status" required>
              <select
                id="manual_status"
                value={newRow.status}
                onChange={(e) => setNewRow((f) => ({ ...f, status: e.target.value as AttendanceStatus }))}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Keterangan" htmlFor="manual_keterangan" className="lg:col-span-1">
              <input
                id="manual_keterangan"
                placeholder="mis. Lupa absen, sudah dikonfirmasi"
                value={newRow.keterangan}
                onChange={(e) => setNewRow((f) => ({ ...f, keterangan: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
            >
              Tambah Data
            </button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Tanggal</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Keterangan</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Diedit Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Memuat...
                  </td>
                </tr>
              )}
              {totalItems === 0 && !attendanceQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Tidak ada data pada rentang tanggal ini.
                  </td>
                </tr>
              )}
              {pageRows.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-slate-900">{usersById.get(a.user_id)?.nama ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{a.tanggal}</td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={(e) =>
                        correctMutation.mutate({
                          id: a.id,
                          patch: { status: e.target.value as AttendanceStatus },
                        })
                      }
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={a.keterangan ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (a.keterangan ?? "")) {
                          correctMutation.mutate({ id: a.id, patch: { keterangan: e.target.value } });
                        }
                      }}
                      placeholder="Tambahkan keterangan..."
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {a.diedit_oleh ? (usersById.get(a.diedit_oleh)?.nama ?? "Admin") : "-"}
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
