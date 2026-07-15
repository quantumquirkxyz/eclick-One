# Testing & Quality — Pruebas y Calidad

## Pruebas requeridas

El proyecto debe mantener o agregar pruebas que cubran los siguientes casos. Estas pruebas garantizan que las reglas de negocio se cumplan y que la aplicación se comporte correctamente en modo mock.

### Reglas de negocio (dominio)

- Cálculo correcto del monto según la cantidad (1 unidad = 50, 2 = 70, 3+ = 90)
- Validación de fecha mínima: `fecha_pedido` no puede ser anterior al 2024-12-29
- Rechazo de fecha futura en `fecha_pedido`
- Cálculo correcto de `fecha_entrega`: 48 horas después de la fecha base
- Bloqueo de creación de pedidos cuando `paz_y_salvo` es `false`
- Rechazo de entrega si el pedido no está pagado
- Validación de estados: transiciones permitidas y prohibidas
- Historial de pagos append-only (no se modifican ni eliminan registros)
- Cálculo de preferencia de cliente (mínimo 3 solicitudes, desempate por frecuencia y cantidad)

### Pedidos y fechas

- Listado correcto de pedidos actuales
- Exclusión del día 31 en cálculos y reportes mensuales

### Repositorios mock

- Integridad básica de datos en repositorios mock (CRUD, listados, búsquedas)

### Endpoints REST

- Pruebas de los endpoints principales (health, provinces, customers, products, inventory, orders, payments)

## Comandos de verificación

```bash
bun install          # Instalar dependencias
bun run typecheck    # Verificar tipos en todos los paquetes
bun test             # Ejecutar pruebas
bun run build        # Compilar todos los paquetes y aplicaciones
```

## Cobertura esperada

Las pruebas deben ejecutarse sin errores ni advertencias. El comando `bun test` debe reportar todos los tests como pass. No se requieren métricas de cobertura específicas, pero las pruebas deben cubrir al menos todos los casos listados anteriormente.
