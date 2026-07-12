-- =============================================================
-- MIGRATION v15 — Pagos pendientes (coordinación de pagos)
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- Tabla de pagos pendientes (dueno y empleados pueden interactuar)
create table if not exists pagos_pendientes (
  id               uuid primary key default gen_random_uuid(),
  proveedor_id     uuid references proveedores(id) on delete set null,
  proveedor_nombre text,
  banco            text,
  cuenta_bancaria  text,
  concepto         text not null,
  monto            numeric(12,2) not null,
  estado           text not null default 'pendiente',   -- 'pendiente' | 'pagado'
  registrado_por   uuid references perfiles(id) on delete set null,
  pagado_por       uuid references perfiles(id) on delete set null,
  fecha_registro   timestamptz default now(),
  fecha_pago       timestamptz,
  notas            text,
  created_at       timestamptz default now()
);

alter table pagos_pendientes enable row level security;

-- Cualquier usuario autenticado del negocio puede registrar y marcar pagos
create policy "auth_all_pagos_pendientes" on pagos_pendientes
  for all using (
    exists (select 1 from perfiles where id = auth.uid())
  );

-- Permitir que un empleado inserte gastos al marcar un pago como pagado
-- (la política de dueno ya cubre lectura/actualización/eliminación)
create policy "auth_insert_gastos_operativos" on gastos_operativos
  for insert with check (
    exists (select 1 from perfiles where id = auth.uid())
  );
