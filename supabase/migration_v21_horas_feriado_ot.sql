-- Agrega columna para horas extra trabajadas en día feriado (pago ×3)
ALTER TABLE horas_extra_semana
  ADD COLUMN IF NOT EXISTS horas_feriado_ot numeric(5,2) NOT NULL DEFAULT 0;
