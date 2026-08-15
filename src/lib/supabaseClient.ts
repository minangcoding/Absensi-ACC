import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase belum dikonfigurasi. Salin .env.example ke .env dan isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
