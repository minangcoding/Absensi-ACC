import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  fetchMyLeaveRequests,
  getSignedAttachmentUrl,
  submitLeaveRequest,
  LEAVE_STATUS_COLOR,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
} from "@/lib/leave";
import { usePagination } from "@/lib/usePagination";

const schema = z
  .object({
    jenis: z.enum(["izin", "sakit", "cuti"]),
    tanggal_mulai: z.string().min(1, "Wajib diisi"),
    tanggal_selesai: z.string().min(1, "Wajib diisi"),
    alasan: z.string().min(5, "Alasan minimal 5 karakter"),
  })
  .refine((data) => data.tanggal_selesai >= data.tanggal_mulai, {
    message: "Tanggal selesai harus setelah atau sama dengan tanggal mulai",
    path: ["tanggal_selesai"],
  });

type FormValues = z.infer<typeof schema>;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PengajuanIzin() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { jenis: "izin", tanggal_mulai: "", tanggal_selesai: "", alasan: "" },
  });

  const historyQuery = useQuery({
    queryKey: ["leave-requests", "mine", profile?.id],
    queryFn: () => fetchMyLeaveRequests(profile!.id),
    enabled: !!profile,
  });

  const { page, setPage, pageCount, pageRows, totalItems, pageSize } = usePagination(
    historyQuery.data ?? [],
    5,
  );

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      submitLeaveRequest({
        userId: profile!.id,
        jenis: values.jenis,
        tanggalMulai: values.tanggal_mulai,
        tanggalSelesai: values.tanggal_selesai,
        alasan: values.alasan,
        file,
      }),
    onSuccess: () => {
      reset();
      setFile(null);
      setSubmitError(null);
      void queryClient.invalidateQueries({ queryKey: ["leave-requests", "mine", profile?.id] });
    },
    onError: (err: Error) => setSubmitError(err.message),
  });

  return (
    <AppShell title="Pengajuan Izin/Sakit/Cuti">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Ajukan Baru</h2>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Jenis</label>
              <select
                {...register("jenis")}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="izin">Izin</option>
                <option value="sakit">Sakit</option>
                <option value="cuti">Cuti</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tanggal Mulai</label>
                <input
                  type="date"
                  {...register("tanggal_mulai")}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {errors.tanggal_mulai && (
                  <p className="mt-1 text-xs text-red-600">{errors.tanggal_mulai.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tanggal Selesai</label>
                <input
                  type="date"
                  {...register("tanggal_selesai")}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {errors.tanggal_selesai && (
                  <p className="mt-1 text-xs text-red-600">{errors.tanggal_selesai.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Alasan</label>
              <textarea
                {...register("alasan")}
                rows={3}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {errors.alasan && <p className="mt-1 text-xs text-red-600">{errors.alasan.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Lampiran (opsional, mis. surat dokter)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-slate-600"
              />
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
            >
              {mutation.isPending ? "Mengirim..." : "Ajukan"}
            </button>
          </form>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Riwayat Pengajuan</h2>
          <div className="mt-4 space-y-3">
            {historyQuery.isLoading && <p className="text-sm text-slate-500">Memuat...</p>}
            {!historyQuery.isLoading && totalItems === 0 && (
              <p className="text-sm text-slate-500">Belum ada pengajuan.</p>
            )}
            {pageRows.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">{LEAVE_TYPE_LABEL[row.jenis]}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${LEAVE_STATUS_COLOR[row.status]}`}
                  >
                    {LEAVE_STATUS_LABEL[row.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
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
                {row.catatan_approval && (
                  <p className="mt-2 text-xs italic text-slate-500">
                    Catatan: {row.catatan_approval}
                  </p>
                )}
              </div>
            ))}
          </div>
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
