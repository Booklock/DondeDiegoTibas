-- Agrega numero_factura a pagos_pendientes
ALTER TABLE pagos_pendientes ADD COLUMN IF NOT EXISTS numero_factura text;
