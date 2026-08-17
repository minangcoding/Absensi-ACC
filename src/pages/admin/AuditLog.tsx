import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { fetchAllUsers, fetchAuditLogs } from "@/lib/admin";
import { usePagination } from "@/lib/usePagination";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLog() {
  const [search, setSearch] = useState("");

  const logsQuery = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: () => fetchAuditLogs(500),
  });
  const usersQuery = useQuery({ queryKey: ["admin", "users-for-audit"], queryFn: fetchAllUsers });

  const usersById = useMemo(
    () => new Map((usersQuery.data ?? []).map((u) => [u.id, u])),
    [usersQuery.data],
  );

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logsQuery.data ?? [];
    return (logsQuery.data ?? []).filter((log) => {
      const adminName = usersById.get(log.admin_id)?.nama ?? "";
      return (
        adminName.toLowerCase().includes(q) ||
        log.aksi.toLowerCase().includes(q) ||
        log.target_table.toLowerCase().includes(q)
      );
    });
  }, [logsQuery.data, usersById, search]);

  const { page, setPage, pageCount, pageRows, totalItems, pageSize } = usePagination(
    filteredLogs,
    5,
  );

  return (
    <AppShell title="Audit Log">
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari admin, aksi, atau target..."
          className="w-full sm:w-72"
        />

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Waktu</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Admin</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Aksi</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Target</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logsQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Memuat...
                  </td>
                </tr>
              )}
              {totalItems === 0 && !logsQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    {search ? "Tidak ada hasil yang cocok." : "Belum ada aktivitas."}
                  </td>
                </tr>
              )}
              {pageRows.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {usersById.get(log.admin_id)?.nama ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.aksi}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {log.target_table}
                    {log.target_id ? ` #${log.target_id.slice(0, 8)}` : ""}
                  </td>
                  <td
                    className="px-4 py-3 max-w-xs truncate text-xs text-slate-500"
                    title={JSON.stringify(log.detail)}
                  >
                    {log.detail ? JSON.stringify(log.detail) : "-"}
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
