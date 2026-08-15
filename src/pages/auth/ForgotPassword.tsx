import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col items-center px-8 pb-6 pt-10 text-center">
          <img src="/logo_acc.png" alt="ACC" className="h-20 w-auto object-contain" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Lupa Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masukkan email Anda, kami kirim tautan reset password.
          </p>
        </div>

        <div className="px-8 pb-8">
          {sent ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              Jika email terdaftar, tautan reset password telah dikirim. Silakan cek inbox Anda.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="nama@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-900 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Mengirim..." : "Kirim Tautan Reset"}
              </button>
            </form>
          )}

          <Link
            to="/login"
            className="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke login
          </Link>
        </div>
      </div>
    </div>
  );
}
