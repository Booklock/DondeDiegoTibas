-- =============================================================
-- MIGRATION v16 — Rotación de dueños en fines de semana
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

create table if not exists rotacion_duenos (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  tipo        text not null check (tipo in ('apertura', 'soporte', 'cierre')),
  hora_inicio time,
  hora_fin    time,
  perfil_id   uuid not null references perfiles(id) on delete cascade,
  notas       text,
  created_at  timestamptz default now()
  -- Sin unique(fecha, tipo, perfil_id): múltiples dueños pueden
  -- compartir el mismo slot en el mismo día
);

alter table rotacion_duenos enable row level security;

create policy "dueno_all_rotacion" on rotacion_duenos
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno')
  );
