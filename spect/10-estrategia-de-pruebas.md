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
- Probar alta por dominio activo, vínculo de cuentas provisionadas y bloqueo de organizaciones/usuarios inactivos.
- Probar aislamiento entre dos organizaciones de prueba para catálogo, disponibilidad, usuarios y reservas con IDs ajenos conocidos.
- Probar que ADMIN gestiona organizaciones/usuarios/instalaciones pero recibe `403` en cada operación de reservas.
- Probar que ENCARGADO opera reservas solo de su `organization_id` y no modifica el catálogo.

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
| Cliente/encargado gestiona catálogo | `403` |
| Admin gestiona catálogo de cualquier organización | Permitido |
| Admin consulta/actualiza reservas | `403` |
| Encargado de la organización confirma pendiente | Estado `CONFIRMED` y correo |
| Encargado consulta reserva de otro tenant | `404` |
| Admin completa reserva futura | Rechazo de autorización |
| SMTP no responde | Reserva permanece, error registrado |

## Calidad

- Linter y formatter en frontend y backend.
- Lockfiles versionados.
- No secretos detectados en el repositorio.
- Cobertura enfocada en reglas de negocio, no en porcentaje artificial.
