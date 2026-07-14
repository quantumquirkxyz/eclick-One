# Contrato de consumo Azure SQL

Estado: contrato de aplicación propuesto para revisión con el responsable de base de datos. La aplicación no administra migraciones en esta fase. Azure SQL sigue siendo el destino de persistencia; el backend puede operar en modo `mock`, pero debe exponer el mismo contrato.

## Decisión de idioma

- Código interno TypeScript y endpoints REST: inglés (`/api/v1/customers`, `/api/v1/products`, `/api/v1/inventory`, `/api/v1/orders`, `/api/v1/payments`). Se mantiene el alias `/api/v1/clientes` para consumo académico.
- UI visible y documentación: español.
- Valores de negocio y campos del dominio: nombres del enunciado académico y del modelo ER.

## Reglas de diseño

- Azure SQL genera `codigo_cliente` desde `1` y `codigo_producto` desde `1000`.
- `fecha_pedido` no puede ser futura y no puede ser anterior al `2024-12-29`.
- Los estados oficiales de pedido son exactamente: `generado`, `proceso`, `entregado`, `cancelado`, `facturado`.
- Los pagos se preservan como historial append-only. Una corrección debe registrarse como reverso/reemplazo, no como actualización destructiva.
- La dirección pertenece al pedido como snapshot; no debe inferirse desde cliente.
- Fechas en SQL: `datetime2` o `datetimeoffset`; la API serializa ISO-8601.
- Montos en SQL: `decimal`, nunca `float`/`real`.
- El acceso de la aplicación debe usar identidad de privilegio mínimo y transporte cifrado.

## Vistas requeridas por el adaptador SQL

### `app.vw_provinces`

| Columna | Tipo SQL sugerido | Notas |
| --- | --- | --- |
| `code` | `char(2)` | Código estable de provincia |
| `name` | `nvarchar(80)` | Nombre visible |

La API mapea esta vista a `id`, `codigo`, `nombre`, `prefijo`.

### `app.vw_clients`

| Columna | Tipo SQL sugerido | Notas |
| --- | --- | --- |
| `codigo_cliente` | `int` | Generado por base de datos, mínimo `1` |
| `nombre` | `nvarchar(80)` | Nombre del cliente |
| `apellido` | `nvarchar(80)` | Apellido del cliente |
| `identificacion` | `nvarchar(32)` | Cédula/RUC u otro identificador académico |
| `provincia_codigo` | `char(2)` | Referencia a provincia |
| `provincia_nombre` | `nvarchar(80)` | Nombre de provincia para payload de lectura |
| `provincia_prefijo` | `char(2)` | Prefijo usado en pedidos |
| `tipo_tarjeta` | `char(2)` | `DB` o `CR` |
| `paz_y_salvo` | `bit` | Debe ser `1` para generar pedidos |

`email`, `phone`, `balance` y campos similares no son obligatorios en el modelo académico. Si se agregan después, deben ser extensiones opcionales y no reemplazar `paz_y_salvo`.

### `app.vw_products`

| Columna | Tipo SQL sugerido | Notas |
| --- | --- | --- |
| `codigo_producto` | `int` | Generado por base de datos, mínimo `1000` |
| `nombre` | `nvarchar(160)` | Nombre del producto |
| `categoria` | `nvarchar(80)` | Categoría del producto |
| `activo` | `bit` | Opcional para UI; no es regla académica |

`unit_price` no es obligatorio; el monto del pedido se expone como snapshot en `monto`.

### `app.vw_inventory`

| Columna | Tipo SQL sugerido | Notas |
| --- | --- | --- |
| `codigo_producto` | `int` | Referencia a producto |
| `cant_ventas` | `int` | Cantidad vendida |
| `cant_bodega` | `int` | Existencia en bodega |
| `cant_reservado` | `int` | Cantidad reservada |
| `nivel_reposicion` | `int` | Opcional para alertas visuales |

### `app.vw_orders`

| Columna | Tipo SQL sugerido | Notas |
| --- | --- | --- |
| `codigo_pedido` | `nvarchar(64)` | Identificador del pedido; debe respetar el prefijo de provincia cuando aplique |
| `codigo_cliente` | `int` | Referencia a cliente |
| `codigo_producto` | `int` | Referencia a producto |
| `cantidad` | `int` | Entero positivo |
| `monto` | `decimal(19,4)` | Snapshot monetario del pedido |
| `etiqueta` | `nvarchar(80)` | Etiqueta académica/operativa del pedido |
| `direccion` | `nvarchar(500)` | Snapshot de dirección de entrega |
| `fecha_pedido` | `datetimeoffset` | `>= 2024-12-29` y no futura |
| `fecha_entrega` | `datetimeoffset` | Nullable |
| `estado` | `varchar(20)` | `generado`, `proceso`, `entregado`, `cancelado`, `facturado` |
| `tipo_duracion` | `nvarchar(40)` | Clasificación académica de duración |
| `pagado` | `bit` | Derivado opcional desde historial de pagos |

### `app.vw_payments`

| Columna | Tipo SQL sugerido | Notas |
| --- | --- | --- |
| `id_pago` | `bigint` | Llave inmutable de historial |
| `codigo_pedido` | `nvarchar(64)` | Referencia a pedido |
| `monto_pagado` | `decimal(19,4)` | Monto positivo |
| `fecha_pago` | `datetimeoffset` | Instante de pago |
| `tipo_tarjeta` | `char(2)` | `DB` o `CR` |
| `referencia` | `nvarchar(128)` | Opcional; nunca datos sensibles de tarjeta |

## Procedimientos transaccionales propuestos

No son llamados por el adaptador de fase uno, pero definen la frontera recomendada para mutaciones futuras:

- `app.usp_cliente_create`: valida cliente y retorna `codigo_cliente`.
- `app.usp_producto_create`: valida producto y retorna `codigo_producto`.
- `app.usp_pedido_create`: valida `paz_y_salvo`, reserva inventario, guarda dirección y snapshot del pedido, aplica prefijo y retorna `codigo_pedido`.
- `app.usp_pago_record`: agrega historial de pago y retorna `id_pago`; debe ser idempotente por `referencia` cuando exista.
- `app.usp_pedido_transition`: valida transiciones de `estado` y fechas.

Las transacciones deben usar concurrencia optimista o bloqueos adecuados sobre inventario y elegibilidad de cliente. Los procedimientos deben retornar códigos de error estructurados para separar validación, conflicto e infraestructura.

## Preguntas pendientes

1. ¿Qué catálogo oficial define `tipo_duracion`?
2. ¿Cuál es el estándar definitivo del código/prefijo de provincia para `codigo_pedido`?
3. ¿`fecha_entrega` se calcula siempre 48 horas después del pago o puede venir del enunciado como dato independiente?
4. ¿El día 31 se excluye solo de reportes mensuales o requiere una regla contable adicional?
