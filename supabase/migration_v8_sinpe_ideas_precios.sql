-- =============================================================
-- MIGRATION v8 — Sinpe rename + Ideas + Lista de precios
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. Renombrar columna sinoe → sinpe en cierres_diarios
alter table cierres_diarios
  rename column sinoe to sinpe;

-- 2. Tabla de ideas / mejoras
create table if not exists ideas (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  descripcion     text,
  propuesto_por   text,
  estado          text not null default 'no_iniciada'
                    check (estado in ('no_iniciada', 'en_proceso', 'completada', 'rechazada')),
  costo_implementacion numeric(12,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table ideas enable row level security;

create policy "dueno_all_ideas" on ideas
  for all
  using (exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno'));

-- 3. Tabla de lista de precios
create table if not exists lista_precios (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  precio_venta numeric(12,2) not null,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table lista_precios enable row level security;

create policy "dueno_all_precios" on lista_precios
  for all
  using (exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno'));
