import { supabase } from "@/lib/supabaseClient";
import type { Attendance } from "@/lib/attendance";
import { downloadBlob } from "@/lib/download";
import { ROLE_LABEL } from "@/lib/roles";
import type { Database, UserRole } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type OfficeRow = Database["public"]["Tables"]["offices"]["Row"];
type WorkScheduleRow = Database["public"]["Tables"]["work_schedules"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

// -------------------- Manajemen User --------------------

export async function fetchAllUsers() {
  const { data, error } = await supabase.from("users").select("*").order("nama", { ascending: true });
  if (error) throw error;
  return data;
}

export async function exportUsersExcel(users: UserRow[], filename: string, title: string) {
  // Import dinamis: exceljs cukup berat, hanya dimuat saat Admin benar-benar
  // klik Export.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Daftar Karyawan");

  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  sheet.getRow(3).values = ["Nama", "Email", "Role", "Divisi", "Jabatan", "No. HP", "Status"];
  sheet.getRow(3).font = { bold: true };
  sheet.columns = [
    { key: "nama", width: 24 },
    { key: "email", width: 26 },
    { key: "role", width: 12 },
    { key: "divisi", width: 20 },
    { key: "jabatan", width: 16 },
    { key: "no_hp", width: 16 },
    { key: "status", width: 10 },
  ];

  users.forEach((u, i) => {
    sheet.getRow(4 + i).values = [
      u.nama,
      u.email,
      ROLE_LABEL[u.role],
      u.divisi ?? "-",
      u.jabatan ?? "-",
      u.no_hp ?? "-",
      u.status_aktif ? "Aktif" : "Nonaktif",
    ];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename,
  );
}

export async function exportUsersPdf(users: UserRow[], filename: string, title: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 15);

  autoTable(doc, {
    startY: 22,
    head: [["Nama", "Email", "Role", "Divisi", "Jabatan", "No. HP", "Status"]],
    body: users.map((u) => [
      u.nama,
      u.email,
      ROLE_LABEL[u.role],
      u.divisi ?? "-",
      u.jabatan ?? "-",
      u.no_hp ?? "-",
      u.status_aktif ? "Aktif" : "Nonaktif",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 114, 188] },
  });

  doc.save(filename);
}

interface CreateUserPayload {
  nama: string;
  email: string;
  password: string;
  role: UserRole;
  divisi?: string;
  jabatan?: string;
  no_hp?: string;
  supervisor_id?: string;
}

export async function createUser(payload: CreateUserPayload) {
  const { data, error } = await supabase.functions.invoke<{ data?: UserRow; error?: string }>(
    "admin-create-user",
    { body: payload },
  );

  if (error) {
    throw new Error(await readFunctionError(error, error.message));
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.data) throw new Error("Respons tidak valid dari server.");
  return data.data;
}

export async function updateUser(id: string, patch: Partial<UserRow>) {
  const { data, error } = await supabase.from("users").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function readFunctionError(error: unknown, fallback: string) {
  let message = fallback;
  const context = (error as { context?: Response } | null)?.context;
  if (context) {
    try {
      const body = await context.clone().json();
      if (body?.error) message = body.error;
    } catch {
      // biarkan message dari fallback
    }
  }
  return message;
}

export async function deleteUser(id: string) {
  const { data, error } = await supabase.functions.invoke<{
    data?: { success: boolean };
    error?: string;
  }>("admin-delete-user", { body: { user_id: id } });

  if (error) {
    throw new Error(await readFunctionError(error, error.message));
  }
  if (data?.error) throw new Error(data.error);
}

// -------------------- Kelola Lokasi Kantor --------------------

export async function fetchOffices() {
  const { data, error } = await supabase.from("offices").select("*").order("nama_kantor");
  if (error) throw error;
  return data;
}

export async function createOffice(payload: Omit<OfficeRow, "id" | "created_at">) {
  const { data, error } = await supabase.from("offices").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateOffice(id: string, patch: Partial<OfficeRow>) {
  const { data, error } = await supabase.from("offices").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteOffice(id: string) {
  const { error } = await supabase.from("offices").delete().eq("id", id);
  if (error) throw error;
}

// -------------------- Kelola Jam Kerja --------------------

export async function fetchWorkSchedules() {
  const { data, error } = await supabase.from("work_schedules").select("*").order("nama_shift");
  if (error) throw error;
  return data;
}

export async function createWorkSchedule(payload: Omit<WorkScheduleRow, "id">) {
  const { data, error } = await supabase.from("work_schedules").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateWorkSchedule(id: string, patch: Partial<WorkScheduleRow>) {
  const { data, error } = await supabase
    .from("work_schedules")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkSchedule(id: string) {
  const { error } = await supabase.from("work_schedules").delete().eq("id", id);
  if (error) throw error;
}

// -------------------- Koreksi Data Absensi --------------------

export async function fetchAttendanceForCorrection(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("attendances")
    .select("*")
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: false });
  if (error) throw error;
  return data;
}

interface CorrectionPatch {
  status?: Attendance["status"];
  jam_masuk?: string | null;
  jam_pulang?: string | null;
  keterangan?: string | null;
}

export async function correctAttendance(id: string, adminId: string, patch: CorrectionPatch) {
  const { data, error } = await supabase
    .from("attendances")
    .update({ ...patch, diedit_oleh: adminId })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

interface NewAttendancePayload {
  user_id: string;
  tanggal: string;
  status: Attendance["status"];
  keterangan?: string;
  adminId: string;
}

export async function addManualAttendance(payload: NewAttendancePayload) {
  const { data, error } = await supabase
    .from("attendances")
    .insert({
      user_id: payload.user_id,
      tanggal: payload.tanggal,
      status: payload.status,
      keterangan: payload.keterangan ?? null,
      diedit_oleh: payload.adminId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// -------------------- Audit Log --------------------

export async function fetchAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export type { UserRow, OfficeRow, WorkScheduleRow, AuditLogRow };
