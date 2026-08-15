import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Field, inputClass } from "@/components/ui/Field";
import {
  createOffice,
  createWorkSchedule,
  deleteOffice,
  deleteWorkSchedule,
  fetchOffices,
  fetchWorkSchedules,
} from "@/lib/admin";

const EMPTY_OFFICE = { nama_kantor: "", latitude: "", longitude: "", radius_meter: "150" };
const EMPTY_SHIFT = {
  nama_shift: "",
  jam_masuk_standar: "08:00",
  jam_pulang_standar: "17:00",
  toleransi_telat_menit: "15",
};

export function KelolaLokasi() {
  const queryClient = useQueryClient();
  const [officeForm, setOfficeForm] = useState(EMPTY_OFFICE);
  const [shiftForm, setShiftForm] = useState(EMPTY_SHIFT);

  const officesQuery = useQuery({ queryKey: ["admin", "offices"], queryFn: fetchOffices });
  const schedulesQuery = useQuery({ queryKey: ["admin", "work-schedules"], queryFn: fetchWorkSchedules });

  const createOfficeMutation = useMutation({
    mutationFn: () =>
      createOffice({
        nama_kantor: officeForm.nama_kantor,
        latitude: Number(officeForm.latitude),
        longitude: Number(officeForm.longitude),
        radius_meter: Number(officeForm.radius_meter),
      }),
    onSuccess: () => {
      setOfficeForm(EMPTY_OFFICE);
      void queryClient.invalidateQueries({ queryKey: ["admin", "offices"] });
    },
  });

  const deleteOfficeMutation = useMutation({
    mutationFn: deleteOffice,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "offices"] }),
  });

  const createShiftMutation = useMutation({
    mutationFn: () =>
      createWorkSchedule({
        nama_shift: shiftForm.nama_shift,
        jam_masuk_standar: shiftForm.jam_masuk_standar,
        jam_pulang_standar: shiftForm.jam_pulang_standar,
        toleransi_telat_menit: Number(shiftForm.toleransi_telat_menit),
      }),
    onSuccess: () => {
      setShiftForm(EMPTY_SHIFT);
      void queryClient.invalidateQueries({ queryKey: ["admin", "work-schedules"] });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: deleteWorkSchedule,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "work-schedules"] }),
  });

  return (
    <AppShell title="Kelola Lokasi Kantor & Jam Kerja">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Tambah Lokasi Kantor</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Titik koordinat &amp; radius ini dipakai untuk validasi geofencing saat karyawan absen.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createOfficeMutation.mutate();
              }}
              className="mt-3 space-y-3"
            >
              <Field label="Nama Kantor" htmlFor="nama_kantor" required>
                <input
                  id="nama_kantor"
                  required
                  placeholder="mis. Kantor ACC - Telemarketing"
                  value={officeForm.nama_kantor}
                  onChange={(e) => setOfficeForm((f) => ({ ...f, nama_kantor: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude" htmlFor="latitude" required>
                  <input
                    id="latitude"
                    required
                    type="number"
                    step="any"
                    placeholder="-6.200000"
                    value={officeForm.latitude}
                    onChange={(e) => setOfficeForm((f) => ({ ...f, latitude: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Longitude" htmlFor="longitude" required>
                  <input
                    id="longitude"
                    required
                    type="number"
                    step="any"
                    placeholder="106.816666"
                    value={officeForm.longitude}
                    onChange={(e) => setOfficeForm((f) => ({ ...f, longitude: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field
                label="Radius Toleransi Absen"
                htmlFor="radius_meter"
                required
                hint="Jarak maksimal (meter) dari titik koordinat di atas supaya absen dianggap valid."
              >
                <div className="relative">
                  <input
                    id="radius_meter"
                    required
                    type="number"
                    value={officeForm.radius_meter}
                    onChange={(e) => setOfficeForm((f) => ({ ...f, radius_meter: e.target.value }))}
                    className={`${inputClass} pr-12`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                    meter
                  </span>
                </div>
              </Field>
              <button
                type="submit"
                disabled={createOfficeMutation.isPending}
                className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
              >
                Tambah Kantor
              </button>
            </form>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Nama</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Koordinat</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Radius</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officesQuery.data?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                      Belum ada lokasi kantor.
                    </td>
                  </tr>
                )}
                {officesQuery.data?.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2 text-slate-900">{o.nama_kantor}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {o.latitude}, {o.longitude}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{o.radius_meter}m</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteOfficeMutation.mutate(o.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Tambah Jam Kerja / Shift</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Dipakai untuk menentukan status Hadir vs Telat saat karyawan absen masuk.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createShiftMutation.mutate();
              }}
              className="mt-3 space-y-3"
            >
              <Field label="Nama Shift" htmlFor="nama_shift" required>
                <input
                  id="nama_shift"
                  required
                  placeholder="mis. Shift Reguler"
                  value={shiftForm.nama_shift}
                  onChange={(e) => setShiftForm((f) => ({ ...f, nama_shift: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jam Masuk" htmlFor="jam_masuk_standar" required>
                  <input
                    id="jam_masuk_standar"
                    required
                    type="time"
                    value={shiftForm.jam_masuk_standar}
                    onChange={(e) => setShiftForm((f) => ({ ...f, jam_masuk_standar: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Jam Pulang" htmlFor="jam_pulang_standar" required>
                  <input
                    id="jam_pulang_standar"
                    required
                    type="time"
                    value={shiftForm.jam_pulang_standar}
                    onChange={(e) => setShiftForm((f) => ({ ...f, jam_pulang_standar: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field
                label="Toleransi Telat"
                htmlFor="toleransi_telat_menit"
                required
                hint="Batas menit setelah jam masuk sebelum status otomatis jadi 'Telat'."
              >
                <div className="relative">
                  <input
                    id="toleransi_telat_menit"
                    required
                    type="number"
                    value={shiftForm.toleransi_telat_menit}
                    onChange={(e) =>
                      setShiftForm((f) => ({ ...f, toleransi_telat_menit: e.target.value }))
                    }
                    className={`${inputClass} pr-14`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                    menit
                  </span>
                </div>
              </Field>
              <button
                type="submit"
                disabled={createShiftMutation.isPending}
                className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
              >
                Tambah Shift
              </button>
            </form>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Shift</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Jam</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Toleransi</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedulesQuery.data?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                      Belum ada jadwal kerja.
                    </td>
                  </tr>
                )}
                {schedulesQuery.data?.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-slate-900">{s.nama_shift}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {s.jam_masuk_standar.slice(0, 5)} - {s.jam_pulang_standar.slice(0, 5)}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{s.toleransi_telat_menit} menit</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteShiftMutation.mutate(s.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
