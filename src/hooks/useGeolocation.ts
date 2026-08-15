import { useCallback, useState } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
  });

  const request = useCallback(() => {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        const message = "Perangkat Anda tidak mendukung Geolocation.";
        setState((s) => ({ ...s, error: message, loading: false }));
        reject(new Error(message));
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setState({ latitude, longitude, accuracy, loading: false, error: null });
          resolve({ latitude, longitude });
        },
        (error) => {
          const message =
            error.code === error.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan akses lokasi untuk absen."
              : "Gagal mendapatkan lokasi. Coba lagi.";
          setState((s) => ({ ...s, loading: false, error: message }));
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }, []);

  return { ...state, request };
}
