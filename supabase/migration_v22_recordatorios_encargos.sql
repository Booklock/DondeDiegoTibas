-- v22: recordatorios and encargos tables

CREATE TABLE IF NOT EXISTS recordatorios (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           text        NOT NULL,
  descripcion      text,
  responsable      text,
  tipo_recurrencia text        NOT NULL DEFAULT 'mensual',
  dia_mes          int,
  dia_semana       int,
  mes              int,
  fecha_especifica date,
  activo           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS encargos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente       text        NOT NULL,
  pedido        text        NOT NULL,
  precio        numeric(12,2),
  pagado        boolean     NOT NULL DEFAULT false,
  contacto      text,
  fecha_entrega date,
  notas         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
