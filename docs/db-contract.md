# Azure SQL consumption contract

This application consumes the existing `bd_eclick` Azure SQL Database. It does
not create tables, calculate business values, or perform direct business DML.
The SQL schema, trigger, procedures and exact rules are owned by the database.

## Connection

The API uses `REPOSITORY_MODE=sql` with the `AZURE_SQL_*` variables from
`.env.example`. Transport must use `Encrypt=true` and
`TrustServerCertificate=false`. The application user is `app_eclick`; never use
the server administrator or commit credentials.

## Read operations

The adapter reads the base catalog tables with parameterized `SELECT` queries:

- `dbo.PROVINCIA`
- `dbo.CLIENTE`, `dbo.TARJETA`, `dbo.CONTRATO`, `dbo.PEDIDO`, `dbo.PAGO`
- `dbo.PRODUCTO` and `dbo.INVENTARIO`

Operational reads use the supplied views:

- `dbo.vw_pedidos_actuales`
- `dbo.vw_historial_pedidos`
- `dbo.vw_pagos_clientes`

The adapter maps the Spanish SQL schema to the stable English REST/domain
contract. `PRODUCTO` has no category column in the supplied schema, so the API
exposes `categoria: "General"` as a compatibility label. The backend never
constructs `codigo_pedido`, `monto_esperado` or `fecha_entrega`.

### Required read permissions

The permission snippet in the delivery document grants catalog and view access,
but the current API also needs read-only lookup access to `CLIENTE`, `TARJETA`,
`CONTRATO`, `PEDIDO` and `PAGO` for client resolution, active contracts/cards,
and post-procedure results. The database owner must either grant `SELECT` on
those five tables to `rol_app_eclick` or expose equivalent procedures/views. If
neither is done, SQL mode will correctly fail with a permission error rather
than falling back to mock data.

## Business procedures

All writes and database-owned calculations use these procedures:

| Operation | Procedure |
| --- | --- |
| Register/find client | `dbo.p_registrar_o_buscar_cliente` |
| Register test card | `dbo.p_registrar_tarjeta` |
| Create order | `dbo.p_crear_pedido` |
| Add order detail | `dbo.p_agregar_detalle_pedido` |
| Remove order detail | `dbo.p_quitar_detalle_pedido` |
| Register payment | `dbo.p_registrar_pago` |
| Change order state | `dbo.p_cambiar_estado_pedido` |
| Client preference | `dbo.p_preferencia_cliente` |
| Search/report procedures | `dbo.p_busqueda`, `dbo.p_cuenta_producto`, `dbo.p_reporte_mensual` |

Creating an order executes `p_crear_pedido` and
`p_agregar_detalle_pedido` inside one SQL transaction. Payments are delegated
to `p_registrar_pago`, which validates the plan/card/mount, sets `PROCESO`, and
calculates delivery as payment time plus 48 hours. The trigger
`dbo.t_paz_y_salvo` remains authoritative for suspended orders.

## Network

The Azure SQL logical server must allow the public outbound IP of the machine
running the API. Local development and hosted deployments have different
outbound IPs; add all required App Service outbound addresses when applicable.
Do not open the server to `0.0.0.0–255.255.255.255`.

## Error boundary

Procedure messages are converted into controlled API conflict responses. Raw
SQL connection errors are logged server-side and are not returned to clients.
