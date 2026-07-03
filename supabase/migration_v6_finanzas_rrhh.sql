-- =============================================================
-- MIGRATION v6 — Cierres diarios multi-canal + Planilla
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- Cierres diarios con desglose por canal
create table if not exists cierres_diarios (
  id           uuid primary key default gen_random_uuid(),
  fecha        date unique not null,
  romana       numeric(12,2) not null default 0,
  facturacion  numeric(12,2) not null default 0,
  efectivo     numeric(12,2) not null default 0,
  datafono     numeric(12,2) not null default 0,
  uber         numeric(12,2) not null default 0,
  sinoe        numeric(12,2) not null default 0,
  notas        text,
  created_at   timestamptz default now()
);

alter table cierres_diarios enable row level security;
create policy "dueno_all_cierres_diarios" on cierres_diarios
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno')
  );

-- Gastos operativos (proveedor como texto libre)
create table if not exists gastos_operativos (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null default current_date,
  proveedor    text,
  descripcion  text not null,
  monto        numeric(12,2) not null,
  created_at   timestamptz default now()
);

alter table gastos_operativos enable row level security;
create policy "dueno_all_gastos_op" on gastos_operativos
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno')
  );

-- Empleados de planilla (sin auth requerida)
create table if not exists empleados_planilla (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  salario_hora  numeric(10,2) not null default 0,
  activo        boolean not null default true,
  created_at    timestamptz default now()
);

alter table empleados_planilla enable row level security;
create policy "dueno_all_empleados_planilla" on empleados_planilla
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno')
  );

-- Turnos de trabajo (un registro por empleado×día)
create table if not exists turnos_trabajo (
  id            uuid primary key default gen_random_uuid(),
  empleado_id   uuid not null references empleados_planilla(id) on delete cascade,
  fecha         date not null,
  horas         numeric(4,2) not null default 9,
  notas         text,
  unique(empleado_id, fecha),
  created_at    timestamptz default now()
);

alter table turnos_trabajo enable row level security;
create policy "dueno_all_turnos" on turnos_trabajo
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno')
  );
