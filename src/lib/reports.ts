import { supabase } from "@/lib/supabaseClient";
import { todayJakarta } from "@/lib/date";
import { downloadBlob } from "@/lib/download";
import type { AttendanceStatus, Database } from "@/types/database";
import { STATUS_LABEL, type Attendance } from "@/lib/attendance";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function fetchAttendanceRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("attendances")
    .select("*")
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchTodayAttendanceAll() {
  const today = todayJakarta();
  const { data, error } = await supabase.from("attendances").select("*").eq("tanggal", today);
  if (error) throw error;
  return data;
}

export async function fetchActiveUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("status_aktif", true)
    .order("nama", { ascending: true });
  if (error) throw error;
  return data;
}

export function summarizeByStatus(rows: Attendance[]) {
  const counts: Record<AttendanceStatus, number> = {
    hadir: 0,
    telat: 0,
    alpha: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
  };
  for (const r of rows) counts[r.status]++;
  return counts;
}

export const STATUS_CHART_COLOR: Record<AttendanceStatus, string> = {
  hadir: "#059669",
  telat: "#d97706",
  alpha: "#dc2626",
  izin: "#0284c7",
  sakit: "#7c3aed",
  cuti: "#475569",
};

function formatTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

interface ReportRow {
  nama: string;
  divisi: string | null;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: AttendanceStatus;
}

export function buildReportRows(attendances: Attendance[], usersById: Map<string, UserRow>): ReportRow[] {
  return attendances.map((a) => {
    const user = usersById.get(a.user_id);
    return {
      nama: user?.nama ?? "-",
      divisi: user?.divisi ?? null,
      tanggal: a.tanggal,
      jam_masuk: a.jam_masuk,
      jam_pulang: a.jam_pulang,
      status: a.status,
    };
  });
}

export async function exportAttendanceExcel(rows: ReportRow[], filename: string, title: string) {
  // Import dinamis: exceljs cukup berat, hanya dimuat saat HR benar-benar
  // klik Export supaya tidak membengkakkan bundle awal untuk semua user.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Rekap Absensi");

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  sheet.getRow(3).values = ["Nama", "Divisi", "Tanggal", "Jam Masuk", "Jam Pulang", "Status"];
  sheet.getRow(3).font = { bold: true };
  sheet.columns = [
    { key: "nama", width: 24 },
    { key: "divisi", width: 20 },
    { key: "tanggal", width: 14 },
    { key: "jam_masuk", width: 12 },
    { key: "jam_pulang", width: 12 },
    { key: "status", width: 12 },
  ];

  rows.forEach((r, i) => {
    sheet.getRow(4 + i).values = [
      r.nama,
      r.divisi ?? "-",
      r.tanggal,
      formatTime(r.jam_masuk),
      formatTime(r.jam_pulang),
      STATUS_LABEL[r.status],
    ];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function exportAttendancePdf(rows: ReportRow[], filename: string, title: string) {
  // jspdf menyeret html2canvas + dompurify (berat) — import dinamis supaya
  // hanya dimuat saat tombol Export PDF diklik.
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 15);

  autoTable(doc, {
    startY: 22,
    head: [["Nama", "Divisi", "Tanggal", "Jam Masuk", "Jam Pulang", "Status"]],
    body: rows.map((r) => [
      r.nama,
      r.divisi ?? "-",
      r.tanggal,
      formatTime(r.jam_masuk),
      formatTime(r.jam_pulang),
      STATUS_LABEL[r.status],
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 114, 188] },
  });

  doc.save(filename);
}
