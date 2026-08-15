// Edge Function: admin-delete-user
// Hapus permanen akun user. Sengaja dibatasi: hanya boleh untuk akun yang
// BELUM punya riwayat absensi/pengajuan izin sama sekali (mis. salah bikin
// akun test), supaya data payroll/histori tidak pernah hilang tanpa sengaja.
// Untuk karyawan yang sudah pernah aktif, gunakan nonaktifkan (status_aktif)
// lewat updateUser biasa di Manajemen User — bukan endpoint ini.
//
// Body (JSON): { user_id: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await authClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await admin
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Hanya Admin yang boleh menghapus user" }, 403);
    }

    const body = await req.json().catch(() => null);
    const targetId: string | undefined = body?.user_id;

    if (!targetId) {
      return jsonResponse({ error: "user_id wajib diisi" }, 400);
    }
    if (targetId === caller.id) {
      return jsonResponse({ error: "Tidak bisa menghapus akun sendiri" }, 400);
    }

    const { data: target, error: targetError } = await admin
      .from("users")
      .select("id, nama, email, role")
      .eq("id", targetId)
      .single();

    if (targetError || !target) {
      return jsonResponse({ error: "User tidak ditemukan" }, 404);
    }

    if (target.role === "admin") {
      const { count: adminCount } = await admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((adminCount ?? 0) <= 1) {
        return jsonResponse({ error: "Tidak bisa menghapus satu-satunya akun Admin" }, 400);
      }
    }

    const { count: attendanceCount } = await admin
      .from("attendances")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetId);
    const { count: leaveCount } = await admin
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetId);

    if ((attendanceCount ?? 0) > 0 || (leaveCount ?? 0) > 0) {
      return jsonResponse(
        {
          error:
            "User ini sudah punya riwayat absensi/pengajuan izin, tidak bisa dihapus permanen. Gunakan tombol nonaktifkan saja supaya histori datanya tetap tersimpan.",
        },
        400,
      );
    }

    // Hapus dari auth.users — trigger cascade menghapus baris public.users
    // (foreign key ON DELETE CASCADE, lihat 0001_init_schema.sql).
    const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 500);
    }

    await admin.from("audit_logs").insert({
      admin_id: caller.id,
      aksi: "Hapus user",
      target_table: "users",
      target_id: targetId,
      detail: { nama: target.nama, email: target.email },
    });

    return jsonResponse({ data: { success: true } }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
