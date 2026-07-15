-- =============================================================
-- MIGRATION v19 — Tipo de pago por empleado (semanal / quincenal)
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

alter table empleados_planilla
  add column if not exists tipo_pago text not null default 'semanal'
  check (tipo_pago in ('semanal', 'quincenal'));
