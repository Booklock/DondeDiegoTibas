-- =============================================================
-- MIGRATION v4 — IVA en pedidos
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

alter table pedidos
  add column if not exists aplica_iva boolean not null default false;
