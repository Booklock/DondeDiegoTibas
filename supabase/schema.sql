-- =============================================================
-- CHICHARRONERA MANAGEMENT APP — SUPABASE SCHEMA
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── ENUM TYPES ──────────────────────────────────────────────
create type user_role as enum ('dueno', 'empleado');
create type estado_empleado as enum ('activo', 'inactivo');
create type tipo_movimiento as enum ('entrada', 'salida');
create type tipo_gasto_cat as enum ('insumos', 'servicios', 'planilla', 'otros');

-- =============================================================
-- TABLE: perfiles
-- Extended user profile linked to auth.users
-- =============================================================
create table perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nombre        text not null,
  apellidos     text not null,
  email         text not null unique,
  rol           user_role not null default 'empleado',
  telefono      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_perfiles_rol on perfiles(rol);

-- =============================================================
-- TABLE: empleados
-- HR profile (one-to-one with perfiles for empleados)
-- =============================================================
create table empleados (
  id            uuid primary key default uuid_generate_v4(),
  perfil_id     uuid not null references perfiles(id) on delete cascade,
  cedula        text unique,
  puesto        text not null,
  fecha_ingreso date not null,
  estado        estado_empleado not null default 'activo',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_empleados_perfil_id on empleados(perfil_id);
create index idx_empleados_estado on empleados(estado);

-- =============================================================
-- TABLE: salarios
-- Salary history per employee
-- =============================================================
create table salarios (
  id            uuid primary key default uuid_generate_v4(),
  empleado_id   uuid not null references empleados(id) on delete cascade,
  monto         numeric(12,2) not null check (monto > 0),
  fecha_inicio  date not null,
  fecha_fin     date,
  created_at    timestamptz not null default now()
);

create index idx_salarios_empleado_id on salarios(empleado_id);

-- =============================================================
-- TABLE: vacaciones
-- Vacation records per employee
-- =============================================================
create table vacaciones (
  id              uuid primary key default uuid_generate_v4(),
  empleado_id     uuid not null references empleados(id) on delete cascade,
  dias_acumulados numeric(6,2) not null default 0,
  dias_usados     numeric(6,2) not null default 0,
  fecha_inicio    date,
  fecha_fin       date,
  notas           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint dias_usados_lte_acumulados check (dias_usados <= dias_acumulados)
);

create index idx_vacaciones_empleado_id on vacaciones(empleado_id);

-- =============================================================
-- TABLE: turnos
-- Shift definitions
-- =============================================================
create table turnos (
  id            uuid primary key default uuid_generate_v4(),
  nombre        text not null,
  hora_inicio   time not null,
  hora_fin      time not null,
  created_at    timestamptz not null default now()
);

-- =============================================================
-- TABLE: asignaciones_turno
-- Assign employees to shifts on specific dates
-- =============================================================
create table asignaciones_turno (
  id            uuid primary key default uuid_generate_v4(),
  empleado_id   uuid not null references empleados(id) on delete cascade,
  turno_id      uuid not null references turnos(id) on delete cascade,
  fecha         date not null,
  notas         text,
  created_at    timestamptz not null default now(),
  unique (empleado_id, turno_id, fecha)
);

create index idx_asignaciones_empleado_id on asignaciones_turno(empleado_id);
create index idx_asignaciones_fecha on asignaciones_turno(fecha);
create index idx_asignaciones_turno_id on asignaciones_turno(turno_id);

-- =============================================================
-- TABLE: categorias_gasto
-- Expense categories
-- =============================================================
create table categorias_gasto (
  id      uuid primary key default uuid_generate_v4(),
  nombre  text not null unique,
  tipo    tipo_gasto_cat not null
);

-- Seed default categories
insert into categorias_gasto (nombre, tipo) values
  ('Insumos alimentarios', 'insumos'),
  ('Empaques y materiales', 'insumos'),
  ('Electricidad', 'servicios'),
  ('Agua', 'servicios'),
  ('Internet y telefonía', 'servicios'),
  ('Planilla semanal', 'planilla'),
  ('Planilla quincenal', 'planilla'),
  ('Alquiler', 'otros'),
  ('Mantenimiento', 'otros'),
  ('Otros gastos', 'otros');

-- =============================================================
-- TABLE: cierres_caja
-- Daily cash register closing
-- =============================================================
create table cierres_caja (
  id                uuid primary key default uuid_generate_v4(),
  fecha             date not null unique,
  total_ingresos    numeric(12,2) not null default 0,
  total_gastos      numeric(12,2) not null default 0,
  ganancia_neta     numeric(12,2) generated always as (total_ingresos - total_gastos) stored,
  notas             text,
  creado_por        uuid references perfiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_cierres_fecha on cierres_caja(fecha);

-- =============================================================
-- TABLE: ingresos
-- Revenue entries linked to daily closing
-- =============================================================
create table ingresos (
  id              uuid primary key default uuid_generate_v4(),
  cierre_id       uuid not null references cierres_caja(id) on delete cascade,
  descripcion     text,
  monto           numeric(12,2) not null check (monto > 0),
  created_at      timestamptz not null default now()
);

create index idx_ingresos_cierre_id on ingresos(cierre_id);

-- =============================================================
-- TABLE: gastos
-- Expense entries linked to daily closing
-- =============================================================
create table gastos (
  id              uuid primary key default uuid_generate_v4(),
  cierre_id       uuid not null references cierres_caja(id) on delete cascade,
  categoria_id    uuid not null references categorias_gasto(id),
  descripcion     text,
  monto           numeric(12,2) not null check (monto > 0),
  created_at      timestamptz not null default now()
);

create index idx_gastos_cierre_id on gastos(cierre_id);
create index idx_gastos_categoria_id on gastos(categoria_id);

-- =============================================================
-- TABLE: productos
-- Inventory items
-- =============================================================
create table productos (
  id                  uuid primary key default uuid_generate_v4(),
  nombre              text not null,
  unidad_medida       text not null,
  stock_actual        numeric(12,3) not null default 0,
  stock_minimo        numeric(12,3) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint stock_no_negativo check (stock_actual >= 0)
);

create index idx_productos_stock on productos(stock_actual);

-- =============================================================
-- TABLE: movimientos_inventario
-- Inventory movements (entries and exits)
-- =============================================================
create table movimientos_inventario (
  id              uuid primary key default uuid_generate_v4(),
  producto_id     uuid not null references productos(id) on delete cascade,
  tipo            tipo_movimiento not null,
  cantidad        numeric(12,3) not null check (cantidad > 0),
  fecha           date not null,
  proveedor       text,
  notas           text,
  creado_por      uuid references perfiles(id),
  created_at      timestamptz not null default now()
);

create index idx_movimientos_producto_id on movimientos_inventario(producto_id);
create index idx_movimientos_fecha on movimientos_inventario(fecha);
create index idx_movimientos_tipo on movimientos_inventario(tipo);

-- Update stock_actual when a movement is inserted
create or replace function actualizar_stock()
returns trigger language plpgsql security definer as $$
begin
  if new.tipo = 'entrada' then
    update productos set stock_actual = stock_actual + new.cantidad, updated_at = now()
    where id = new.producto_id;
  elsif new.tipo = 'salida' then
    update productos set stock_actual = stock_actual - new.cantidad, updated_at = now()
    where id = new.producto_id;
  end if;
  return new;
end;
$$;

create trigger trg_actualizar_stock
  after insert on movimientos_inventario
  for each row execute function actualizar_stock();

-- =============================================================
-- TABLE: proveedores
-- Supplier records
-- =============================================================
create table proveedores (
  id            uuid primary key default uuid_generate_v4(),
  nombre        text not null,
  telefono      text,
  direccion     text,
  productos_que_provee text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================
-- TABLE: contactos_proveedor
-- Multiple contacts per supplier
-- =============================================================
create table contactos_proveedor (
  id              uuid primary key default uuid_generate_v4(),
  proveedor_id    uuid not null references proveedores(id) on delete cascade,
  nombre          text not null,
  cargo           text,
  telefono        text,
  email           text,
  created_at      timestamptz not null default now()
);

create index idx_contactos_proveedor_id on contactos_proveedor(proveedor_id);

-- =============================================================
-- TRIGGER: auto-update updated_at
-- =============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_perfiles_updated_at
  before update on perfiles for each row execute function set_updated_at();
create trigger trg_empleados_updated_at
  before update on empleados for each row execute function set_updated_at();
create trigger trg_vacaciones_updated_at
  before update on vacaciones for each row execute function set_updated_at();
create trigger trg_cierres_updated_at
  before update on cierres_caja for each row execute function set_updated_at();
create trigger trg_productos_updated_at
  before update on productos for each row execute function set_updated_at();
create trigger trg_proveedores_updated_at
  before update on proveedores for each row execute function set_updated_at();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

-- Helper: returns the rol of the currently authenticated user
create or replace function mi_rol()
returns user_role language sql security definer stable as $$
  select rol from perfiles where id = auth.uid();
$$;

-- Helper: returns the empleado id linked to the current user
create or replace function mi_empleado_id()
returns uuid language sql security definer stable as $$
  select id from empleados where perfil_id = auth.uid();
$$;

-- ── perfiles ──────────────────────────────────────────────────
alter table perfiles enable row level security;

create policy "perfiles: duenos ven todo"
  on perfiles for select
  using (mi_rol() = 'dueno');

create policy "perfiles: empleados ven su propio perfil"
  on perfiles for select
  using (id = auth.uid());

create policy "perfiles: duenos insertan"
  on perfiles for insert
  with check (mi_rol() = 'dueno');

create policy "perfiles: duenos actualizan"
  on perfiles for update
  using (mi_rol() = 'dueno');

create policy "perfiles: empleados actualizan su propio perfil (limitado)"
  on perfiles for update
  using (id = auth.uid());

-- ── empleados ─────────────────────────────────────────────────
alter table empleados enable row level security;

create policy "empleados: duenos ven todo"
  on empleados for select
  using (mi_rol() = 'dueno');

create policy "empleados: empleados ven el suyo"
  on empleados for select
  using (perfil_id = auth.uid());

create policy "empleados: duenos insertan"
  on empleados for insert
  with check (mi_rol() = 'dueno');

create policy "empleados: duenos actualizan"
  on empleados for update
  using (mi_rol() = 'dueno');

create policy "empleados: duenos eliminan"
  on empleados for delete
  using (mi_rol() = 'dueno');

-- ── salarios ──────────────────────────────────────────────────
alter table salarios enable row level security;

create policy "salarios: duenos ven todo"
  on salarios for select
  using (mi_rol() = 'dueno');

create policy "salarios: empleados ven el suyo"
  on salarios for select
  using (empleado_id = mi_empleado_id());

create policy "salarios: duenos insertan"
  on salarios for insert
  with check (mi_rol() = 'dueno');

create policy "salarios: duenos actualizan"
  on salarios for update
  using (mi_rol() = 'dueno');

-- ── vacaciones ────────────────────────────────────────────────
alter table vacaciones enable row level security;

create policy "vacaciones: duenos ven todo"
  on vacaciones for select
  using (mi_rol() = 'dueno');

create policy "vacaciones: empleados ven la suya"
  on vacaciones for select
  using (empleado_id = mi_empleado_id());

create policy "vacaciones: duenos insertan"
  on vacaciones for insert
  with check (mi_rol() = 'dueno');

create policy "vacaciones: duenos actualizan"
  on vacaciones for update
  using (mi_rol() = 'dueno');

-- ── turnos ────────────────────────────────────────────────────
alter table turnos enable row level security;

create policy "turnos: autenticados ven todo"
  on turnos for select
  using (auth.role() = 'authenticated');

create policy "turnos: duenos insertan"
  on turnos for insert
  with check (mi_rol() = 'dueno');

create policy "turnos: duenos actualizan"
  on turnos for update
  using (mi_rol() = 'dueno');

create policy "turnos: duenos eliminan"
  on turnos for delete
  using (mi_rol() = 'dueno');

-- ── asignaciones_turno ────────────────────────────────────────
alter table asignaciones_turno enable row level security;

create policy "asignaciones: duenos ven todo"
  on asignaciones_turno for select
  using (mi_rol() = 'dueno');

create policy "asignaciones: empleados ven las suyas"
  on asignaciones_turno for select
  using (empleado_id = mi_empleado_id());

create policy "asignaciones: duenos insertan"
  on asignaciones_turno for insert
  with check (mi_rol() = 'dueno');

create policy "asignaciones: duenos actualizan"
  on asignaciones_turno for update
  using (mi_rol() = 'dueno');

create policy "asignaciones: duenos eliminan"
  on asignaciones_turno for delete
  using (mi_rol() = 'dueno');

-- ── categorias_gasto ──────────────────────────────────────────
alter table categorias_gasto enable row level security;

create policy "categorias: duenos ven todo"
  on categorias_gasto for select
  using (mi_rol() = 'dueno');

create policy "categorias: duenos gestionan"
  on categorias_gasto for all
  using (mi_rol() = 'dueno');

-- ── cierres_caja ──────────────────────────────────────────────
alter table cierres_caja enable row level security;

create policy "cierres: duenos solo"
  on cierres_caja for all
  using (mi_rol() = 'dueno');

-- ── ingresos ──────────────────────────────────────────────────
alter table ingresos enable row level security;

create policy "ingresos: duenos solo"
  on ingresos for all
  using (mi_rol() = 'dueno');

-- ── gastos ────────────────────────────────────────────────────
alter table gastos enable row level security;

create policy "gastos: duenos solo"
  on gastos for all
  using (mi_rol() = 'dueno');

-- ── productos ─────────────────────────────────────────────────
alter table productos enable row level security;

create policy "productos: duenos solo"
  on productos for all
  using (mi_rol() = 'dueno');

-- ── movimientos_inventario ────────────────────────────────────
alter table movimientos_inventario enable row level security;

create policy "movimientos: duenos solo"
  on movimientos_inventario for all
  using (mi_rol() = 'dueno');

-- ── proveedores ───────────────────────────────────────────────
alter table proveedores enable row level security;

create policy "proveedores: duenos solo"
  on proveedores for all
  using (mi_rol() = 'dueno');

-- ── contactos_proveedor ───────────────────────────────────────
alter table contactos_proveedor enable row level security;

create policy "contactos: duenos solo"
  on contactos_proveedor for all
  using (mi_rol() = 'dueno');

-- =============================================================
-- AUTO-CREATE perfil on new user signup
-- Place this trigger via Supabase Dashboard > Database > Functions
-- =============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into perfiles (id, nombre, apellidos, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellidos', ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'rol')::user_role, 'empleado')
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
