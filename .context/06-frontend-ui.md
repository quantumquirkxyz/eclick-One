# Frontend UI — apps/web

## Ubicación y stack

El frontend se encuentra en `apps/web` y utiliza React con Vite y TypeScript. Apache ECharts se usa para las visualizaciones de datos. La aplicación está orientada a una experiencia profesional en español para el usuario final panameño.

## Consumo de API

El frontend consume la API REST a través de la variable de entorno `VITE_API_BASE_URL`. Durante el desarrollo, Vite proxy las solicitudes `/api` hacia el servidor de la API en `http://localhost:3000`. Los tipos de datos del frontend deben derivar desde `@eclick-one/domain` siempre que sea posible, evitando la duplicación de definiciones de entidades.

## Vistas de la consola operativa

La aplicación debe incluir las siguientes vistas principales:

- **Dashboard** — panel con métricas generales y gráficas de resumen
- **Clientes** — gestión y consulta de clientes
- **Productos** — catálogo de productos
- **Inventario** — estado del stock por producto
- **Pedidos** — listado, creación y gestión de pedidos
- **Pagos** — historial de pagos y registro de nuevos pagos
- **Reportes** — reportes operativos

## Estados de UI

Cada vista debe manejar los siguientes estados: carga (loading), error, sin datos (empty), éxito con datos (success) y reintento (retry). Los datos mock no deben estar incrustados dentro de los componentes visuales; deben venir de la API.

## Gráficas con ECharts

Las visualizaciones deben incluir:

- Pedidos agrupados por estado
- Pagos agregados por mes
- Inventario comparando ventas, bodega y reservado
- Productos más consumidos
- Clientes que no están paz y salvo
- Pedidos en proceso próximos a superar el límite de 48 horas
- Preferencia de producto por cliente

## Mocks

Si se utilizan datos mock en el frontend, deben estar claramente identificados como datos sintéticos, separados en una carpeta `mocks/` y no mezclados con la lógica de componentes o servicios.
