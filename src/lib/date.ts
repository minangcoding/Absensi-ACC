// Semua kantor di sistem ini ada di Indonesia (WIB) — dipakai supaya
// perhitungan "hari ini" konsisten dan tidak tergantung timezone
// browser/server yang menjalankan kode (server Edge Function jalan di UTC).
const JAKARTA_TZ = "Asia/Jakarta";

export function toJakartaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JAKARTA_TZ }).format(date);
}

export function todayJakarta(): string {
  return toJakartaDateString(new Date());
}
