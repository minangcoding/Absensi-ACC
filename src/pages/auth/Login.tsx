import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Download, Eye, EyeOff, Loader2, Lock, Mail, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function Login() {
  const { session, profile, loading, signIn } = useAuth();
  const { canInstall, promptInstall } = useInstallPrompt();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nonaktif = (location.state as { nonaktif?: boolean } | null)?.nonaktif;

  if (!loading && session && profile) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/"} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(
        signInError === "Invalid login credentials"
          ? "Email atau password salah."
          : signInError,
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col items-center px-8 pb-6 pt-10 text-center">
          <img src="/logo_acc.png" alt="ACC" className="h-24 w-auto object-contain" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Sistem Absensi</h1>
          <p className="mt-1 text-sm text-slate-500">PT Astra Credit Companies</p>
        </div>

        <div className="px-8 pb-8">
          {nonaktif && (
            <div className="mb-5 flex gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
              <TriangleAlert className="h-4 w-4 flex-none translate-y-0.5" />
              <span>Akun Anda tidak aktif. Hubungi Admin.</span>
            </div>
          )}

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
                  autoComplete="email"
                  placeholder="nama@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 py-2 pl-9 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
              {submitting ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <Link
            to="/lupa-password"
            className="mt-5 block text-center text-sm font-medium text-brand-700 hover:underline"
          >
            Lupa password?
          </Link>

          {canInstall && (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Install Aplikasi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
