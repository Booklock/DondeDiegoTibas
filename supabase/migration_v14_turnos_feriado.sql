-- =============================================================
-- MIGRATION v14 — Feriado e incapacidad en turnos
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

alter table turnos_trabajo
  add column if not exists es_feriado   boolean not null default false,
  add column if not exists incapacitado boolean not null default false;
