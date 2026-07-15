# Agent Instructions — Instrucciones para Agentes de Desarrollo

## Reglas generales

Al trabajar en este repositorio, debes conservar el nombre oficial del proyecto como **eclick One**. Para nombres técnicos, rutas de paquete y variables usa `eclick-one` y el patrón `@eclick-one/*`. No cambies este nombre ni introduzcas variantes no autorizadas.

## Antes de modificar archivos

Cuando se te solicite continuar el desarrollo, primero debes leer los archivos de esta carpeta `.context/` para comprender el contexto completo del proyecto. Luego debes revisar el código actual en los paquetes relevantes antes de hacer cualquier modificación. No asumas que conoces el estado del código sin verificarlo.

## Lo que no debes hacer

- No inventes entidades, campos o reglas de negocio que no estén en el modelo ER o en el enunciado académico.
- No guardes datos reales ni credenciales en el código o en el repositorio.
- No rompas el modo mock. La aplicación debe funcionar completamente sin Azure SQL.
- No conectes Azure SQL hasta que la base de datos esté lista y configurada.
- No dupliques tipos del dominio en el frontend. Los tipos deben venir de `@eclick-one/domain`.
- No pongas reglas de negocio críticas en los controladores de la API.
- No uses números completos de tarjeta de crédito/débito en ningún lugar del sistema.
- No cambies decisiones arquitectónicas o de diseño previas sin justificación documentada.

## Sobre la IA

Si en el futuro se integran funciones de IA (Mastra, OpenRouter), estas deben ser auxiliares y nunca responsables de validar reglas de negocio críticas. La IA no debe tomar decisiones sobre estados de pedido, montos, fechas, paz y salvo ni ninguna otra regla definida en el dominio.

## Sobre el contrato de base de datos

Las vistas y procedimientos almacenados documentados en `docs/db-contract.md` y en `04-database-azure-contract.md` son el contrato con la persona que construirá la base de datos. No modifiques estos nombres ni su estructura sin coordinación. Si un procedimiento no está disponible en Azure SQL, la aplicación debe devolver un error controlado, no un error crudo de SQL.
