-- =============================================================
-- MIGRATION v2 — Precios, proveedores por producto y ventas
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- ── 1. Precios en productos ───────────────────────────────────
alter table productos
  add column if not exists precio_costo numeric(12,2) not null default 0,
  add column if not exists precio_venta numeric(12,2) not null default 0;

-- ── 2. Relación producto ↔ proveedor ─────────────────────────
create table if not exists producto_proveedor (
  id           uuid primary key default uuid_generate_v4(),
  producto_id  uuid not null references productos(id) on delete cascade,
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  precio_costo numeric(12,2),          -- precio que cobra este proveedor
  es_principal boolean not null default false,
  created_at   timestamptz not null default now(),
  unique(producto_id, proveedor_id)
);

create index idx_pp_producto  on producto_proveedor(producto_id);
create index idx_pp_proveedor on producto_proveedor(proveedor_id);

alter table producto_proveedor enable row level security;

create policy "pp: duenos solo"
  on producto_proveedor for all
  using (mi_rol() = 'dueno');

-- ── 3. Seguimiento de ventas en movimientos ───────────────────
alter table movimientos_inventario
  add column if not exists precio_unitario numeric(12,2),
  add column if not exists es_venta        boolean not null default false;

-- Vista útil: ventas por producto con totales
create or replace view vista_ventas_producto as
select
  p.id                             as producto_id,
  p.nombre                         as producto,
  p.unidad_medida,
  p.precio_venta,
  p.precio_costo,
  sum(m.cantidad)                  as unidades_vendidas,
  sum(m.cantidad * m.precio_unitario)          as ingresos_brutos,
  sum(m.cantidad * p.precio_costo)             as costo_total,
  sum(m.cantidad * (coalesce(m.precio_unitario,0) - p.precio_costo)) as ganancia
from productos p
left join movimientos_inventario m
  on m.producto_id = p.id
  and m.tipo = 'salida'
  and m.es_venta = true
group by p.id, p.nombre, p.unidad_medida, p.precio_venta, p.precio_costo;

-- Vista: productos por proveedor con precio
create or replace view vista_productos_proveedor as
select
  pr.id          as proveedor_id,
  pr.nombre      as proveedor,
  p.id           as producto_id,
  p.nombre       as producto,
  p.unidad_medida,
  pp.precio_costo,
  pp.es_principal,
  p.precio_venta,
  p.precio_costo as costo_producto
from proveedores pr
join producto_proveedor pp on pp.proveedor_id = pr.id
join productos p            on p.id = pp.producto_id
order by pr.nombre, pp.es_principal desc, p.nombre;
