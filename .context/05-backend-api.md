# Backend API — apps/api

## Ubicación y arquitectura

El backend se encuentra en `apps/api` y sigue una arquitectura por capas con las siguientes categorías:

- `routes/` — definición de rutas y middleware HTTP
- `controllers/` — manejo de request/response, orquestación
- `services/` — lógica de aplicación que invoca reglas del dominio
- `repositories/` — abstracción de persistencia (consume contratos de `packages/domain`)
- `database/` — conexión y configuración de la base de datos
- `errors/` — manejo centralizado de errores HTTP y de dominio

Las reglas de negocio no deben residir en los controladores. Deben estar en `packages/domain` (reglas puras) o en los servicios (orquestación).

## Endpoints de lectura

| Método | Ruta | Propósito |
|--------|------|-----------|
| GET | `/api/v1/health` | Estado del servidor |
| GET | `/api/v1/dashboard` | Métricas del panel principal |
| GET | `/api/v1/provinces` | Lista de provincias |
| GET | `/api/v1/customers` | Lista de clientes |
| GET | `/api/v1/clientes` | Alias académico de clientes |
| GET | `/api/v1/products` | Lista de productos |
| GET | `/api/v1/inventory` | Inventario completo |
| GET | `/api/v1/orders` | Lista de pedidos |
| GET | `/api/v1/payments` | Historial de pagos |
| GET | `/api/v1/reports` | Reportes operativos |

## Endpoints operativos

| Método | Ruta | Propósito |
|--------|------|-----------|
| POST | `/api/v1/customers` | Crear un cliente |
| POST | `/api/v1/orders` | Crear un pedido |
| POST | `/api/v1/payments` | Registrar un pago |
| PATCH | `/api/v1/orders/:codigo_pedido/status` | Cambiar estado de un pedido |
| GET | `/api/v1/customers/:codigo_cliente/preference` | Preferencia de un cliente |
| GET | `/api/v1/orders/current` | Pedidos actuales en proceso |

## Comportamiento en modo mock

Mientras Azure SQL no esté disponible, todos los endpoints deben funcionar contra repositorios mock que mantienen los datos en memoria. Los servicios deben aplicar las mismas reglas de negocio independientemente del modo de persistencia.
