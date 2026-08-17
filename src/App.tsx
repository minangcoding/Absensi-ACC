import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { Login } from "@/pages/auth/Login";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { Dashboard } from "@/pages/Dashboard";
import { Absen } from "@/pages/Absen";
import { RiwayatAbsensi } from "@/pages/RiwayatAbsensi";
import { PengajuanIzin } from "@/pages/PengajuanIzin";
import { Approval } from "@/pages/Approval";
import { Profil } from "@/pages/Profil";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";

// Lazy: halaman-halaman ini cuma dipakai HR/Admin, jadi tidak perlu ikut ke
// bundle utama yang didownload semua role.
const Rekap = lazy(() => import("@/pages/Rekap").then((m) => ({ default: m.Rekap })));
const ManajemenUser = lazy(() =>
  import("@/pages/admin/ManajemenUser").then((m) => ({ default: m.ManajemenUser })),
);
const KelolaLokasi = lazy(() =>
  import("@/pages/admin/KelolaLokasi").then((m) => ({ default: m.KelolaLokasi })),
);
const KoreksiAbsensi = lazy(() =>
  import("@/pages/admin/KoreksiAbsensi").then((m) => ({ default: m.KoreksiAbsensi })),
);
const AuditLog = lazy(() => import("@/pages/admin/AuditLog").then((m) => ({ default: m.AuditLog })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default React Query: staleTime 0 + refetchOnWindowFocus true berarti
      // SEMUA query fetch ulang setiap kali tab balik fokus, walau baru aja
      // dibuka — kerasa kayak halaman ke-refresh terus. Data dianggap masih
      // fresh selama 30 detik, jadi gak double-fetch tiap gonta-ganti tab.
      staleTime: 30_000,
    },
  },
});

function PageFallback() {
  return <div className="flex h-screen items-center justify-center text-slate-500">Memuat...</div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/lupa-password" element={<ForgotPassword />} />

            {/* Semua role wajib absen (PRD §2) — termasuk Admin, jadi rute ini
                dibuka untuk semua role, bukan cuma karyawan/supervisor/hr. */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["karyawan", "supervisor", "hr", "admin"]} />
              }
            >
              <Route path="/absen" element={<Absen />} />
              <Route path="/riwayat" element={<RiwayatAbsensi />} />
              <Route path="/pengajuan-izin" element={<PengajuanIzin />} />
              <Route path="/profil" element={<Profil />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["karyawan", "supervisor", "hr"]} />}>
              <Route path="/" element={<Dashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["supervisor", "hr"]} />}>
              <Route path="/approval" element={<Approval />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["hr"]} />}>
              <Route path="/rekap" element={<Rekap />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<ManajemenUser />} />
              <Route path="/admin/lokasi" element={<KelolaLokasi />} />
              <Route path="/admin/koreksi-absensi" element={<KoreksiAbsensi />} />
              <Route path="/admin/audit-log" element={<AuditLog />} />
              <Route path="/admin/rekap" element={<Rekap />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
