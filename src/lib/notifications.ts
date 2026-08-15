import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const READ_RETENTION_MS = 60 * 60 * 1000; // 1 jam

// Notifikasi yang belum dibaca selalu tampil (berapapun umurnya). Notifikasi
// yang sudah dibaca otomatis hilang dari daftar 1 jam setelah dibuat — beda
// dengan audit_logs yang memang permanen dan tidak pernah dihapus/disaring.
// Baris di database tidak dihapus, cuma tidak ikut kebawa query ini lagi.
export async function fetchNotifications(userId: string, limit = 20) {
  const cutoff = new Date(Date.now() - READ_RETENTION_MS).toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .or(`is_read.eq.false,created_at.gt.${cutoff}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}
