# Business Rules — Reglas de Negocio

## Códigos autogenerados

El campo `codigo_cliente` es autogenerado por la base de datos e inicia en 1. El campo `codigo_producto` también es autogenerado e inicia en 1000. Ninguno de estos valores debe ser asignado manualmente desde la aplicación; los repositorios mock simulan la misma secuencia.

## Tipos de tarjeta

Los únicos tipos de tarjeta válidos son `DB` (débito) y `CR` (crédito). Cualquier otro valor debe ser rechazado.

## Cálculo del monto del pedido

El monto de un pedido depende exclusivamente de la cantidad solicitada:

- 1 unidad: USD 50
- 2 unidades: USD 70
- 3 o más unidades: USD 90

No existe un precio unitario variable por producto; la regla es fija y aplica a todos los productos por igual.

## Validación de fechas

La fecha del pedido (`fecha_pedido`) tiene dos restricciones: no puede ser anterior al 29 de diciembre de 2024 y no puede ser una fecha futura. La fecha de entrega (`fecha_entrega`) debe calcularse automáticamente 48 horas después del pago o de una fecha válida definida por el sistema.

## Condiciones de entrega

Un pedido no puede ser entregado si no está pagado. La función `canDeliverOrder` en el dominio valida explícitamente esta condición.

## Paz y salvo

Un cliente que no tenga el campo `paz_y_salvo` en `true` no puede generar nuevos pedidos. Esta validación ocurre antes de crear cualquier pedido, tanto en el dominio como en los servicios.

## Estados de pedido

Los únicos estados válidos para un pedido son: `generado`, `proceso`, `entregado`, `cancelado` y `facturado`. Las transiciones permitidas están definidas en `assertOrderTransitionAllowed` dentro del dominio. No se permiten transiciones arbitrarias.

## Prefijo de provincia en código de pedido

El `codigo_pedido` debe incluir el prefijo de dos letras correspondiente a la provincia del cliente. Este prefijo se valida mediante `assertProvinceOrderCode`.

## Dirección del pedido

La dirección pertenece al pedido como un snapshot inmutable, no al cliente. Esto significa que cada pedido lleva su propia dirección en el momento de la creación.

## Historial de pagos

El historial de pagos debe conservarse de forma append-only. No se deben eliminar ni modificar registros de pago existentes. Si un pedido recurrente es reemplazado, los pagos anteriores deben permanecer intactos.

## Pedidos mensuales

Los pedidos con tipo de duración mensual cubren únicamente del día 1 al día 30 de cada mes. El día 31 está excluido de los reportes y operaciones mensuales.

## Límite de tiempo en proceso

No deben existir pedidos en estado `proceso` durante más de 48 horas, salvo que aplique una regla mensual explícita. La función `canRemainInProcess` evalúa esta política.

## Preferencia de cliente

Un producto se considera preferencia de un cliente cuando el cliente lo ha solicitado al menos tres veces. Si varios productos califican como preferencia, gana el de mayor frecuencia de solicitudes. En caso de empate, se usa la cantidad total adquirida y luego el código de producto como criterio de desempate determinístico.
