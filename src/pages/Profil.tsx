import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Save } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Field, inputClass } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { updateOwnProfile, changePassword } from "@/lib/profile";
import { initials } from "@/lib/format";
import { ROLE_BADGE_COLOR, ROLE_LABEL } from "@/lib/roles";

export function Profil() {
  const { profile, refreshProfile } = useAuth();
  const [nama, setNama] = useState(profile?.nama ?? "");
  const [noHp, setNoHp] = useState(profile?.no_hp ?? "");
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const profileMutation = useMutation({
    mutationFn: () => updateOwnProfile(profile!.id, { nama, no_hp: noHp || null }),
    onSuccess: async () => {
      setProfileSuccess(true);
      await refreshProfile();
      setTimeout(() => setProfileSuccess(false), 3000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePassword(newPassword),
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (err: Error) => setPasswordError(err.message),
  });

  if (!profile) return null;

  return (
    <AppShell title="Profil Saya">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
            {initials(profile.nama)}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{profile.nama}</h2>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE_COLOR[profile.role]}`}
              >
                {ROLE_LABEL[profile.role]}
              </span>
              {profile.divisi && (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
                  Divisi: {profile.divisi}
                </span>
              )}
              {profile.jabatan && (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
                  {profile.jabatan}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Informasi Profil</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Role, divisi, jabatan, dan atasan hanya bisa diubah oleh Admin.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              profileMutation.mutate();
            }}
            className="mt-4 space-y-3"
          >
            <Field label="Nama Lengkap" htmlFor="nama" required>
              <input
                id="nama"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="No. HP" htmlFor="no_hp">
              <input
                id="no_hp"
                placeholder="08xxxxxxxxxx"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Email" htmlFor="email" hint="Hubungi Admin untuk mengubah email.">
              <input id="email" disabled value={profile.email} className={inputClass} />
            </Field>

            {profileSuccess && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Profil berhasil diperbarui.
              </p>
            )}

            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {profileMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Ganti Password</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPasswordError(null);
              if (newPassword.length < 6) {
                setPasswordError("Password minimal 6 karakter.");
                return;
              }
              if (newPassword !== confirmPassword) {
                setPasswordError("Konfirmasi password tidak sama.");
                return;
              }
              passwordMutation.mutate();
            }}
            className="mt-4 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Password Baru" htmlFor="new_password" required hint="Minimal 6 karakter">
                <input
                  id="new_password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Konfirmasi Password" htmlFor="confirm_password" required>
                <input
                  id="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            {passwordError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Password berhasil diubah.
              </p>
            )}

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />
              {passwordMutation.isPending ? "Menyimpan..." : "Ubah Password"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
