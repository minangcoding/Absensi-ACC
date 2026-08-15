// Edge Function: clock-in
// Absen masuk. Memvalidasi geofencing & jam kerja di server (bukan di
// browser) supaya tidak bisa dicurangi, lalu menulis baris `attendances`
// memakai service role key (bypass RLS by design — lihat 0001_init_schema.sql).
//
// Body (JSON): { latitude: number, longitude: number, photo: string }
//   photo = data URL base64, contoh: "data:image/jpeg;base64,/9j/4AAQ..."

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

// Jarak antara dua titik koordinat (meter), rumus Haversine.
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function base64ToBytes(dataUrlOrBase64: string): Uint8Array {
  const base64 = dataUrlOrBase64.includes(",")
    ? dataUrlOrBase64.split(",")[1]
    : dataUrlOrBase64;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Server Edge Function jalan di UTC, tapi semua kantor ada di Indonesia
// (WIB). Semua perhitungan tanggal & jam kerja HARUS lewat helper ini,
// bukan Date native (new Date().toISOString()/setHours ambigu timezone).
const JAKARTA_TZ = "Asia/Jakarta";

function jakartaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JAKARTA_TZ }).format(date);
}

function jakartaMinutesOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
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
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => null);
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    const photo: string | undefined = body?.photo;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !photo) {
      return jsonResponse({ error: "latitude, longitude, dan photo wajib diisi" }, 400);
    }

    // Pastikan profil aktif
    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("id, status_aktif")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return jsonResponse({ error: "Profil user tidak ditemukan" }, 404);
    }
    if (!profile.status_aktif) {
      return jsonResponse({ error: "Akun Anda tidak aktif. Hubungi Admin." }, 403);
    }

    // Cek sudah absen masuk hari ini atau belum
    const today = jakartaDateString(new Date());
    const { data: existing } = await admin
      .from("attendances")
      .select("id, jam_masuk")
      .eq("user_id", user.id)
      .eq("tanggal", today)
      .maybeSingle();

    if (existing?.jam_masuk) {
      return jsonResponse({ error: "Anda sudah absen masuk hari ini" }, 409);
    }

    // Cari kantor terdekat dalam radius geofence
    const { data: offices, error: officesError } = await admin
      .from("offices")
      .select("id, nama_kantor, latitude, longitude, radius_meter");

    if (officesError || !offices || offices.length === 0) {
      return jsonResponse({ error: "Lokasi kantor belum diatur. Hubungi Admin." }, 400);
    }

    let nearestOffice: (typeof offices)[number] | null = null;
    let nearestDistance = Infinity;
    for (const office of offices) {
      const d = distanceMeters(
        latitude,
        longitude,
        Number(office.latitude),
        Number(office.longitude),
      );
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestOffice = office;
      }
    }

    if (!nearestOffice || nearestDistance > nearestOffice.radius_meter) {
      return jsonResponse(
        {
          error: `Anda di luar radius kantor (${nearestOffice?.nama_kantor ?? "kantor"}). Jarak ${Math.round(
            nearestDistance,
          )}m, radius maksimal ${nearestOffice?.radius_meter ?? 0}m.`,
        },
        400,
      );
    }

    // Ambil jadwal kerja (Fase 2: asumsi satu shift berlaku untuk semua;
    // penugasan shift per-user/kantor dikembangkan di Fase 5 Admin Panel)
    const { data: schedule, error: scheduleError } = await admin
      .from("work_schedules")
      .select("jam_masuk_standar, toleransi_telat_menit")
      .limit(1)
      .maybeSingle();

    if (scheduleError || !schedule) {
      return jsonResponse({ error: "Jadwal kerja belum diatur. Hubungi Admin." }, 400);
    }

    const now = new Date();
    const [jamStd, menitStd] = schedule.jam_masuk_standar.split(":").map(Number);
    const batasTelatMinutes = jamStd * 60 + menitStd + (schedule.toleransi_telat_menit ?? 0);
    const nowMinutes = jakartaMinutesOfDay(now);

    const status = nowMinutes <= batasTelatMinutes ? "hadir" : "telat";

    // Upload foto selfie
    const photoBytes = base64ToBytes(photo);
    const photoPath = `${user.id}/${today}-masuk-${Date.now()}.jpg`;
    const { error: uploadError } = await admin.storage
      .from("attendance-photos")
      .upload(photoPath, photoBytes, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      return jsonResponse({ error: `Gagal upload foto: ${uploadError.message}` }, 500);
    }

    const { data: attendance, error: insertError } = await admin
      .from("attendances")
      .upsert(
        {
          user_id: user.id,
          office_id: nearestOffice.id,
          tanggal: today,
          jam_masuk: now.toISOString(),
          lokasi_masuk_lat: latitude,
          lokasi_masuk_lng: longitude,
          foto_masuk: photoPath,
          status,
        },
        { onConflict: "user_id,tanggal" },
      )
      .select()
      .single();

    if (insertError) {
      return jsonResponse({ error: `Gagal menyimpan absen: ${insertError.message}` }, 500);
    }

    return jsonResponse({ data: attendance }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
