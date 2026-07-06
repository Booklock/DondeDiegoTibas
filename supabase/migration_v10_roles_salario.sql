-- =============================================================
-- MIGRATION v10 — Roles de empleado + salario base mensual
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. Agregar columna de rol
alter table empleados_planilla
  add column if not exists rol text not null default 'cocinero'
    check (rol in ('cocinero', 'supervisor', 'servicio_cliente'));

-- 2. Renombrar salario_hora a salario_base (monto mensual)
--    El salario por hora se calcula: salario_base / 30 / 8
alter table empleados_planilla
  rename column salario_hora to salario_base;
