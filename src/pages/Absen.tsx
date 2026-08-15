import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { CameraCapture } from "@/components/attendance/CameraCapture";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useGeolocation } from "@/hooks/useGeolocation";
import { clockIn, clockOut, fetchTodayAttendance, STATUS_LABEL } from "@/lib/attendance";

function formatTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function Absen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const geolocation = useGeolocation();
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const todayQuery = useQuery({
    queryKey: ["attendance", "today", profile?.id],
    queryFn: () => fetchTodayAttendance(profile!.id),
    enabled: !!profile,
  });

  const mode: "masuk" | "pulang" | "selesai" =
    !todayQuery.data?.jam_masuk ? "masuk" : !todayQuery.data?.jam_pulang ? "pulang" : "selesai";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!photo) throw new Error("Ambil foto selfie terlebih dahulu.");
      const { latitude, longitude } = await geolocation.request();
      const fn = mode === "masuk" ? clockIn : clockOut;
      return fn({ latitude, longitude, photo });
    },
    onSuccess: () => {
      setPhoto(null);
      setSubmitError(null);
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (err: Error) => {
      setSubmitError(err.message);
    },
  });

  return (
    <AppShell title="Absen">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>

          {todayQuery.isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Memuat status absen...</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Jam Masuk</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatTime(todayQuery.data?.jam_masuk ?? null)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Jam Pulang</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatTime(todayQuery.data?.jam_pulang ?? null)}
                </p>
              </div>
              {todayQuery.data?.status && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="text-sm font-medium text-slate-900">
                    {STATUS_LABEL[todayQuery.data.status]}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {mode === "selesai" ? (
          <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-700">Absen hari ini sudah lengkap. Sampai jumpa besok!</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Absen {mode === "masuk" ? "Masuk" : "Pulang"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ambil foto selfie, pastikan lokasi Anda di dalam area kantor.
            </p>

            <div className="mt-4">
              <CameraCapture photo={photo} onCapture={setPhoto} onRetake={() => setPhoto(null)} />
            </div>

            {(geolocation.error || submitError) && (
              <p className="mt-3 text-sm text-red-600">{geolocation.error ?? submitError}</p>
            )}

            <button
              type="button"
              disabled={!photo || mutation.isPending}
              onClick={() => {
                setSubmitError(null);
                mutation.mutate();
              }}
              className="mt-4 w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
            >
              {mutation.isPending
                ? "Memproses..."
                : `Absen ${mode === "masuk" ? "Masuk" : "Pulang"} Sekarang`}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
