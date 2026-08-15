import { supabase } from "@/lib/supabaseClient";
import type { Database, LeaveType } from "@/types/database";

export type LeaveRequest = Database["public"]["Tables"]["leave_requests"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  izin: "Izin",
  sakit: "Sakit",
  cuti: "Cuti",
};

export const LEAVE_STATUS_LABEL: Record<LeaveRequest["status"], string> = {
  pending: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const LEAVE_STATUS_COLOR: Record<LeaveRequest["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  disetujui: "bg-emerald-50 text-emerald-700",
  ditolak: "bg-red-50 text-red-700",
};

export async function fetchMyLeaveRequests(userId: string) {
  const { data, error } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Untuk supervisor, RLS otomatis membatasi hasil ke anak buahnya saja
// (kebijakan leave_requests_select_team); untuk hr, RLS mengizinkan semua
// baris (leave_requests_select_hr_admin). Baris milik diri sendiri juga ikut
// terbawa oleh leave_requests_select_self, makanya di halaman Approval hasil
// ini masih perlu difilter membuang user_id === diri sendiri.
export async function fetchApprovalQueue() {
  const { data, error } = await supabase
    .from("leave_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchUsersByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, UserRow>();
  const { data, error } = await supabase.from("users").select("*").in("id", ids);
  if (error) throw error;
  return new Map(data.map((u) => [u.id, u]));
}

interface SubmitLeavePayload {
  userId: string;
  jenis: LeaveType;
  tanggalMulai: string;
  tanggalSelesai: string;
  alasan: string;
  file: File | null;
}

export async function submitLeaveRequest(payload: SubmitLeavePayload) {
  let filePath: string | null = null;

  if (payload.file) {
    filePath = `${payload.userId}/${Date.now()}-${payload.file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("leave-attachments")
      .upload(filePath, payload.file);
    if (uploadError) throw uploadError;
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      user_id: payload.userId,
      jenis: payload.jenis,
      tanggal_mulai: payload.tanggalMulai,
      tanggal_selesai: payload.tanggalSelesai,
      alasan: payload.alasan,
      file_lampiran: filePath,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

interface DecidePayload {
  id: string;
  approverId: string;
  status: "disetujui" | "ditolak";
  catatan?: string;
}

export async function decideLeaveRequest(payload: DecidePayload) {
  const { data, error } = await supabase
    .from("leave_requests")
    .update({
      status: payload.status,
      approved_by: payload.approverId,
      approved_at: new Date().toISOString(),
      catatan_approval: payload.catatan || null,
    })
    .eq("id", payload.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSignedAttachmentUrl(path: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("leave-attachments")
    .createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
