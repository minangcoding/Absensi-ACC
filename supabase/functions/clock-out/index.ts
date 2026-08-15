// Edge Function: clock-out
// Absen pulang. Memvalidasi geofencing di server, lalu meng-update baris
// `attendances` milik user hari ini memakai service role key (bypass RLS).
//
// Body (JSON): { latitude: number, longitude: number, photo: string }

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

// Server jalan di UTC, kantor ada di Indonesia (WIB) — tanggal "hari ini"
// harus dihitung lewat zona waktu Jakarta, bukan Date native.
function jakartaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(date);
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

    const today = jakartaDateString(new Date());
    const { data: existing, error: existingError } = await admin
      .from("attendances")
      .select("id, jam_masuk, jam_pulang, office_id")
      .eq("user_id", user.id)
      .eq("tanggal", today)
      .maybeSingle();

    if (existingError || !existing || !existing.jam_masuk) {
      return jsonResponse({ error: "Anda belum absen masuk hari ini" }, 400);
    }
    if (existing.jam_pulang) {
      return jsonResponse({ error: "Anda sudah absen pulang hari ini" }, 409);
    }

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

    const now = new Date();
    const photoBytes = base64ToBytes(photo);
    const photoPath = `${user.id}/${today}-pulang-${Date.now()}.jpg`;
    const { error: uploadError } = await admin.storage
      .from("attendance-photos")
      .upload(photoPath, photoBytes, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      return jsonResponse({ error: `Gagal upload foto: ${uploadError.message}` }, 500);
    }

    const { data: attendance, error: updateError } = await admin
      .from("attendances")
      .update({
        jam_pulang: now.toISOString(),
        lokasi_pulang_lat: latitude,
        lokasi_pulang_lng: longitude,
        foto_pulang: photoPath,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) {
      return jsonResponse({ error: `Gagal menyimpan absen pulang: ${updateError.message}` }, 500);
    }

    return jsonResponse({ data: attendance }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
