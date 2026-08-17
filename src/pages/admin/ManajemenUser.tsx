import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Modal } from "@/components/ui/Modal";
import { Field, inputClass } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  createUser,
  deleteUser,
  exportUsersExcel,
  exportUsersPdf,
  fetchAllUsers,
  updateUser,
  type UserRow,
} from "@/lib/admin";
import { initials } from "@/lib/format";
import { usePagination } from "@/lib/usePagination";
import { ROLE_BADGE_COLOR, ROLE_LABEL } from "@/lib/roles";
import type { UserRole } from "@/types/database";

const ROLE_FILTERS: { value: UserRole | "semua"; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "karyawan", label: "Karyawan" },
  { value: "supervisor", label: "Supervisor" },
  { value: "hr", label: "HR" },
  { value: "admin", label: "Admin" },
];

interface FormState {
  nama: string;
  email: string;
  password: string;
  role: UserRole;
  divisi: string;
  jabatan: string;
  no_hp: string;
  supervisor_id: string;
}

const EMPTY_FORM: FormState = {
  nama: "",
  email: "",
  password: "",
  role: "karyawan",
  divisi: "",
  jabatan: "",
  no_hp: "",
  supervisor_id: "",
};

export function ManajemenUser() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "semua">("semua");

  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: fetchAllUsers });

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalMode("create");
  };

  const openEdit = (u: UserRow) => {
    setForm({
      nama: u.nama,
      email: u.email,
      password: "",
      role: u.role,
      divisi: u.divisi ?? "",
      jabatan: u.jabatan ?? "",
      no_hp: u.no_hp ?? "",
      supervisor_id: u.supervisor_id ?? "",
    });
    setEditingId(u.id);
    setFormError(null);
    setModalMode("edit");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createUser({
        nama: form.nama,
        email: form.email,
        password: form.password,
        role: form.role,
        divisi: form.divisi || undefined,
        jabatan: form.jabatan || undefined,
        no_hp: form.no_hp || undefined,
        supervisor_id: form.supervisor_id || undefined,
      }),
    onSuccess: () => {
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      updateUser(editingId!, {
        nama: form.nama,
        role: form.role,
        divisi: form.divisi || null,
        jabatan: form.jabatan || null,
        no_hp: form.no_hp || null,
        supervisor_id: form.supervisor_id || null,
      }),
    onSuccess: () => {
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<UserRow> }) => updateUser(id, patch),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      setDeleteTarget(null);
      setDeleteError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const users = usersQuery.data ?? [];
  const supervisorOptions = users.filter((u) => u.role === "supervisor" && u.id !== editingId);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === "semua" || u.role === roleFilter;
      const matchesSearch =
        q === "" ||
        u.nama.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.divisi ?? "").toLowerCase().includes(q) ||
        (u.jabatan ?? "").toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  const { page, setPage, pageCount, pageRows, totalItems, pageSize } = usePagination(
    filteredUsers,
    5,
  );

  const exportTitle = `Daftar Karyawan${roleFilter !== "semua" ? ` - ${ROLE_LABEL[roleFilter]}` : ""}`;

  return (
    <AppShell title="Manajemen User">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {users.length} akun terdaftar — kelola akses karyawan, supervisor, HR, dan admin di sini.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportUsersExcel(filteredUsers, `${exportTitle}.xlsx`, exportTitle)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileDown className="h-4 w-4" />
              Excel
            </button>
            <button
              type="button"
              onClick={() => exportUsersPdf(filteredUsers, `${exportTitle}.pdf`, exportTitle)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileDown className="h-4 w-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-900"
            >
              <Plus className="h-4 w-4" />
              Tambah User
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama, email, divisi, atau jabatan..."
            className="w-full sm:w-72"
          />
          <div className="flex flex-wrap gap-1">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRoleFilter(f.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  roleFilter === f.value
                    ? "bg-brand-700 text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {f.label}
                {f.value !== "semua" && (
                  <span className="ml-1 text-xs opacity-70">
                    ({users.filter((u) => u.role === f.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">User</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Role</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Divisi / Jabatan</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Atasan</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Memuat...
                  </td>
                </tr>
              )}
              {!usersQuery.isLoading && totalItems === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada user yang cocok dengan pencarian/filter ini.
                  </td>
                </tr>
              )}
              {pageRows.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                        {initials(u.nama)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{u.nama}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE_COLOR[u.role]}`}
                    >
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>{u.divisi ?? <span className="text-slate-400">Belum diisi</span>}</p>
                    {u.jabatan && <p className="text-xs text-slate-500">{u.jabatan}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {users.find((s) => s.id === u.supervisor_id)?.nama ?? (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        toggleActiveMutation.mutate({
                          id: u.id,
                          patch: { status_aktif: !u.status_aktif },
                        })
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${
                        u.status_aktif
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 ring-slate-500/20 hover:bg-slate-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${u.status_aktif ? "bg-emerald-500" : "bg-slate-400"}`}
                      />
                      {u.status_aktif ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        title="Edit user"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(u);
                        }}
                        title="Hapus user"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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

      <Modal
        open={modalMode !== null}
        onClose={closeModal}
        title={modalMode === "edit" ? "Edit User" : "Tambah User Baru"}
        description={
          modalMode === "edit"
            ? "Ubah data profil user. Email & password tidak bisa diubah di sini."
            : "Akun akan langsung aktif dan bisa dipakai login setelah disimpan."
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            if (modalMode === "edit") editMutation.mutate();
            else createMutation.mutate();
          }}
          className="space-y-5"
        >
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Informasi Akun
            </h3>
            <div className="mt-3 space-y-3">
              <Field label="Nama Lengkap" htmlFor="nama" required>
                <input
                  id="nama"
                  required
                  placeholder="mis. Andi Saputra"
                  value={form.nama}
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Email"
                  htmlFor="email"
                  required={modalMode === "create"}
                  hint={modalMode === "edit" ? "Email tidak bisa diubah dari sini." : undefined}
                >
                  <input
                    id="email"
                    required={modalMode === "create"}
                    disabled={modalMode === "edit"}
                    type="email"
                    placeholder="nama@acc.co.id"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                {modalMode === "create" && (
                  <Field label="Password" htmlFor="password" required hint="Minimal 6 karakter">
                    <input
                      id="password"
                      required
                      type="password"
                      minLength={6}
                      placeholder="••••••"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Informasi Pekerjaan
            </h3>
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Role" htmlFor="role" required>
                  <select
                    id="role"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                    className={inputClass}
                  >
                    <option value="karyawan">Karyawan</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>
                <Field label="No. HP" htmlFor="no_hp">
                  <input
                    id="no_hp"
                    placeholder="08xxxxxxxxxx"
                    value={form.no_hp}
                    onChange={(e) => setForm((f) => ({ ...f, no_hp: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Divisi" htmlFor="divisi">
                  <input
                    id="divisi"
                    placeholder="mis. Telemarketing Officer"
                    value={form.divisi}
                    onChange={(e) => setForm((f) => ({ ...f, divisi: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Jabatan" htmlFor="jabatan">
                  <input
                    id="jabatan"
                    placeholder="mis. Staff"
                    value={form.jabatan}
                    onChange={(e) => setForm((f) => ({ ...f, jabatan: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field
                label="Atasan Langsung (Supervisor)"
                htmlFor="supervisor_id"
                hint={
                  supervisorOptions.length === 0
                    ? "Belum ada akun dengan role Supervisor. Buat satu dulu (atau kosongkan ini) supaya nanti bisa dipilih sebagai atasan."
                    : "Dipakai untuk approval izin & rekap tim — pilih atasan langsung user ini, atau kosongkan jika tidak ada."
                }
              >
                <select
                  id="supervisor_id"
                  value={form.supervisor_id}
                  onChange={(e) => setForm((f) => ({ ...f, supervisor_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Tidak ada atasan langsung</option>
                  {supervisorOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || editMutation.isPending}
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
            >
              {createMutation.isPending || editMutation.isPending
                ? "Menyimpan..."
                : modalMode === "edit"
                  ? "Simpan Perubahan"
                  : "Simpan User Baru"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Hapus User"
        description={deleteTarget ? `${deleteTarget.nama} (${deleteTarget.email})` : undefined}
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg bg-amber-50 p-3">
            <TriangleAlert className="h-5 w-5 flex-none text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Aksi ini tidak bisa dibatalkan.</p>
              <p className="mt-1">
                Kalau user ini sudah pernah absen atau mengajukan izin, sistem akan menolak
                penghapusan supaya histori datanya tidak hilang — pakai tombol{" "}
                <span className="font-medium">Nonaktifkan</span> di tabel sebagai gantinya.
              </p>
            </div>
          </div>

          {deleteError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deleteMutation.isPending ? "Menghapus..." : "Hapus Permanen"}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
