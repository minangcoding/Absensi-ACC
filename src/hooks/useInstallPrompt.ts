import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function checkStandalone() {
  if (typeof window === "undefined") return false;
  // display-mode: standalone -> Chrome/Edge/Android sudah diinstall.
  // navigator.standalone -> khusus Safari/iOS.
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Dukungan `beforeinstallprompt` terbatas ke Chrome/Edge/Android — Safari
// (termasuk iOS) tidak mengirim event ini sama sekali. Chrome juga cuma
// nembak event ini pada kondisi tertentu (belum pernah diinstall, belum
// baru saja di-dismiss, butuh beberapa detik setelah halaman kebuka) —
// itu wajar, bukan bug, jadi selalu sediakan `canPromptInstall=false` tapi
// `isStandalone=false` sebagai sinyal buat nampilin instruksi install manual.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(checkStandalone);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setIsStandalone(true);
    setDeferredPrompt(null);
  };

  return {
    isStandalone,
    canPromptInstall: !!deferredPrompt && !isStandalone,
    // Belum standalone tapi browser belum (atau gak akan pernah) nembak
    // beforeinstallprompt — di sinilah instruksi install manual ditampilkan.
    showManualInstructions: !isStandalone && !deferredPrompt,
    promptInstall,
  };
}
