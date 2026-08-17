import { useState } from "react";
import { Download, MonitorSmartphone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface InstallButtonProps {
  variant?: "primary" | "subtle";
}

export function InstallButton({ variant = "subtle" }: InstallButtonProps) {
  const { isStandalone, canPromptInstall, showManualInstructions, promptInstall } =
    useInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);

  if (isStandalone) return null;

  const className =
    variant === "primary"
      ? "flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      : "hidden items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 sm:inline-flex";

  return (
    <>
      {canPromptInstall && (
        <button type="button" onClick={() => void promptInstall()} className={className}>
          <Download className="h-4 w-4" />
          Install {variant === "primary" ? "Aplikasi" : "App"}
        </button>
      )}

      {showManualInstructions && (
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className={
            variant === "primary"
              ? "mt-1 block w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 hover:underline"
              : "hidden text-xs font-medium text-slate-400 hover:text-slate-600 hover:underline sm:inline"
          }
        >
          Cara install manual
        </button>
      )}

      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Cara Install Aplikasi"
        description="Tambahkan Sistem Absensi ke layar utama supaya bisa dibuka seperti aplikasi biasa."
      >
        <div className="space-y-4 text-sm text-slate-700">
          <div className="flex gap-3">
            <MonitorSmartphone className="h-5 w-5 flex-none text-brand-600" />
            <div>
              <p className="font-medium text-slate-900">Chrome / Edge (Android & Desktop)</p>
              <p className="mt-1 text-slate-500">
                Klik ikon install di address bar (gambar layar + panah), atau menu{" "}
                <span className="font-medium">⋮ → "Install Sistem Absensi..."</span>.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <MonitorSmartphone className="h-5 w-5 flex-none text-brand-600" />
            <div>
              <p className="font-medium text-slate-900">Safari (iPhone/iPad)</p>
              <p className="mt-1 text-slate-500">
                Tap ikon <span className="font-medium">Share</span> (kotak dengan panah ke atas) →{" "}
                <span className="font-medium">"Add to Home Screen"</span>.
              </p>
            </div>
          </div>
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Kalau opsi install tidak muncul, kemungkinan aplikasi sudah pernah diinstall di
            browser ini — cek menu <span className="font-medium">⋮ → Apps</span> atau layar utama
            perangkat kamu.
          </p>
        </div>
      </Modal>
    </>
  );
}
