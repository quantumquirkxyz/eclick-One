PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS PROVINCIA (
  id_provincia INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  prefijo TEXT NOT NULL UNIQUE CHECK(length(prefijo) = 2)
);

CREATE TABLE IF NOT EXISTS CLIENTE (
  id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
  id_provincia INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  tipo_identificacion TEXT NOT NULL CHECK(tipo_identificacion IN ('CEDULA', 'PASAPORTE')),
  numero_identificacion TEXT NOT NULL,
  fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
  UNIQUE(tipo_identificacion, numero_identificacion),
  FOREIGN KEY (id_provincia) REFERENCES PROVINCIA(id_provincia)
);

CREATE TABLE IF NOT EXISTS TARJETA (
  id_tarjeta INTEGER PRIMARY KEY AUTOINCREMENT,
  id_cliente INTEGER NOT NULL,
  numero_tarjeta TEXT NOT NULL UNIQUE,
  tipo_tarjeta TEXT NOT NULL CHECK(tipo_tarjeta IN ('DB', 'CR')),
  fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activa INTEGER NOT NULL DEFAULT 1 CHECK(activa IN (0, 1)),
  FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente)
);

CREATE TABLE IF NOT EXISTS PLAN_PEDIDO (
  id_plan INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  cantidad_minima INTEGER NOT NULL CHECK(cantidad_minima > 0),
  cantidad_maxima INTEGER,
  precio REAL NOT NULL CHECK(precio > 0),
  activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS CONTRATO (
  id_contrato INTEGER PRIMARY KEY AUTOINCREMENT,
  id_cliente INTEGER NOT NULL,
  id_plan INTEGER NOT NULL,
  fecha_inicio TEXT NOT NULL CHECK(date(fecha_inicio) >= date('2024-12-29')),
  activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
  fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente),
  FOREIGN KEY (id_plan) REFERENCES PLAN_PEDIDO(id_plan)
);

CREATE TABLE IF NOT EXISTS PRODUCTO (
  id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  precio_unitario REAL NOT NULL DEFAULT 0 CHECK(precio_unitario >= 0),
  activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
  fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO PRODUCTO (id_producto, nombre, descripcion, precio_unitario, activo)
VALUES (999, '__bootstrap_producto_sequence__', NULL, 0, 0);

DELETE FROM PRODUCTO
WHERE id_producto = 999 AND nombre = '__bootstrap_producto_sequence__';

CREATE TABLE IF NOT EXISTS INVENTARIO (
  id_producto INTEGER PRIMARY KEY,
  cantidad_ventas INTEGER NOT NULL DEFAULT 0 CHECK(cantidad_ventas >= 0),
  cantidad_bodega INTEGER NOT NULL DEFAULT 0 CHECK(cantidad_bodega >= 0),
  cantidad_reservada INTEGER NOT NULL DEFAULT 0 CHECK(cantidad_reservada >= 0),
  fecha_actualizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_producto) REFERENCES PRODUCTO(id_producto)
);

CREATE TABLE IF NOT EXISTS PEDIDO (
  id_pedido INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_pedido TEXT,
  id_contrato INTEGER NOT NULL,
  id_pedido_anterior INTEGER,
  fecha_solicitud TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega TEXT,
  direccion_entrega TEXT NOT NULL,
  monto_esperado REAL NOT NULL CHECK(monto_esperado > 0),
  estado TEXT NOT NULL CHECK(estado IN ('GENERADO', 'PROCESO', 'ENTREGADO', 'CANCELADO', 'FACTURADO')),
  FOREIGN KEY (id_contrato) REFERENCES CONTRATO(id_contrato),
  FOREIGN KEY (id_pedido_anterior) REFERENCES PEDIDO(id_pedido)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pedido_codigo_pedido
  ON PEDIDO(codigo_pedido)
  WHERE codigo_pedido IS NOT NULL;

CREATE TABLE IF NOT EXISTS DETALLE_PEDIDO (
  id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pedido INTEGER NOT NULL,
  id_producto INTEGER NOT NULL,
  cantidad INTEGER NOT NULL CHECK(cantidad > 0),
  precio_unitario REAL NOT NULL CHECK(precio_unitario >= 0),
  subtotal REAL GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido),
  FOREIGN KEY (id_producto) REFERENCES PRODUCTO(id_producto)
);

CREATE TABLE IF NOT EXISTS PAGO (
  id_pago INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pedido INTEGER NOT NULL UNIQUE,
  id_tarjeta INTEGER NOT NULL,
  fecha_pago TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  monto REAL NOT NULL CHECK(monto > 0),
  estado_pago TEXT NOT NULL CHECK(estado_pago IN ('APROBADO', 'ANULADO')),
  FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido),
  FOREIGN KEY (id_tarjeta) REFERENCES TARJETA(id_tarjeta)
);

CREATE TABLE IF NOT EXISTS ETIQUETA (
  id_etiqueta INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pedido INTEGER NOT NULL UNIQUE,
  fecha_generacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido)
);

CREATE TABLE IF NOT EXISTS HISTORIAL_PEDIDO (
  id_historial INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pedido INTEGER NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL CHECK(estado_nuevo IN ('GENERADO', 'PROCESO', 'ENTREGADO', 'CANCELADO', 'FACTURADO')),
  fecha_cambio TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_cambio TEXT NOT NULL DEFAULT 'turso-app',
  observacion TEXT,
  FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido)
);

CREATE TABLE IF NOT EXISTS REPORTE_MENSUAL (
  id_reporte INTEGER PRIMARY KEY AUTOINCREMENT,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK(mes BETWEEN 1 AND 12),
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  total_pedidos INTEGER NOT NULL DEFAULT 0 CHECK(total_pedidos >= 0),
  cantidad_ventas INTEGER NOT NULL DEFAULT 0 CHECK(cantidad_ventas >= 0),
  total_unidades INTEGER NOT NULL DEFAULT 0 CHECK(total_unidades >= 0),
  monto_ventas REAL NOT NULL DEFAULT 0 CHECK(monto_ventas >= 0),
  fecha_generacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(anio, mes)
);

CREATE TRIGGER IF NOT EXISTS t_paz_y_salvo
BEFORE INSERT ON PEDIDO
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM CONTRATO c
        JOIN PEDIDO p ON p.id_contrato = c.id_contrato
        LEFT JOIN PAGO pg ON pg.id_pedido = p.id_pedido AND pg.estado_pago = 'APROBADO'
        WHERE c.id_cliente = (SELECT id_cliente FROM CONTRATO WHERE id_contrato = NEW.id_contrato)
          AND p.estado <> 'CANCELADO'
          AND pg.id_pago IS NULL
      )
      THEN RAISE(ABORT, 'Su pedido está suspendido')
    END;
END;

CREATE VIEW IF NOT EXISTS vw_pedidos_actuales AS
SELECT
  p.id_pedido,
  p.codigo_pedido,
  p.fecha_solicitud,
  p.fecha_entrega,
  p.direccion_entrega,
  p.monto_esperado,
  p.estado,
  c.id_cliente,
  c.nombre AS cliente_nombre,
  c.apellido AS cliente_apellido,
  pr.id_provincia,
  pr.nombre AS provincia_nombre,
  pr.prefijo,
  pl.id_plan,
  pl.nombre AS plan_nombre,
  d.id_producto,
  d.cantidad,
  COALESCE(pg.estado_pago = 'APROBADO', 0) AS pagado
FROM PEDIDO p
JOIN CONTRATO ct ON ct.id_contrato = p.id_contrato
JOIN CLIENTE c ON c.id_cliente = ct.id_cliente
JOIN PROVINCIA pr ON pr.id_provincia = c.id_provincia
JOIN PLAN_PEDIDO pl ON pl.id_plan = ct.id_plan
LEFT JOIN DETALLE_PEDIDO d ON d.id_pedido = p.id_pedido
LEFT JOIN PAGO pg ON pg.id_pedido = p.id_pedido AND pg.estado_pago = 'APROBADO'
WHERE p.estado IN ('GENERADO', 'PROCESO');

CREATE VIEW IF NOT EXISTS vw_historial_pedidos AS
SELECT
  p.id_pedido,
  p.codigo_pedido,
  p.fecha_solicitud,
  p.fecha_entrega,
  p.direccion_entrega,
  p.monto_esperado,
  p.estado,
  h.estado_anterior,
  h.estado_nuevo,
  h.fecha_cambio,
  c.id_cliente,
  pr.prefijo,
  pl.nombre AS plan_nombre,
  d.id_producto,
  d.cantidad,
  COALESCE(pg.estado_pago = 'APROBADO', 0) AS pagado
FROM PEDIDO p
JOIN CONTRATO ct ON ct.id_contrato = p.id_contrato
JOIN CLIENTE c ON c.id_cliente = ct.id_cliente
JOIN PROVINCIA pr ON pr.id_provincia = c.id_provincia
JOIN PLAN_PEDIDO pl ON pl.id_plan = ct.id_plan
LEFT JOIN DETALLE_PEDIDO d ON d.id_pedido = p.id_pedido
LEFT JOIN HISTORIAL_PEDIDO h ON h.id_pedido = p.id_pedido
LEFT JOIN PAGO pg ON pg.id_pedido = p.id_pedido AND pg.estado_pago = 'APROBADO';

CREATE VIEW IF NOT EXISTS vw_pagos_clientes AS
SELECT
  pg.id_pago,
  pg.id_pedido,
  p.codigo_pedido,
  pg.fecha_pago,
  pg.monto,
  pg.estado_pago,
  t.tipo_tarjeta,
  c.id_cliente,
  c.nombre AS cliente_nombre,
  c.apellido AS cliente_apellido,
  pl.nombre AS plan_nombre
FROM PAGO pg
JOIN PEDIDO p ON p.id_pedido = pg.id_pedido
JOIN TARJETA t ON t.id_tarjeta = pg.id_tarjeta
JOIN CONTRATO ct ON ct.id_contrato = p.id_contrato
JOIN CLIENTE c ON c.id_cliente = ct.id_cliente
JOIN PLAN_PEDIDO pl ON pl.id_plan = ct.id_plan;

INSERT OR IGNORE INTO PROVINCIA (id_provincia, nombre, prefijo) VALUES
  (1, 'Panama', 'PA'),
  (2, 'Chiriqui', 'CH'),
  (3, 'Colon', 'CO'),
  (4, 'Cocle', 'OC');

INSERT OR IGNORE INTO PLAN_PEDIDO (id_plan, nombre, cantidad_minima, cantidad_maxima, precio, activo) VALUES
  (1, 'Unitario', 1, 1, 50, 1),
  (2, 'Doble', 2, 2, 70, 1),
  (3, 'Multiple', 3, NULL, 90, 1);
