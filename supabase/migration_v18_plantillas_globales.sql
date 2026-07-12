-- =============================================================
-- MIGRATION v18 — Plantillas globales nombradas
-- Reemplaza la plantilla per-empleado por plantillas con nombre
-- que cubren todos los empleados a la vez.
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- Tabla de plantillas nombradas
create table if not exists plantillas (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden  int  not null default 0,
  unique(nombre)
);

alter table plantillas enable row level security;

create policy "dueno_all_plantillas_def" on plantillas
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno')
  );

-- Seed: 3 plantillas por defecto
insert into plantillas (nombre, orden) values
  ('Plantilla A', 0),
  ('Plantilla B', 1),
  ('Plantilla C', 2)
on conflict (nombre) do nothing;

-- Agregar plantilla_id a la tabla de detalle (nullable primero)
alter table plantillas_horario
  add column if not exists plantilla_id uuid references plantillas(id) on delete cascade;

-- Migrar filas existentes → Plantilla A
update plantillas_horario
set plantilla_id = (select id from plantillas where nombre = 'Plantilla A')
where plantilla_id is null;

-- Ahora hacerlo obligatorio
alter table plantillas_horario
  alter column plantilla_id set not null;

-- Reemplazar unique(empleado_id, pos) → unique(plantilla_id, empleado_id, pos)
alter table plantillas_horario
  drop constraint if exists plantillas_horario_empleado_id_pos_key;

do $$ begin
  alter table plantillas_horario
    add constraint plantillas_horario_plantilla_emp_pos_key
    unique (plantilla_id, empleado_id, pos);
exception when duplicate_table then null;
end $$;
