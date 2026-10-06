# Backend · SIRID Reserva

API REST en FastAPI. Los routers coordinan; las reglas viven en servicios de aplicacion y las
consultas en repositorios.

## Capas

```text
api/              HTTP: rutas, dependencias, rate limit y problem+json
services/         casos de uso y reglas de aplicacion
domain/           enums, errores y reglas puras (sin ORM, sin HTTP, sin IO)
repositories/     consultas SQLAlchemy
infrastructure/   engine, modelos ORM y Google Identity
notifications/    plantillas Jinja2 de correo
seeds/            catalogo de desarrollo, idempotente
```

La dependencia apunta hacia adentro: un servicio nunca importa un router.

## Servicios

| Servicio | Responsabilidad |
|---|---|
| `AuthService` | Verifica el ID token de Google, crea o vincula el usuario y emite la sesion |
| `UserService` | Usuario autenticado y cambio controlado de rol |
| `FacilityService` | Catalogo, CRUD, metadatos del plano y regla de instalacion no reservable |
| `ScheduleService` | Horario semanal; valida rangos invalidos y solapes del mismo dia |
| `RateService` | Tarifa vigente y cotizacion por bloques completos |
| `AvailabilityService` | Combina horario, reservas activas y fecha; no crea nada |
| `ReservationService` | Crea reservas, valida transiciones y traduce el conflicto de PostgreSQL |
| `NotificationService` | Renderiza y envia correo despues del commit; registra fallos |
| `AuditService` | `ReservationEvent` en la misma transaccion que el cambio de estado |

## Reglas que dependen de PostgreSQL

La restriccion anti-solapamiento no es una consulta de la aplicacion:

```sql
EXCLUDE USING gist (
  facility_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status IN ('PENDING', 'CONFIRMED'))
```

`ReservationService` valida antes solo para dar un mensaje util. Cuando dos peticiones
compiten, PostgreSQL rechaza una y la API responde `409`. El `IntegrityError` puede aparecer
tanto en el `flush` del INSERT como en el `commit`, y ambos se traducen a `ReservationConflict`.

## Comandos

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seeds.seed_demo
docker compose exec backend python -m pytest -q
docker compose exec backend alembic revision -m "describe_change"
```

## Variables

Ver `.env.example` en la raiz. Sin `GOOGLE_CLIENT_ID` el login queda deshabilitado; sin
credenciales SMTP los correos se registran como `SKIPPED` y el sistema sigue funcionando.

`ADMIN_EMAILS` es una lista separada por comas: esos correos reciben rol `ADMIN` al iniciar
sesion. La promocion viene de la configuracion del servidor, nunca del navegador.
`ENCARGADO_EMAILS` funciona igual para el rol `ENCARGADO`, limitado al registro de
clientes y la gestion de tarifas. Si un correo aparece en ambas listas, prevalece `ADMIN`.

## Notas de implementacion

- Los tipos ENUM de PostgreSQL se crean una sola vez en la migracion; las columnas los
  referencian con `create_type=False` para que `create_table` no intente recrearlos.
- En contexto async no se debe tocar una relacion ORM no cargada: dispara IO fuera del
  greenlet y revienta con `MissingGreenlet`. El seed usa sentencias explicitas por eso.
- Las pruebas comparten el engine de modulo, asi que `conftest` vacia el pool despues de cada
  caso: una conexion asyncpg queda ligada al event loop que la creo.
