-- Competencia semanal de ventas
-- Los vendedores se identifican por el código de la romana, que puede cambiar.
-- Las ventas se guardan contra el id del vendedor (no contra el código) para
-- que el historial no se pierda cuando se reasignan códigos.

CREATE TABLE IF NOT EXISTS ventas_vendedores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      int  NOT NULL,
  nombre      text NOT NULL,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Un código de romana solo puede pertenecer a un vendedor activo a la vez
CREATE UNIQUE INDEX IF NOT EXISTS ventas_vendedores_codigo_activo
  ON ventas_vendedores (codigo) WHERE activo;

-- Venta diaria por vendedor (la semana se acumula de lunes a domingo)
CREATE TABLE IF NOT EXISTS ventas_competencia (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id  uuid NOT NULL REFERENCES ventas_vendedores(id) ON DELETE CASCADE,
  fecha        date NOT NULL,
  monto        numeric(12,2) NOT NULL DEFAULT 0 CHECK (monto >= 0),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (vendedor_id, fecha)
);

CREATE INDEX IF NOT EXISTS ventas_competencia_fecha ON ventas_competencia (fecha);

-- RLS: solo el dueño/manager administra la competencia
ALTER TABLE ventas_vendedores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_competencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dueno_all_ventas_vendedores" ON ventas_vendedores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'dueno')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'dueno')
  );

CREATE POLICY "dueno_all_ventas_competencia" ON ventas_competencia
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'dueno')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'dueno')
  );

-- Vendedores actuales (código de romana → nombre)
INSERT INTO ventas_vendedores (codigo, nombre)
SELECT v.codigo, v.nombre
FROM (VALUES
  (1,  'Pri'),
  (3,  'Taylor'),
  (4,  'Marco'),
  (5,  'Momo'),
  (6,  'Yuli'),
  (8,  'Diego'),
  (9,  'Nati'),
  (11, 'Daniel'),
  (13, 'Fabian'),
  (14, 'Fabri')
) AS v(codigo, nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM ventas_vendedores vv WHERE vv.codigo = v.codigo AND vv.activo
);
