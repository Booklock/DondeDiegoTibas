-- =============================================================
-- MIGRATION v20 — Horas extra manuales para empleados quincenales
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

create table if not exists horas_extra_semana (
  id            uuid primary key default gen_random_uuid(),
  empleado_id   uuid not null references empleados_planilla(id) on delete cascade,
  semana_inicio date not null,
  horas         numeric(5,2) not null default 0,
  notas         text,
  unique(empleado_id, semana_inicio),
  created_at    timestamptz default now()
);

alter table horas_extra_semana enable row level security;
create policy "dueno_all_horas_extra" on horas_extra_semana
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno')
  );
