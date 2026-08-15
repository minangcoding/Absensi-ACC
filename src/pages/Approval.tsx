import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  decideLeaveRequest,
  fetchApprovalQueue,
  fetchUsersByIds,
  getSignedAttachmentUrl,
  LEAVE_STATUS_COLOR,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
} from "@/lib/leave";
import { usePagination } from "@/lib/usePagination";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function Approval() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [catatanById, setCatatanById] = useState<Record<string, string>>({});

  const queueQuery = useQuery({
    queryKey: ["leave-requests", "queue"],
    queryFn: fetchApprovalQueue,
  });

  const allRows = queueQuery.data ?? [];

  const userIds = useMemo(() => Array.from(new Set(allRows.map((r) => r.user_id))), [allRows]);

  const usersQuery = useQuery({
    queryKey: ["users", "by-ids", userIds],
    queryFn: () => fetchUsersByIds(userIds),
    enabled: userIds.length > 0,
  });

  const decideMutation = useMutation({
    mutationFn: decideLeaveRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leave-requests", "queue"] });
    },
  });

  // Pengajuan sendiri gak boleh disetujui/ditolak sendiri, jadi dibuang dari
  // antrian "Menunggu Persetujuan" — tapi tetap tampil di "Riwayat Keputusan"
  // begitu sudah diputuskan orang lain (mis. HR), supaya user bisa lihat status
  // pengajuan miliknya sendiri di halaman ini juga.
  const pending = allRows.filter((r) => r.status === "pending" && r.user_id !== profile?.id);
  const decided = allRows.filter((r) => r.status !== "pending");
  const {
    page: decidedPage,
    setPage: setDecidedPage,
    pageCount: decidedPageCount,
    pageRows: decidedPageRows,
    totalItems: decidedTotal,
    pageSize: decidedPageSize,
  } = usePagination(decided, 10);

  return (
    <AppShell title="Approval Izin">
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Menunggu Persetujuan</h2>
          <div className="mt-3 space-y-3">
            {queueQuery.isLoading && <p className="text-sm text-slate-500">Memuat...</p>}
            {!queueQuery.isLoading && pending.length === 0 && (
              <p className="text-sm text-slate-500">Tidak ada pengajuan yang menunggu.</p>
            )}
            {pending.map((row) => {
              const requester = usersQuery.data?.get(row.user_id);
              return (
                <div key={row.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-900">
                    {requester?.nama ?? "..."}{" "}
                    <span className="font-normal text-slate-500">· {LEAVE_TYPE_LABEL[row.jenis]}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(row.tanggal_mulai)} - {formatDate(row.tanggal_selesai)}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{row.alasan}</p>
                  {row.file_lampiran && (
                    <button
                      type="button"
                      onClick={async () => {
                        const url = await getSignedAttachmentUrl(row.file_lampiran);
                        if (url) window.open(url, "_blank");
                      }}
                      className="mt-2 text-xs text-brand-700 hover:underline"
                    >
                      Lihat Lampiran
                    </button>
                  )}

                  <input
                    type="text"
                    placeholder="Catatan (opsional)"
                    value={catatanById[row.id] ?? ""}
                    onChange={(e) => setCatatanById((s) => ({ ...s, [row.id]: e.target.value }))}
                    className="mt-3 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={decideMutation.isPending}
                      onClick={() =>
                        decideMutation.mutate({
                          id: row.id,
                          approverId: profile!.id,
                          status: "disetujui",
                          catatan: catatanById[row.id],
                        })
                      }
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      disabled={decideMutation.isPending}
                      onClick={() =>
                        decideMutation.mutate({
                          id: row.id,
                          approverId: profile!.id,
                          status: "ditolak",
                          catatan: catatanById[row.id],
                        })
                      }
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">Riwayat Keputusan</h2>
          <div className="mt-3 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Jenis</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decidedTotal === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Belum ada riwayat.
                    </td>
                  </tr>
                )}
                {decidedPageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-slate-900">
                      {usersQuery.data?.get(row.user_id)?.nama ?? "..."}
                      {row.user_id === profile?.id && (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">(Anda)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{LEAVE_TYPE_LABEL[row.jenis]}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(row.tanggal_mulai)} - {formatDate(row.tanggal_selesai)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${LEAVE_STATUS_COLOR[row.status]}`}
                      >
                        {LEAVE_STATUS_LABEL[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={decidedPage}
              pageCount={decidedPageCount}
              onPageChange={setDecidedPage}
              totalItems={decidedTotal}
              pageSize={decidedPageSize}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
