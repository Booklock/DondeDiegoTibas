-- =============================================================
-- MIGRATION v17 — Día libre en turnos + Plantillas de horario
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- Marcar días libres explícitamente en turnos_trabajo
alter table turnos_trabajo
  add column if not exists es_libre boolean not null default false;

-- Plantillas de horario semanal por empleado (Vie=0 ... Jue=6)
create table if not exists plantillas_horario (
  id           uuid primary key default gen_random_uuid(),
  empleado_id  uuid not null references empleados_planilla(id) on delete cascade,
  pos          int  not null check (pos between 0 and 6),  -- 0=Vie, 1=Sáb, 2=Dom, 3=Lun, 4=Mar, 5=Mié, 6=Jue
  es_libre     boolean not null default false,
  hora_inicio  time,
  hora_fin     time,
  almuerzo_min int  not null default 60,
  unique(empleado_id, pos)
);

alter table plantillas_horario enable row level security;

create policy "dueno_all_plantillas" on plantillas_horario
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno')
  );
