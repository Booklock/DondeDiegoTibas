-- =============================================================
-- MIGRATION v12 — Información bancaria de proveedores
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

alter table proveedores
  add column if not exists banco          text,
  add column if not exists cuenta_bancaria text;
