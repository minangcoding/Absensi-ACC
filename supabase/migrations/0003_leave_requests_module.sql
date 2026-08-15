-- ============================================================================
-- Fase 3: Pengajuan Izin/Sakit/Cuti + Approval + Notifikasi in-app
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Storage bucket untuk lampiran pengajuan (surat dokter, dll)
-- Berbeda dengan attendance-photos, di sini client BOLEH upload & insert
-- langsung (RLS leave_requests_insert_self dari 0001 sudah mengizinkan),
-- karena tidak ada validasi server-side khusus seperti geofencing.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('leave-attachments', 'leave-attachments', false)
on conflict (id) do nothing;

create policy "leave_attachments_insert_self" on storage.objects
  for insert with check (
    bucket_id = 'leave-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "leave_attachments_select_self" on storage.objects
  for select using (
    bucket_id = 'leave-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "leave_attachments_select_team" on storage.objects
  for select using (
    bucket_id = 'leave-attachments'
    and public.is_supervisor_of(((storage.foldername(name))[1])::uuid)
  );

create policy "leave_attachments_select_hr_admin" on storage.objects
  for select using (
    bucket_id = 'leave-attachments' and public.is_hr_or_admin()
  );

-- ----------------------------------------------------------------------------
-- Aktifkan Realtime untuk tabel notifications (dipakai NotificationBell di
-- frontend supaya update langsung tanpa refresh / polling)
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;

-- ----------------------------------------------------------------------------
-- TRIGGER: notifikasi ke Supervisor + semua HR saat ada pengajuan izin baru
-- (PRD §3.7). Insert notifications lewat SECURITY DEFINER, bukan client
-- langsung, karena tidak ada policy insert untuk client di tabel notifications.
-- ----------------------------------------------------------------------------
create function public.notify_new_leave_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requester record;
  hr_user record;
  pesan_text text;
begin
  select nama, supervisor_id into requester from public.users where id = new.user_id;
  pesan_text := requester.nama || ' mengajukan ' || new.jenis || ' ('
    || to_char(new.tanggal_mulai, 'dd Mon yyyy') || ' - '
    || to_char(new.tanggal_selesai, 'dd Mon yyyy') || ')';

  if requester.supervisor_id is not null then
    insert into public.notifications (user_id, judul, pesan, tipe)
    values (requester.supervisor_id, 'Pengajuan izin baru', pesan_text, 'approval');
  end if;

  for hr_user in select id from public.users where role = 'hr' loop
    insert into public.notifications (user_id, judul, pesan, tipe)
    values (hr_user.id, 'Pengajuan izin baru', pesan_text, 'approval');
  end loop;

  return new;
end;
$$;

create trigger trg_notify_new_leave_request
  after insert on public.leave_requests
  for each row execute function public.notify_new_leave_request();

-- ----------------------------------------------------------------------------
-- TRIGGER: notifikasi ke pemohon saat status pengajuan berubah (disetujui/ditolak)
-- ----------------------------------------------------------------------------
create function public.notify_leave_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status in ('disetujui', 'ditolak') then
    insert into public.notifications (user_id, judul, pesan, tipe)
    values (
      new.user_id,
      case when new.status = 'disetujui' then 'Pengajuan izin disetujui' else 'Pengajuan izin ditolak' end,
      'Pengajuan ' || new.jenis || ' (' || to_char(new.tanggal_mulai, 'dd Mon yyyy') || ' - '
        || to_char(new.tanggal_selesai, 'dd Mon yyyy') || ') '
        || case when new.status = 'disetujui' then 'telah disetujui.' else 'ditolak.' end
        || coalesce(' Catatan: ' || new.catatan_approval, ''),
      'approval'
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_leave_status_change
  after update on public.leave_requests
  for each row execute function public.notify_leave_status_change();

-- ----------------------------------------------------------------------------
-- TRIGGER: saat izin disetujui, otomatis isi/update baris attendances di
-- rentang tanggal terkait dengan status izin/sakit/cuti — supaya rekap
-- kehadiran (Fase 4) konsisten tanpa entri manual. Tidak menimpa hari yang
-- user sudah benar-benar absen masuk (jam_masuk sudah terisi).
-- ----------------------------------------------------------------------------
create function public.sync_attendance_on_leave_approval()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  d date;
begin
  if new.status = 'disetujui' and old.status is distinct from 'disetujui' then
    d := new.tanggal_mulai;
    while d <= new.tanggal_selesai loop
      insert into public.attendances (user_id, tanggal, status, keterangan)
      values (
        new.user_id,
        d,
        new.jenis::text::public.attendance_status,
        'Otomatis dari pengajuan ' || new.jenis || ' yang disetujui'
      )
      on conflict (user_id, tanggal) do update
        set status = excluded.status, keterangan = excluded.keterangan
        where public.attendances.jam_masuk is null;
      d := d + 1;
    end loop;
  end if;
  return new;
end;
$$;

create trigger trg_sync_attendance_on_leave_approval
  after update on public.leave_requests
  for each row execute function public.sync_attendance_on_leave_approval();
