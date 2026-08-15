-- ============================================================================
-- Storage bucket untuk foto absen (selfie masuk/pulang)
-- Bucket privat: hanya bisa diakses lewat signed URL / RLS di bawah ini.
-- Path konvensi: attendance-photos/{user_id}/{tanggal}-masuk.jpg (atau -pulang.jpg)
-- Upload HANYA lewat Edge Function clock-in / clock-out (service role,
-- bypass storage RLS) — konsisten dengan desain tabel attendances di
-- 0001_init_schema.sql (client tidak pernah menulis absen secara langsung).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', false)
on conflict (id) do nothing;

create policy "attendance_photos_select_self" on storage.objects
  for select using (
    bucket_id = 'attendance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attendance_photos_select_team" on storage.objects
  for select using (
    bucket_id = 'attendance-photos'
    and public.is_supervisor_of(((storage.foldername(name))[1])::uuid)
  );

create policy "attendance_photos_select_hr_admin" on storage.objects
  for select using (
    bucket_id = 'attendance-photos' and public.is_hr_or_admin()
  );
