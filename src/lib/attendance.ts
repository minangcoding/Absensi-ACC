import { supabase } from "@/lib/supabaseClient";
import { todayJakarta } from "@/lib/date";
import type { Database } from "@/types/database";

export type Attendance = Database["public"]["Tables"]["attendances"]["Row"];

export async function fetchTodayAttendance(userId: string) {
  const today = todayJakarta();
  const { data, error } = await supabase
    .from("attendances")
    .select("*")
    .eq("user_id", userId)
    .eq("tanggal", today)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchAttendanceHistory(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from("attendances")
    .select("*")
    .eq("user_id", userId)
    .order("tanggal", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

interface ClockPayload {
  latitude: number;
  longitude: number;
  photo: string;
}

async function invokeAttendanceFn(fn: "clock-in" | "clock-out", payload: ClockPayload) {
  const { data, error } = await supabase.functions.invoke<{ data?: Attendance; error?: string }>(
    fn,
    { body: payload },
  );

  if (error) {
    // Untuk status non-2xx, supabase-js melempar FunctionsHttpError dan `data`
    // bernilai null — body JSON error kustom kita ada di error.context (Response).
    let message = error.message;
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = await context.clone().json();
        if (body?.error) message = body.error;
      } catch {
        // biarkan message dari error.message
      }
    }
    throw new Error(message);
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  if (!data?.data) {
    throw new Error("Respons tidak valid dari server.");
  }
  return data.data;
}

export function clockIn(payload: ClockPayload) {
  return invokeAttendanceFn("clock-in", payload);
}

export function clockOut(payload: ClockPayload) {
  return invokeAttendanceFn("clock-out", payload);
}

export async function getSignedPhotoUrl(path: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("attendance-photos")
    .createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}

export const STATUS_LABEL: Record<Attendance["status"], string> = {
  hadir: "Hadir",
  telat: "Telat",
  alpha: "Alpha",
  izin: "Izin",
  sakit: "Sakit",
  cuti: "Cuti",
};

export const STATUS_COLOR: Record<Attendance["status"], string> = {
  hadir: "bg-emerald-50 text-emerald-700",
  telat: "bg-amber-50 text-amber-700",
  alpha: "bg-red-50 text-red-700",
  izin: "bg-sky-50 text-sky-700",
  sakit: "bg-violet-50 text-violet-700",
  cuti: "bg-slate-100 text-slate-700",
};
