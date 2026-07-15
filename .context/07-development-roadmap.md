# Development Roadmap — Ruta de Desarrollo

## Prioridades establecidas

El desarrollo debe seguir el orden de prioridades definido a continuación. Saltar pasos o implementar funcionalidades avanzadas antes de tener la base estable introduce riesgo técnico y deuda innecesaria.

### 1. Mantener coherencia del dominio

El paquete `packages/domain` debe ser la fuente de verdad del proyecto. Las entidades, reglas de negocio y contratos de repositorio deben estar completos, tipados y probados antes de trabajar en cualquier otra capa. Cualquier cambio en los requisitos debe reflejarse primero aquí.

### 2. Completar la App Web en modo mock

El frontend debe ser completamente funcional y demostrable con datos mock. Esto incluye todas las vistas, gráficas, estados de UI y flujos de navegación. La aplicación no debe depender de Azure SQL para ser demostrada.

### 3. Completar endpoints REST mock

Todos los endpoints de lectura y operativos deben estar implementados y funcionando contra repositorios mock. Los servicios deben aplicar correctamente las reglas de negocio del dominio.

### 4. Preparar adaptador Azure SQL

El adaptador SQL debe implementar los mismos contratos de repositorio que los mocks, pero consultando vistas y ejecutando procedimientos almacenados. No debe requerir una base de datos real para ser desarrollado y probado.

### 5. Agregar pruebas

Las pruebas unitarias y de integración deben cubrir las reglas de negocio, los repositorios mock, los servicios y los endpoints principales. Ver la sección de testing para la lista completa de casos requeridos.

### 6. Mejorar documentación

La documentación del proyecto debe mantenerse actualizada, incluyendo este directorio `.context/`, el `README.md` y el contrato de base de datos en `docs/db-contract.md`.

### 7. Funcionalidades opcionales

Autenticación, roles de usuario, despliegue complejo, Mastra, OpenRouter y cualquier funcionalidad de IA solo deben considerarse después de que la App Web sea estable y demostrable. Si se integra IA en el futuro, debe ser auxiliar y nunca responsable de validar reglas de negocio críticas.

## Restricciones

No se deben introducir entidades fuera del enunciado académico sin marcarlas explícitamente como extensiones opcionales. No se debe mezclar sintaxis SQL de distintos motores. No se deben implementar migraciones de base de datos. No se deben introducir datos reales ni credenciales en el repositorio.
