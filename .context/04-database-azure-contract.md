# Database Contract — Contrato Azure SQL

## Propósito

La base de datos real será desarrollada y administrada por una persona externa en Azure SQL Database. Este repositorio no implementa migraciones ni administra el esquema de la base de datos. En su lugar, define un contrato de consumo que la aplicación debe respetar para funcionar correctamente cuando el modo SQL esté activo.

## Modos de operación

La aplicación soporta dos modos controlados por la variable `REPOSITORY_MODE`:

- `mock`: los datos se gestionan en memoria dentro del proceso. Es el modo por defecto y permite desarrollo y demostración sin infraestructura externa.
- `sql`: la aplicación se conecta a Azure SQL Database y consulta las vistas y procedimientos definidos en el contrato.

## Variables de entorno

```
REPOSITORY_MODE=mock|sql
AZURE_SQL_SERVER=servidor.database.windows.net
AZURE_SQL_PORT=1433
AZURE_SQL_DATABASE=eclick_one
AZURE_SQL_USER=usuario
AZURE_SQL_PASSWORD=contraseña
AZURE_SQL_ENCRYPT=true
AZURE_SQL_TRUST_SERVER_CERTIFICATE=false
```

## Vistas para lecturas

Todas las lecturas deben realizarse sobre vistas del esquema `app`. Las vistas expuestas son:

- `app.vw_provinces` — provincias con code, name
- `app.vw_clients` — clientes con todos los campos del dominio
- `app.vw_products` — productos con código, nombre, categoría, activo
- `app.vw_inventory` — inventario por producto
- `app.vw_orders` — pedidos con todos los campos del dominio
- `app.vw_payments` — historial de pagos append-only

## Procedimientos almacenados para escrituras

Las mutaciones deben ejecutarse mediante procedimientos almacenados, no mediante INSERT, UPDATE o DELETE directos sobre tablas. Los procedimientos propuestos son:

- `app.usp_cliente_create` — crea un cliente y retorna `codigo_cliente`
- `app.usp_producto_create` — crea un producto y retorna `codigo_producto`
- `app.usp_pedido_create` — valida paz y salvo, reserva inventario, guarda dirección y retorna `codigo_pedido`
- `app.usp_pago_record` — agrega un pago al historial, idempotente por referencia
- `app.usp_pedido_transition` — valida y ejecuta transiciones de estado
- `app.usp_preferencia_cliente` — calcula o retorna la preferencia de un cliente

## Comportamiento esperado

Si `REPOSITORY_MODE=sql` y una operación no está disponible en Azure SQL (por ejemplo, porque el procedimiento almacenado aún no fue implementado), la aplicación debe devolver un error controlado y legible, no un error crudo de SQL. La aplicación no debe asumir que tiene permisos para realizar operaciones DDL o DML directas sobre las tablas.
