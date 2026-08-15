import { supabase } from "@/lib/supabaseClient";

// Cuma nama & no_hp yang boleh diubah user sendiri — field lain (role,
// divisi, jabatan, supervisor_id, status_aktif) sengaja diblokir oleh
// trigger guard_users_self_update (0001_init_schema.sql), cuma Admin yang
// boleh mengubahnya lewat Manajemen User.
export async function updateOwnProfile(userId: string, patch: { nama: string; no_hp: string | null }) {
  const { data, error } = await supabase.from("users").update(patch).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
