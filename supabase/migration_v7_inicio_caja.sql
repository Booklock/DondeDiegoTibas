-- =============================================================
-- MIGRATION v7 — Inicio de caja en cierres diarios
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

alter table cierres_diarios
  add column if not exists inicio_caja numeric(12,2) not null default 0;
