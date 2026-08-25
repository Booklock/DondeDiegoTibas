-- Agregar número de factura a gastos operativos
ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS numero_factura text;
