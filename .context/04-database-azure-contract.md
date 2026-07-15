# Contrato real de Azure SQL

La aplicación consume la base `bd_eclick` en el servidor
`eclick-server1.database.windows.net` mediante el usuario mínimo
`app_eclick`. El detalle entregado por el propietario está consolidado en
`docs/db-contract.md`.

## Acceso

- `REPOSITORY_MODE=mock|sql`
- Azure SQL Database, TCP 1433
- `Encrypt=true`, `TrustServerCertificate=false`
- El firewall debe autorizar la IP pública de salida del proceso API.

## Objetos reales

Tablas principales: `dbo.PROVINCIA`, `CLIENTE`, `TARJETA`, `PLAN_PEDIDO`,
`CONTRATO`, `PRODUCTO`, `INVENTARIO`, `PEDIDO`, `DETALLE_PEDIDO`, `PAGO`,
`ETIQUETA`, `HISTORIAL_PEDIDO` y `REPORTE_MENSUAL`.

Vistas: `dbo.vw_pedidos_actuales`, `dbo.vw_historial_pedidos` y
`dbo.vw_pagos_clientes`.

Procedimientos: `dbo.p_registrar_o_buscar_cliente`, `p_registrar_tarjeta`,
`p_crear_contrato`, `p_crear_pedido`, `p_renovar_pedido`,
`p_agregar_detalle_pedido`, `p_quitar_detalle_pedido`, `p_registrar_pago`,
`p_cambiar_estado_pedido`, `p_preferencia_cliente`, `p_busqueda`,
`p_cuenta_producto`, `p_reporte_mensual` y `p_control_pedidos_vencidos`.

El backend no calcula códigos provinciales, montos, inventario ni fechas de
entrega. No ejecuta DDL ni modifica directamente tablas de negocio.
