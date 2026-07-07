-- =============================================================
-- MIGRATION v13 — Materia prima y recepciones semanales
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- Catálogo de materias primas
create table if not exists materias_primas (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  costo_unitario numeric(12,2) not null default 0,
  unidad_medida  text not null,
  activo         boolean not null default true,
  created_at     timestamptz default now()
);

alter table materias_primas enable row level security;

create policy "dueno_materia_prima" on materias_primas
  using (exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno'))
  with check (exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno'));

-- Registro diario de recepciones
create table if not exists recepciones_materia_prima (
  id              uuid primary key default gen_random_uuid(),
  materia_prima_id uuid references materias_primas(id) on delete cascade,
  fecha           date not null default current_date,
  cantidad        numeric(12,3) not null,
  notas           text,
  created_at      timestamptz default now()
);

alter table recepciones_materia_prima enable row level security;

create policy "dueno_recepciones" on recepciones_materia_prima
  using (exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno'))
  with check (exists (select 1 from perfiles where id = auth.uid() and rol = 'dueno'));
