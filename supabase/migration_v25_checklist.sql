-- Plantillas de checklist (ej: "Cierre Dominical", "Cierre Diario")
CREATE TABLE IF NOT EXISTS checklist_plantillas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  descripcion text,
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Ítems de cada plantilla
CREATE TABLE IF NOT EXISTS checklist_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id   uuid NOT NULL REFERENCES checklist_plantillas(id) ON DELETE CASCADE,
  tipo           text NOT NULL CHECK (tipo IN ('inventario', 'tarea')),
  descripcion    text NOT NULL,
  cantidad_minima numeric,        -- solo para tipo='inventario'
  unidad         text,            -- ej: 'kg', 'unidades'
  orden          int NOT NULL DEFAULT 0,
  activo         boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

-- Historial de cierres completados
CREATE TABLE IF NOT EXISTS checklist_ejecuciones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id     uuid NOT NULL REFERENCES checklist_plantillas(id),
  plantilla_nombre text NOT NULL,
  fecha            date NOT NULL DEFAULT CURRENT_DATE,
  completado_en    timestamptz,
  items_resultado  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE checklist_plantillas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_ejecuciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON checklist_plantillas  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON checklist_items       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON checklist_ejecuciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
