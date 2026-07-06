-- =============================================================
-- MIGRATION v11 — Gastos pagados desde caja
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. Marcar gastos que se pagaron desde la caja del local
alter table gastos_operativos
  add column if not exists pagado_desde_caja boolean not null default false;

-- 2. Guardar el total de gastos en caja en el cierre (desnormalizado para cálculo rápido)
alter table cierres_diarios
  add column if not exists gastos_caja numeric(12,2) not null default 0;
