# Real Azure SQL Contract

The application consumes the `bd_eclick` database on
`eclick-server1.database.windows.net` through the least-privilege user
`app_eclick`. The owner-provided details are consolidated in
`docs/db-contract.md`.

## Access

- `REPOSITORY_MODE=mock|sql`
- Azure SQL Database over TCP 1433
- `Encrypt=true`, `TrustServerCertificate=false`
- The firewall must allow the public outbound IP of the API process.

## Real Objects

Main tables: `dbo.PROVINCIA`, `CLIENTE`, `TARJETA`, `PLAN_PEDIDO`,
`CONTRATO`, `PRODUCTO`, `INVENTARIO`, `PEDIDO`, `DETALLE_PEDIDO`, `PAGO`,
`ETIQUETA`, `HISTORIAL_PEDIDO`, and `REPORTE_MENSUAL`.

Views: `dbo.vw_pedidos_actuales`, `dbo.vw_historial_pedidos`, and
`dbo.vw_pagos_clientes`.

Procedures: `dbo.p_registrar_o_buscar_cliente`, `p_registrar_tarjeta`,
`p_crear_contrato`, `p_crear_pedido`, `p_renovar_pedido`,
`p_agregar_detalle_pedido`, `p_quitar_detalle_pedido`, `p_registrar_pago`,
`p_cambiar_estado_pedido`, `p_preferencia_cliente`, `p_busqueda`,
`p_cuenta_producto`, `p_reporte_mensual`, and `p_control_pedidos_vencidos`.

The backend does not calculate provincial order codes, amounts, inventory, or
delivery dates. It does not execute DDL or directly modify business tables.
