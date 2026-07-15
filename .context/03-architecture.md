# Architecture — Arquitectura del Monorepo

## Stack tecnológico

El proyecto utiliza Bun como runtime y gestor de paquetes, TypeScript como lenguaje principal, React con Vite para el frontend, Apache ECharts para visualizaciones de datos, y el driver mssql como preparación para la conexión futura con Azure SQL Database. Mastra y OpenRouter son herramientas opcionales que solo deben integrarse si se agregan funciones de IA, y nunca deben usarse para validar reglas de negocio críticas.

## Estructura de directorios

```text
apps/
  api/       Backend REST con Bun + TypeScript
  web/       Frontend React + Vite + TypeScript
packages/
  domain/    Entidades, reglas de negocio puras y contratos de repositorio
  db/        Repositorios mock y adaptador para Azure SQL
  shared/    Utilidades compartidas (env, helpers)
docs/
  db-contract.md  Contrato de consumo de Azure SQL
eclick-one-ui-ux/  Paquete fuente de UI/UX suministrado
```

## Dirección de dependencias

Las dependencias fluyen hacia adentro. `apps/web` y `apps/api` dependen de `packages/db` y `packages/domain`. `packages/db` depende de `packages/domain`. `packages/domain` no depende de ningún framework, base de datos, React, servidor HTTP ni infraestructura externa. Esto garantiza que las reglas de negocio sean portables y probables de forma aislada.

## Flujo de la aplicación

El frontend en `apps/web` consume la API REST expuesta por `apps/api` a través de `VITE_API_BASE_URL`. La API sigue una arquitectura por capas: las rutas reciben la solicitud HTTP, los controladores orquestan la respuesta, los servicios aplican las reglas de negocio del dominio, los repositorios abstraen el acceso a datos, y la capa de base de datos gestiona la conexión (mock o Azure SQL). Los errores se manejan de forma centralizada en la capa de errores.

## Capa de persistencia

El paquete `packages/db` contiene repositorios mock que funcionan con datos en memoria mutable y un adaptador para Azure SQL que consulta vistas y ejecuta procedimientos almacenados. La selección del modo se realiza mediante la variable de entorno `REPOSITORY_MODE` con valores `mock` o `sql`. Cuando Azure SQL no está disponible, el modo mock permite que la aplicación sea completamente funcional y demostrable.
