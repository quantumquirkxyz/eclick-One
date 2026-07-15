# eclick One — Overview

El nombre oficial del proyecto es **eclick One**. Para efectos técnicos, rutas de paquete, nombres de repositorio, variables de entorno y cualquier referencia en código se debe usar la convención `eclick-one`. Los paquetes del monorepo siguen el patrón `@eclick-one/domain`, `@eclick-one/db`, `@eclick-one/shared`, `@eclick-one/api` y `@eclick-one/web`. Este nombre no debe cambiarse ni abreviarse.

eclick One es una aplicación web diseñada para administrar operaciones de comercio electrónico en Panamá. El proyecto surge de un enunciado académico de Base de Datos, pero se desarrolla con criterios profesionales de ingeniería de software: integridad de datos, seguridad, mantenibilidad y escalabilidad desde el inicio.

La aplicación debe gestionar los siguientes dominios operativos: clientes, provincias, productos, inventario, pedidos, pagos, historial de pagos, pedidos actuales, preferencias de cliente, reportes operativos y monitoreo del estado comercial. La base de datos real será construida aparte por otra persona en Azure SQL Database. Por lo tanto, este repositorio debe funcionar completamente en modo mock, pero estar preparado para conectarse a Azure SQL cuando la base esté disponible.

El proyecto se mantiene como un monorepo con Bun y TypeScript, con una estructura de paquetes que separa el dominio puro de la infraestructura, permitiendo que las reglas de negocio sean independientes del framework, la base de datos y el frontend.
