-- =============================================================
-- MIGRATION v3 — SKU, ajustes de inventario y pedidos
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- ── 1. SKU en productos ───────────────────────────────────────
alter table productos
  add column if not exists sku text;

-- ── 2. Marca ajuste manual en movimientos ─────────────────────
alter table movimientos_inventario
  add column if not exists es_ajuste boolean not null default false;

-- ── 3. Tabla pedidos ─────────────────────────────────────────
create table if not exists pedidos (
  id             uuid primary key default uuid_generate_v4(),
  proveedor_id   uuid not null references proveedores(id) on delete restrict,
  numero         text,
  fecha_pedido   date not null default current_date,
  fecha_estimada date,
  fecha_entrega  date,
  estado         text not null default 'en_camino'
                   check (estado in ('en_camino', 'entregado', 'cancelado')),
  notas          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_pedidos_proveedor on pedidos(proveedor_id);
create index if not exists idx_pedidos_estado    on pedidos(estado);

create trigger trg_pedidos_updated_at
  before update on pedidos for each row execute function set_updated_at();

-- ── 4. Líneas de pedido ───────────────────────────────────────
create table if not exists pedido_lineas (
  id              uuid primary key default uuid_generate_v4(),
  pedido_id       uuid not null references pedidos(id) on delete cascade,
  producto_id     uuid references productos(id) on delete set null,
  sku             text,
  nombre          text not null,
  cantidad        numeric(12,3) not null,
  precio_unitario numeric(12,2) not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_pedido_lineas_pedido on pedido_lineas(pedido_id);

-- ── 5. RLS ────────────────────────────────────────────────────
alter table pedidos      enable row level security;
alter table pedido_lineas enable row level security;

create policy "pedidos: duenos solo"
  on pedidos for all using (mi_rol() = 'dueno');

create policy "pedido_lineas: duenos solo"
  on pedido_lineas for all using (mi_rol() = 'dueno');
