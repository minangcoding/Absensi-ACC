import { useCallback, useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  photo: string | null;
  onCapture: (dataUrl: string) => void;
  onRetake: () => void;
}

export function CameraCapture({ photo, onCapture, onRetake }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch {
      setError("Tidak bisa mengakses kamera. Izinkan akses kamera untuk absen.");
    }
  }, []);

  useEffect(() => {
    if (!photo) {
      void startCamera();
    }
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopStream();
    onCapture(dataUrl);
  };

  const handleRetake = () => {
    onRetake();
  };

  if (photo) {
    return (
      <div className="space-y-3">
        <img src={photo} alt="Selfie absen" className="w-full rounded-lg" />
        <button
          type="button"
          onClick={handleRetake}
          className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Ambil Ulang Foto
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-900">
        <video
          ref={videoRef}
          className="h-full w-full -scale-x-100 object-cover"
          playsInline
          muted
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleCapture}
        disabled={!ready}
        className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
      >
        Ambil Foto
      </button>
    </div>
  );
}
