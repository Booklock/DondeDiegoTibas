-- =============================================================
-- MIGRATION v28 — Pruebas de merma de carne
-- Correr en: Supabase Dashboard > SQL Editor
-- =============================================================
-- Merma = porcentaje de peso que se pierde al cocinar la carne:
--   (peso_antes − peso_despues) / peso_antes × 100

CREATE TABLE IF NOT EXISTS pruebas_merma (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_prueba  date NOT NULL DEFAULT CURRENT_DATE,
  fecha_compra  date,
  corte         text NOT NULL,     -- Posta, Panzada, Alita, Pork Belly, Costilla u otro escrito a mano
  proveedor     text NOT NULL,     -- Diego, Mafad, Gustavo
  peso_antes    numeric(10,3) NOT NULL CHECK (peso_antes > 0),
  peso_despues  numeric(10,3) NOT NULL CHECK (peso_despues >= 0),
  notas         text,
  created_at    timestamptz DEFAULT now(),
  CHECK (peso_despues <= peso_antes)
);

CREATE INDEX IF NOT EXISTS pruebas_merma_fecha ON pruebas_merma (fecha_prueba);

ALTER TABLE pruebas_merma ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario de la app puede ver y registrar pruebas (la cocina las hace);
-- solo el dueño puede editarlas o borrarlas.
CREATE POLICY "auth_select_merma" ON pruebas_merma
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_merma" ON pruebas_merma
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "dueno_update_merma" ON pruebas_merma
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'dueno')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'dueno')
  );

CREATE POLICY "dueno_delete_merma" ON pruebas_merma
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'dueno')
  );
