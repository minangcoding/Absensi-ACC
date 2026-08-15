// Edge Function: admin-create-user
// Dipakai oleh Admin Panel (Manajemen User) untuk membuat akun karyawan baru.
// Perlu service role key karena membuat baris auth.users butuh Admin API,
// yang tidak bisa dipanggil dari browser dengan anon key.
//
// Body (JSON): { nama, email, password, role, divisi?, jabatan?, no_hp?, supervisor_id? }

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

const VALID_ROLES = ["admin", "hr", "supervisor", "karyawan"];

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
      return jsonResponse({ error: "Hanya Admin yang boleh membuat user baru" }, 403);
    }

    const body = await req.json().catch(() => null);
    const nama: string | undefined = body?.nama?.trim();
    const email: string | undefined = body?.email?.trim();
    const password: string | undefined = body?.password;
    const role: string | undefined = body?.role;
    const divisi: string | null = body?.divisi || null;
    const jabatan: string | null = body?.jabatan || null;
    const no_hp: string | null = body?.no_hp || null;
    const supervisor_id: string | null = body?.supervisor_id || null;

    if (!nama || !email || !password || !role) {
      return jsonResponse({ error: "nama, email, password, dan role wajib diisi" }, 400);
    }
    if (password.length < 6) {
      return jsonResponse({ error: "Password minimal 6 karakter" }, 400);
    }
    if (!VALID_ROLES.includes(role)) {
      return jsonResponse({ error: "Role tidak valid" }, 400);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama, role },
    });

    if (createError || !created.user) {
      return jsonResponse({ error: createError?.message ?? "Gagal membuat akun" }, 400);
    }

    // Trigger handle_new_auth_user (0001_init_schema.sql) sudah bikin baris
    // public.users dari nama/role di metadata; lengkapi field sisanya di sini.
    const { data: profile, error: updateError } = await admin
      .from("users")
      .update({ divisi, jabatan, no_hp, supervisor_id })
      .eq("id", created.user.id)
      .select()
      .single();

    if (updateError) {
      return jsonResponse({ error: `Gagal melengkapi profil: ${updateError.message}` }, 500);
    }

    await admin.from("audit_logs").insert({
      admin_id: caller.id,
      aksi: "Tambah user baru",
      target_table: "users",
      target_id: created.user.id,
      detail: { nama, email, role },
    });

    return jsonResponse({ data: profile }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
