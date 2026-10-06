# Esquema PostgreSQL

## Decisiones

- PostgreSQL 16.
- UUID generado por la aplicacion o PostgreSQL.
- `timestamptz` para instantes.
- `numeric(10,2)` para importes.
- `jsonb` para atributos propios de cada tipo de espacio, sin romper el esquema base.
- `citext` o email normalizado en minusculas para unicidad.
- Alembic para migraciones.

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
- Unico en `facilities.slug`.
- `reservations(customer_id, created_at DESC)`.
- `reservations(facility_id, starts_at)`.
- `reservations(status, starts_at)`.
- `reservation_events(reservation_id, created_at)`.

## Migraciones iniciales

1. Crear extensiones y tablas de usuarios.
2. Crear instalaciones, horarios y tarifas.
3. Crear reservas y constraint de exclusividad.
4. Crear auditoria e indices.
5. Cargar datos demo solo en entorno de desarrollo.

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
