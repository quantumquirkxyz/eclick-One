INSERT OR IGNORE INTO PROVINCIA (id_provincia, nombre, prefijo) VALUES
  (1, 'Panama', 'PA'),
  (2, 'Chiriqui', 'CH'),
  (3, 'Colon', 'CO'),
  (4, 'Cocle', 'OC');

INSERT OR IGNORE INTO PLAN_PEDIDO (id_plan, nombre, cantidad_minima, cantidad_maxima, precio, activo) VALUES
  (1, 'Unitario', 1, 1, 50, 1),
  (2, 'Doble', 2, 2, 70, 1),
  (3, 'Multiple', 3, NULL, 90, 1);

INSERT OR IGNORE INTO PRODUCTO (id_producto, nombre, descripcion, precio_unitario, activo) VALUES
  (1000, 'Academic Laptop', 'Mock catalog product for demonstrations', 0, 1), (1001, 'Ergonomic Chair', 'Mock catalog product for demonstrations', 0, 1),
  (1002, 'Laser Printer', 'Mock catalog product for demonstrations', 0, 1), (1003, 'Stationery Kit', 'Mock catalog product for demonstrations', 0, 1);

INSERT OR IGNORE INTO INVENTARIO (id_producto, cantidad_ventas, cantidad_bodega, cantidad_reservada) VALUES
  (1000, 19, 34, 4), (1001, 14, 18, 6), (1002, 11, 8, 3), (1003, 7, 24, 2);

INSERT OR IGNORE INTO CLIENTE (
  id_cliente, id_provincia, nombre, apellido, tipo_identificacion, numero_identificacion, activo
) VALUES (1, 1, 'Ana', 'Morales', 'CEDULA', '8-000-001', 1), (2, 2, 'Carlos', 'Rios', 'CEDULA', '4-000-002', 1), (3, 3, 'Lucia', 'Castillo', 'CEDULA', '3-000-003', 1);

INSERT OR IGNORE INTO TARJETA (id_tarjeta, id_cliente, numero_tarjeta, tipo_tarjeta, activa) VALUES
  (1, 1, '4111111111110001', 'CR', 1), (2, 2, '5555555555550002', 'DB', 1), (3, 3, '4111111111110003', 'CR', 1);
