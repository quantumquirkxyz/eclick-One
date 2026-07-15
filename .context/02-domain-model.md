# Domain Model — Modelo de Dominio

El modelo de dominio está definido en `packages/domain/src/entities.ts` y contiene las seis entidades principales derivadas del modelo ER académico. Este paquete no tiene dependencias externas y es consumido por todos los demás paquetes.

## Provincia

Representa una provincia de Panamá. Sus campos son `id`, `codigo`, `nombre` y `prefijo`. El prefijo es una cadena de dos letras mayúsculas que se utiliza para construir el código único del pedido. La provincia es una entidad de referencia que no cambia con frecuencia.

## Cliente

Representa una persona que realiza compras en eclick One. Sus campos incluyen `codigo_cliente` (autogenerado desde 1), `nombre`, `apellido`, `identificacion`, `provincia` (objeto Provincia embebido), `tipo_tarjeta` y `paz_y_salvo`. Los campos `email` y `phone` son extensiones opcionales que no pertenecen al modelo académico base. No se deben guardar números completos de tarjeta en producción.

## Producto

Representa un producto o programa ofrecido por eclick One. Sus campos son `codigo_producto` (autogenerado desde 1000), `nombre`, `categoria` y `activo` (opcional para propósitos de UI). No existe un precio unitario por producto; el monto se calcula por cantidad según las reglas de negocio.

## Inventario

Representa el stock asociado a un producto con una relación 1:1. Sus campos son `codigo_producto`, `cant_ventas`, `cant_bodega`, `cant_reservado` y `nivel_reposicion` (opcional para alertas visuales). El inventario refleja el estado actual del stock y se actualiza con cada pedido.

## Pedido

Representa una solicitud de compra. Sus campos son `codigo_pedido` (incluye prefijo de provincia), `codigo_cliente`, `codigo_producto`, `cantidad`, `monto`, `etiqueta`, `direccion`, `fecha_pedido`, `fecha_entrega`, `estado`, `tipo_duracion` y `pagado` (derivado opcional desde el historial de pagos). Cada pedido debe tener un código único, una etiqueta única, un cliente, un producto, una cantidad, un monto, una dirección, una fecha y un estado válido.

## Pago

Representa un registro de pago dentro del historial. Sus campos son `id_pago` (clave inmutable), `codigo_pedido`, `monto_pagado`, `fecha_pago`, `tipo_tarjeta` y `referencia` (opcional). Los pagos se almacenan como historial append-only: una vez registrados, no se modifican ni eliminan.

## Relaciones principales

Una provincia puede tener muchos clientes. Un cliente pertenece exactamente a una provincia. Un cliente puede realizar muchos pedidos. Un producto puede aparecer en muchos pedidos. Cada producto tiene exactamente un registro de inventario. Un pedido puede tener uno o varios pagos registrados.

La provincia de un pedido se obtiene a través del cliente asociado. No se debe conectar Provincia directamente con Pedido, ya que eso duplicaría información y podría generar inconsistencias. La dirección de entrega pertenece al pedido como un snapshot y no debe inferirse desde los datos del cliente.
