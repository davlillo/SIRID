# Esquema PostgreSQL

## Decisiones

- PostgreSQL 16.
- UUID generado por la aplicacion o PostgreSQL.
- `timestamptz` para instantes.
- `numeric(10,2)` para importes.
- `jsonb` para atributos propios de cada tipo de espacio, sin romper el esquema base.
- `citext` o email normalizado en minusculas para unicidad.
- Alembic para migraciones.

## Ownership multi-organización

- `organizations` contiene `id`, `slug`, `name`, `email_domain` e `is_active`; slug y dominio son únicos.
- `users.organization_id`, `facilities.organization_id` y `reservations.organization_id` son obligatorios.
- Cada usuario pertenece a una organización y mantiene un único rol (`CLIENT`, `ENCARGADO` o `ADMIN`).
- Los slugs de instalación son únicos por organización: `UNIQUE (organization_id, slug)`.
- La reserva contiene `organization_id` y usa FKs compuestas para exigir que cliente e instalación pertenezcan al mismo tenant.
- Horarios, tarifas e imágenes heredan el tenant de `facility_id`; eventos y notificaciones lo heredan de la reserva.
- ADMIN puede operar el catálogo de cualquier organización. El scope de cliente/encargado se deriva de `users.organization_id`.

## Restriccion anti-solapamiento

La migracion inicial debe habilitar `btree_gist` y crear una exclusion constraint equivalente a:

```sql
EXCLUDE USING gist (
  facility_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED'));
```

La restriccion debe estar en la tabla `reservations`. La aplicacion tambien valida antes para entregar mensajes utiles, pero no depende de esa consulta para garantizar integridad.

## Indices

- Unico en `users.google_subject`.
- Unico en `users.email`.
- Unico en `facilities(organization_id, slug)`.
- Indices en `organization_id` para users, facilities y reservations.
- `reservations(customer_id, created_at DESC)`.
- `reservations(organization_id, starts_at)` y `reservations(facility_id, starts_at)`.
- `reservations(status, starts_at)`.
- `reservation_events(reservation_id, created_at)`.

## Migraciones iniciales

1. Crear las extensiones y tablas base del complejo.
2. Crear la organización bootstrap genérica y backfillear los usuarios/instalaciones/reservas existentes.
3. Hacer `organization_id` obligatorio e imponer FKs compuestas para reservas.
4. Crear auditoría, índices y mantener la exclusion constraint anti-solapamiento.
5. Cargar datos demo por organización solo en desarrollo.

## Catalogo inicial de espacios

El seed de desarrollo debe crear como minimo:

| Espacio | Tipo | Deporte | Capacidad |
|---|---|---|---:|
| Estadio Davlillos | `STADIUM` | `FOOTBALL_11` | 5000 |
| Cancha Norte | `FIELD` | `FOOTBALL_7` | 14 |
| Cancha Sur A | `FIELD` | `FOOTBALL_5` | 10 |
| Cancha Sur B | `FIELD` | `FOOTBALL_5` | 10 |
| Arena Central | `COURT` | `BASKETBALL` | 20 |
| Piscina Olimpica | `POOL` | `SWIMMING` | 80 |
| Piscina Recreativa | `POOL` | `SWIMMING` | 40 |
| Salon Principal | `EVENT_SPACE` | `EVENT` | 300 |
| Terraza Multiuso | `MULTIUSE` | `MULTIUSE` | 120 |

`metadata` podra contener dimensiones, reglas del espacio, iluminacion, vestidores, profundidad de piscina y configuracion del plano 3D. No se usara para reglas criticas de reserva.

Cada migracion debe tener `upgrade` y `downgrade`, probarse contra PostgreSQL real y no modificarse despues de compartirse.
