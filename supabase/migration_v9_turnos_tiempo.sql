-- =============================================================
-- MIGRATION v9 — Turnos por hora + almuerzo configurable
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

alter table turnos_trabajo
  add column if not exists hora_inicio time,
  add column if not exists hora_fin    time,
  add column if not exists almuerzo_min int not null default 60;
