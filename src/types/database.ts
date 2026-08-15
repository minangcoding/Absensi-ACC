// Ditulis manual mengikuti supabase/migrations/*.sql.
// Setelah `supabase link` ke project, ganti dengan hasil generate resmi:
//   supabase gen types typescript --linked > src/types/database.ts

export type UserRole = "admin" | "hr" | "supervisor" | "karyawan";
export type AttendanceStatus = "hadir" | "telat" | "alpha" | "izin" | "sakit" | "cuti";
export type LeaveType = "izin" | "sakit" | "cuti";
export type LeaveStatus = "pending" | "disetujui" | "ditolak";
export type NotificationType = "reminder" | "approval" | "sistem";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nama: string;
          email: string;
          no_hp: string | null;
          role: UserRole;
          divisi: string | null;
          jabatan: string | null;
          supervisor_id: string | null;
          foto_profile: string | null;
          status_aktif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & {
          id: string;
          nama: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Relationships: [];
      };
      offices: {
        Row: {
          id: string;
          nama_kantor: string;
          latitude: number;
          longitude: number;
          radius_meter: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["offices"]["Row"]> & {
          nama_kantor: string;
          latitude: number;
          longitude: number;
          radius_meter: number;
        };
        Update: Partial<Database["public"]["Tables"]["offices"]["Row"]>;
        Relationships: [];
      };
      work_schedules: {
        Row: {
          id: string;
          nama_shift: string;
          jam_masuk_standar: string;
          jam_pulang_standar: string;
          toleransi_telat_menit: number;
        };
        Insert: Partial<Database["public"]["Tables"]["work_schedules"]["Row"]> & {
          nama_shift: string;
          jam_masuk_standar: string;
          jam_pulang_standar: string;
        };
        Update: Partial<Database["public"]["Tables"]["work_schedules"]["Row"]>;
        Relationships: [];
      };
      attendances: {
        Row: {
          id: string;
          user_id: string;
          office_id: string | null;
          tanggal: string;
          jam_masuk: string | null;
          jam_pulang: string | null;
          lokasi_masuk_lat: number | null;
          lokasi_masuk_lng: number | null;
          lokasi_pulang_lat: number | null;
          lokasi_pulang_lng: number | null;
          foto_masuk: string | null;
          foto_pulang: string | null;
          status: AttendanceStatus;
          keterangan: string | null;
          diedit_oleh: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendances"]["Row"]> & {
          user_id: string;
          tanggal: string;
          status: AttendanceStatus;
        };
        Update: Partial<Database["public"]["Tables"]["attendances"]["Row"]>;
        Relationships: [];
      };
      leave_requests: {
        Row: {
          id: string;
          user_id: string;
          jenis: LeaveType;
          tanggal_mulai: string;
          tanggal_selesai: string;
          alasan: string;
          file_lampiran: string | null;
          status: LeaveStatus;
          approved_by: string | null;
          approved_at: string | null;
          catatan_approval: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["leave_requests"]["Row"]> & {
          user_id: string;
          jenis: LeaveType;
          tanggal_mulai: string;
          tanggal_selesai: string;
          alasan: string;
        };
        Update: Partial<Database["public"]["Tables"]["leave_requests"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          judul: string;
          pesan: string;
          tipe: NotificationType;
          is_read: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          user_id: string;
          judul: string;
          pesan: string;
          tipe: NotificationType;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          aksi: string;
          target_table: string;
          target_id: string | null;
          detail: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          admin_id: string;
          aksi: string;
          target_table: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
