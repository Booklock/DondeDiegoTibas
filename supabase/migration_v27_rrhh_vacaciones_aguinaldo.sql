-- =============================================================
-- MIGRATION v27 — Quitar Ideas y Lista de precios
--                 + Fecha de ingreso y vacaciones de empleados
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. Eliminar módulos que ya no se usan (borra sus datos de forma permanente)
DROP TABLE IF EXISTS ideas;
DROP TABLE IF EXISTS lista_precios;

-- 2. Fecha de ingreso de cada empleado de planilla
--    (base para el cálculo de vacaciones y aguinaldo)
ALTER TABLE empleados_planilla
  ADD COLUMN IF NOT EXISTS fecha_ingreso date;

-- 3. Vacaciones disfrutadas / solicitadas por empleado de planilla.
--    El saldo se calcula: 1 día por cada mes completo laborado − días tomados.
CREATE TABLE IF NOT EXISTS vacaciones_planilla (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id   uuid NOT NULL REFERENCES empleados_planilla(id) ON DELETE CASCADE,
  fecha_inicio  date NOT NULL,
  fecha_fin     date NOT NULL,
  dias          numeric(5,1) NOT NULL CHECK (dias > 0),
  notas         text,
  created_at    timestamptz DEFAULT now(),
  CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS vacaciones_planilla_empleado ON vacaciones_planilla (empleado_id);

ALTER TABLE vacaciones_planilla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dueno_all_vacaciones_planilla" ON vacaciones_planilla
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'dueno')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'dueno')
  );
