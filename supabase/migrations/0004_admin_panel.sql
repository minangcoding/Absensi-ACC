-- ============================================================================
-- Fase 5: Admin Panel — Manajemen User, Lokasi/Jadwal, Koreksi Absensi, Audit Log
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Admin butuh bisa menambah baris attendances baru (bukan cuma update) untuk
-- koreksi manual, mis. karyawan lupa absen dan Admin input manual dengan
-- alasan. 0001 cuma kasih Admin policy UPDATE, insert absen normal tetap
-- lewat Edge Function clock-in/clock-out (tidak berubah).
-- ----------------------------------------------------------------------------
create policy "attendances_insert_admin" on public.attendances
  for insert with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- TRIGGER: audit log otomatis saat Admin insert/update attendances dengan
-- diedit_oleh terisi (frontend selalu mengisi field ini saat Admin melakukan
-- koreksi manual).
-- ----------------------------------------------------------------------------
create function public.audit_attendance_correction()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.diedit_oleh is not null then
    insert into public.audit_logs (admin_id, aksi, target_table, target_id, detail)
    values (
      new.diedit_oleh,
      case when tg_op = 'INSERT' then 'Tambah data absensi manual' else 'Koreksi data absensi' end,
      'attendances',
      new.id,
      jsonb_build_object(
        'user_id', new.user_id,
        'tanggal', new.tanggal,
        'status_baru', new.status,
        'status_lama', case when tg_op = 'UPDATE' then old.status::text else null end,
        'keterangan', new.keterangan
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_audit_attendance_insert
  after insert on public.attendances
  for each row execute function public.audit_attendance_correction();

create trigger trg_audit_attendance_update
  after update on public.attendances
  for each row
  when (
    new.diedit_oleh is distinct from old.diedit_oleh
    or new.status is distinct from old.status
    or new.keterangan is distinct from old.keterangan
  )
  execute function public.audit_attendance_correction();

-- ----------------------------------------------------------------------------
-- TRIGGER: audit log saat Admin mengedit data user lain (role, status_aktif,
-- divisi, jabatan, dst) langsung lewat RLS client. Pembuatan user baru
-- diaudit langsung dari Edge Function admin-create-user (auth.uid() tidak
-- tersedia di trigger insert auth.users karena dijalankan via service role).
-- ----------------------------------------------------------------------------
create function public.audit_user_admin_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> new.id and public.is_admin() then
    insert into public.audit_logs (admin_id, aksi, target_table, target_id, detail)
    values (
      auth.uid(),
      'Edit data user',
      'users',
      new.id,
      jsonb_build_object(
        'nama', new.nama, 'role', new.role, 'divisi', new.divisi,
        'jabatan', new.jabatan, 'status_aktif', new.status_aktif
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_audit_user_update
  after update on public.users
  for each row execute function public.audit_user_admin_change();
