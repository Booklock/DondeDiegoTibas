-- =============================================================
-- MIGRATION v5 — Estado de pago en pedidos
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

alter table pedidos
  add column if not exists pagado    boolean not null default false,
  add column if not exists fecha_pago date;
