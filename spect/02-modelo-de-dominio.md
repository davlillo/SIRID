# Modelo de dominio

## Entidades

### User

Representa al cliente o administrador autenticado. Campos principales: `id`, `google_subject`, `email`, `name`, `avatar_url`, `role`, `created_at`, `updated_at`.

### Facility

Instalacion reservable o informativa. Campos: `id`, `slug`, `name`, `description`, `sport_type`, `facility_kind`, `surface`, `capacity`, `location_label`, `is_bookable`, `is_active`, `metadata`.

Tipos iniciales de `facility_kind`: `STADIUM`, `FIELD`, `COURT`, `POOL`, `EVENT_SPACE`, `MULTIUSE`. Ejemplos de `sport_type`: `FOOTBALL_11`, `FOOTBALL_7`, `FOOTBALL_5`, `BASKETBALL`, `SWIMMING`, `EVENT`, `MULTIUSE`.

### FacilitySchedule

Horario operativo de una instalacion. Campos: `id`, `facility_id`, `weekday`, `opens_at`, `closes_at`, `is_active`.

### FacilityRate

Tarifa vigente para una instalacion y periodo. Campos: `id`, `facility_id`, `name`, `amount`, `currency`, `minimum_minutes`, `valid_from`, `valid_until`, `is_active`.

### Reservation

Solicitud de uso. Campos: `id`, `customer_id`, `facility_id`, `starts_at`, `ends_at`, `status`, `quoted_amount`, `currency`, `customer_note`, `admin_note`, `created_at`, `updated_at`.

### ReservationEvent

Registro de auditoria. Campos: `id`, `reservation_id`, `actor_id`, `event_type`, `from_status`, `to_status`, `metadata`, `created_at`.

## Relaciones

```text
User 1 -------- N Reservation
Facility 1 ---- N Reservation
Facility 1 ---- N FacilitySchedule
Facility 1 ---- N FacilityRate
Reservation 1 - N ReservationEvent
User 1 -------- N ReservationEvent
```

## Estados

```text
PENDING -> CONFIRMED -> COMPLETED
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
```

Solo `PENDING` y `CONFIRMED` ocupan una franja. `CANCELLED` y `COMPLETED` no bloquean nuevas reservas.

## Invariantes

- `ends_at` debe ser posterior a `starts_at`.
- La duracion debe respetar la configuracion de la instalacion.
- El periodo debe estar dentro de un horario operativo.
- Una reserva siempre pertenece a un cliente y una instalacion existentes.
- `quoted_amount` se calcula en el servidor y se conserva como historico.
- El cliente solo puede cancelar sus reservas que aun no esten completadas.
- Solo un administrador puede confirmar, cancelar administrativamente o completar.
