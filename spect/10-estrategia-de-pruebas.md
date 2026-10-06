# Estrategia de pruebas

## Piramide

1. Unitarias para reglas de dominio y transiciones.
2. Integracion para servicios, ORM y PostgreSQL real.
3. API para permisos y contratos HTTP.
4. E2E con Playwright para los flujos criticos.

## Backend

- `pytest`, `pytest-asyncio` y `httpx`.
- PostgreSQL en Docker para integracion.
- Alembic `upgrade` y `downgrade` en CI.
- Probar constraint de solapamiento con dos transacciones concurrentes.
- Probar tarifas, horarios y cambios de estado.
- Probar token Google invalido, expirado y audiencia incorrecta.

## Frontend

- Vitest y Testing Library para componentes y estados.
- Playwright para landing, login simulado, catalogo, reserva y panel admin.
- Verificacion responsive en viewport mobile y desktop.
- Verificacion de foco, labels, teclado y fallback del plano 3D.

## Casos de aceptacion criticos

| Caso | Resultado esperado |
|---|---|
| Cliente crea reserva valida | `201`, estado `PENDING` y correo de solicitud |
| Periodo solapado | `409`, no se crea segunda reserva |
| Reserva cancelada | La franja vuelve a estar disponible |
| Cliente consulta reserva ajena | Acceso rechazado |
| Usuario sin rol admin gestiona catalogo | `403` |
| Admin confirma pendiente | Estado `CONFIRMED` y correo |
| Admin completa reserva futura | Rechazo de regla de dominio |
| SMTP no responde | Reserva permanece, error registrado |

## Calidad

- Linter y formatter en frontend y backend.
- Lockfiles versionados.
- No secretos detectados en el repositorio.
- Cobertura enfocada en reglas de negocio, no en porcentaje artificial.
