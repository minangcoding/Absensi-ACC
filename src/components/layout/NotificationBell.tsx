import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, Bell, CircleCheck, Inbox, Info } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth/AuthProvider";
import { fetchNotifications, markAllNotificationsRead, type NotificationRow } from "@/lib/notifications";

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const TYPE_ICON: Record<NotificationRow["tipe"], typeof Bell> = {
  reminder: AlarmClock,
  approval: CircleCheck,
  sistem: Info,
};

const TYPE_COLOR: Record<NotificationRow["tipe"], string> = {
  reminder: "bg-amber-50 text-amber-600",
  approval: "bg-emerald-50 text-emerald-600",
  sistem: "bg-sky-50 text-sky-600",
};

export function NotificationBell() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: () => fetchNotifications(profile!.id),
    enabled: !!profile,
    // Notifikasi yang sudah dibaca kadaluarsa dari daftar setelah 1 jam
    // (lihat src/lib/notifications.ts) — refetch berkala supaya itu benar-benar
    // hilang dari tampilan tanpa perlu reload halaman.
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile, queryClient]);

  // Membuka panel = "sudah dilihat". Begitu panel dibuka, semua notifikasi
  // yang lagi tampil langsung ditandai dibaca dan badge merah di ikon bel
  // hilang — bukan menunggu tiap baris diklik satu-satu.
  useEffect(() => {
    if (!open || !profile) return;
    const hasUnread = query.data?.some((n) => !n.is_read);
    if (!hasUnread) return;

    void markAllNotificationsRead(profile.id).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile, query.data]);

  const unreadCount = query.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifikasi"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notifikasi</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {query.data?.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Inbox className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-500">Belum ada notifikasi.</p>
                </div>
              )}
              {query.data?.map((n) => {
                const Icon = TYPE_ICON[n.tipe];
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0 ${
                      n.is_read ? "" : "bg-brand-50/60"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${TYPE_COLOR[n.tipe]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{n.judul}</p>
                        {!n.is_read && (
                          <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-brand-600" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.pesan}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatRelative(n.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
