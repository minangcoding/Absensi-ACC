-- ============================================================================
-- Sistem Informasi Absensi Karyawan — Skema awal
-- Mengikuti erd_sistem_absensi.html + detail kolom PRD.md §6
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'hr', 'supervisor', 'karyawan');
create type public.attendance_status as enum ('hadir', 'telat', 'alpha', 'izin', 'sakit', 'cuti');
create type public.leave_type as enum ('izin', 'sakit', 'cuti');
create type public.leave_status as enum ('pending', 'disetujui', 'ditolak');
create type public.notification_type as enum ('reminder', 'approval', 'sistem');

-- ----------------------------------------------------------------------------
-- TABLE: users  (profil app, 1:1 dengan auth.users)
-- ----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  nama varchar not null,
  email varchar not null unique,
  no_hp varchar,
  role public.user_role not null default 'karyawan',
  divisi varchar,
  jabatan varchar,
  supervisor_id uuid references public.users (id) on delete set null,
  foto_profile varchar,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_supervisor_id on public.users (supervisor_id);
create index idx_users_role on public.users (role);

-- ----------------------------------------------------------------------------
-- TABLE: offices  (lokasi kantor untuk geofencing)
-- ----------------------------------------------------------------------------
create table public.offices (
  id uuid primary key default gen_random_uuid(),
  nama_kantor varchar not null,
  latitude decimal(10, 7) not null,
  longitude decimal(10, 7) not null,
  radius_meter int not null default 100,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: work_schedules
-- ----------------------------------------------------------------------------
create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  nama_shift varchar not null,
  jam_masuk_standar time not null,
  jam_pulang_standar time not null,
  toleransi_telat_menit int not null default 0
);

-- ----------------------------------------------------------------------------
-- TABLE: attendances
-- ----------------------------------------------------------------------------
create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  office_id uuid references public.offices (id) on delete set null,
  tanggal date not null,
  jam_masuk timestamptz,
  jam_pulang timestamptz,
  lokasi_masuk_lat decimal(10, 7),
  lokasi_masuk_lng decimal(10, 7),
  lokasi_pulang_lat decimal(10, 7),
  lokasi_pulang_lng decimal(10, 7),
  foto_masuk varchar,
  foto_pulang varchar,
  status public.attendance_status not null default 'alpha',
  keterangan text,
  diedit_oleh uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tanggal)
);

create index idx_attendances_user_id on public.attendances (user_id);
create index idx_attendances_tanggal on public.attendances (tanggal);

-- ----------------------------------------------------------------------------
-- TABLE: leave_requests
-- ----------------------------------------------------------------------------
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  jenis public.leave_type not null,
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  alasan text not null,
  file_lampiran varchar,
  status public.leave_status not null default 'pending',
  approved_by uuid references public.users (id) on delete set null,
  approved_at timestamptz,
  catatan_approval text,
  created_at timestamptz not null default now(),
  constraint chk_tanggal_valid check (tanggal_selesai >= tanggal_mulai)
);

create index idx_leave_requests_user_id on public.leave_requests (user_id);
create index idx_leave_requests_status on public.leave_requests (status);

-- ----------------------------------------------------------------------------
-- TABLE: notifications
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  judul varchar not null,
  pesan text not null,
  tipe public.notification_type not null default 'sistem',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on public.notifications (user_id);

-- ----------------------------------------------------------------------------
-- TABLE: audit_logs
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users (id) on delete set null,
  aksi varchar not null,
  target_table varchar not null,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- TRIGGER: auto-buat baris public.users saat ada auth.users baru
-- (dipakai oleh Edge Function admin-create-user di fase Absensi/Admin nanti)
-- ============================================================================
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, nama, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', new.email),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'karyawan')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- updated_at helper trigger
-- ============================================================================
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_attendances_updated_at before update on public.attendances
  for each row execute function public.set_updated_at();

-- ============================================================================
-- GUARD: cegah user non-admin mengubah field sensitif (role, supervisor_id,
-- status_aktif, divisi, jabatan) lewat self-update. Dipakai daripada trik
-- subquery di RLS WITH CHECK, karena snapshot row dalam RLS check ambigu
-- untuk kasus self-referencing table yang sama.
-- ============================================================================
create function public.guard_users_self_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Guard hanya berlaku untuk update yang datang dari sesi user yang login
  -- (lewat RLS, mis. karyawan edit profil sendiri) dan bukan admin. Update
  -- yang dijalankan tanpa sesi auth (migration, SQL Editor sebagai postgres,
  -- atau Edge Function dengan service role) auth.uid() = null, jadi dianggap
  -- operasi administratif dan tidak di-guard.
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.supervisor_id := old.supervisor_id;
    new.status_aktif := old.status_aktif;
    new.divisi := old.divisi;
    new.jabatan := old.jabatan;
  end if;
  return new;
end;
$$;

create trigger trg_guard_users_self_update before update on public.users
  for each row execute function public.guard_users_self_update();

-- ============================================================================
-- RBAC HELPER FUNCTIONS (security definer supaya tidak recursive di RLS)
-- ============================================================================
create function public.current_role()
returns public.user_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

create function public.is_hr_or_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select role in ('hr', 'admin') from public.users where id = auth.uid()), false);
$$;

create function public.is_supervisor_of(target_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = target_user_id and supervisor_id = auth.uid()
  );
$$;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.users enable row level security;
alter table public.offices enable row level security;
alter table public.work_schedules enable row level security;
alter table public.attendances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- ----------------------------------------------------------------------------
-- POLICIES: users
-- ----------------------------------------------------------------------------
create policy "users_select_self" on public.users
  for select using (id = auth.uid());

create policy "users_select_team" on public.users
  for select using (supervisor_id = auth.uid());

create policy "users_select_hr_admin" on public.users
  for select using (public.is_hr_or_admin());

create policy "users_update_self" on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "users_write_admin" on public.users
  for update using (public.is_admin());

create policy "users_delete_admin" on public.users
  for delete using (public.is_admin());

-- insert baris users dilakukan oleh trigger handle_new_auth_user (security definer),
-- jadi tidak perlu policy insert untuk client biasa.

-- ----------------------------------------------------------------------------
-- POLICIES: offices & work_schedules (baca semua authenticated, tulis admin)
-- ----------------------------------------------------------------------------
create policy "offices_select_authenticated" on public.offices
  for select using (auth.role() = 'authenticated');

create policy "offices_write_admin" on public.offices
  for all using (public.is_admin()) with check (public.is_admin());

create policy "work_schedules_select_authenticated" on public.work_schedules
  for select using (auth.role() = 'authenticated');

create policy "work_schedules_write_admin" on public.work_schedules
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- POLICIES: attendances
-- ----------------------------------------------------------------------------
create policy "attendances_select_self" on public.attendances
  for select using (user_id = auth.uid());

create policy "attendances_select_team" on public.attendances
  for select using (public.is_supervisor_of(user_id));

create policy "attendances_select_hr_admin" on public.attendances
  for select using (public.is_hr_or_admin());

create policy "attendances_write_admin" on public.attendances
  for update using (public.is_admin()) with check (public.is_admin());

-- Tidak ada policy insert untuk client biasa: absen masuk/pulang HARUS lewat
-- Edge Function "clock-in" / "clock-out" (Fase 2) yang memvalidasi geofencing
-- & jendela waktu di server sebelum menulis baris, memakai service role key
-- (bypass RLS by design). Ini mencegah user memalsukan absen lewat panggilan
-- API langsung ke tabel.

-- ----------------------------------------------------------------------------
-- POLICIES: leave_requests
-- ----------------------------------------------------------------------------
create policy "leave_requests_select_self" on public.leave_requests
  for select using (user_id = auth.uid());

create policy "leave_requests_select_team" on public.leave_requests
  for select using (public.is_supervisor_of(user_id));

create policy "leave_requests_select_hr_admin" on public.leave_requests
  for select using (public.is_hr_or_admin());

create policy "leave_requests_insert_self" on public.leave_requests
  for insert with check (user_id = auth.uid());

create policy "leave_requests_update_supervisor" on public.leave_requests
  for update
  using (public.is_supervisor_of(user_id) and status = 'pending')
  with check (public.is_supervisor_of(user_id));

create policy "leave_requests_update_hr_admin" on public.leave_requests
  for update using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

-- ----------------------------------------------------------------------------
-- POLICIES: notifications (baca & mark-read milik sendiri; insert via service role)
-- ----------------------------------------------------------------------------
create policy "notifications_select_self" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_self" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- POLICIES: audit_logs (admin only)
-- ----------------------------------------------------------------------------
create policy "audit_logs_select_admin" on public.audit_logs
  for select using (public.is_admin());

-- insert audit_logs dilakukan lewat Edge Function memakai service role key
-- (bypass RLS by design), tidak ada policy insert untuk client biasa.
