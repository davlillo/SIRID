# Contrato de API

Base URL local: `http://localhost:8000/v1`

## Formato de error

```json
{
  "type": "https://davlillos.local/errors/reservation-conflict",
  "title": "Reservation conflict",
  "status": 409,
  "detail": "The facility is not available for the requested period.",
  "instance": "/v1/reservations"
}
```

## Auth

| Metodo | Ruta | Auth |
|---|---|---|
| POST | `/auth/google` | Publico |
| GET | `/auth/me` | Sesion |
| POST | `/auth/logout` | Sesion |

`POST /auth/google` recibe `{ "credential": "<google-id-token>" }`. El backend verifica el token contra el `GOOGLE_CLIENT_ID` y establece una cookie de sesion HTTP-only.

## Catalogo y disponibilidad

| Metodo | Ruta | Auth |
|---|---|---|
| GET | `/facilities` | Publico |
| GET | `/facilities/{facility_id}` | Publico |
| GET | `/facilities/{facility_id}/availability?date=YYYY-MM-DD` | Publico |

La disponibilidad debe devolver horarios operativos, bloques ocupados y tarifas aplicables. No debe exponer datos personales de reservas ajenas.

## Respuesta de instalacion

```json
{
  "id": "uuid",
  "slug": "cancha-norte-fut-7",
  "name": "Cancha Norte",
  "sport_type": "FOOTBALL_7",
  "facility_kind": "FIELD",
  "surface": "SYNTHETIC_GRASS",
  "capacity": 14,
  "location_label": "Zona Futbol",
  "is_bookable": true,
  "map_x": 1.0,
  "map_y": 0.5,
  "map_z": -2.0,
  "map_width": 2.5,
  "map_depth": 1.6
}
```

`map_*` sirve para ubicar el espacio en la escena y no sustituye la disponibilidad.

## Reservas de cliente

| Metodo | Ruta | Auth |
|---|---|---|
| POST | `/reservations` | Cliente |
| GET | `/reservations/me` | Cliente |
| GET | `/reservations/{reservation_id}` | Propietario o admin |
| POST | `/reservations/{reservation_id}/cancel` | Propietario o admin |

Ejemplo de creacion:

```json
{
  "facility_id": "uuid",
  "starts_at": "2026-10-05T18:00:00-06:00",
  "ends_at": "2026-10-05T19:00:00-06:00",
  "customer_note": "Entrenamiento semanal"
}
```

## Operaciones internas

| Metodo | Ruta | Roles |
|---|---|---|
| GET | `/admin/reservations` | ADMIN |
| POST | `/admin/reservations/{id}/confirm` | ADMIN |
| POST | `/admin/reservations/{id}/cancel` | ADMIN |
| POST | `/admin/reservations/{id}/complete` | ADMIN |
| GET | `/admin/facilities` | ADMIN, ENCARGADO |
| GET | `/admin/facilities/{id}` | ADMIN, ENCARGADO |
| POST | `/admin/facilities` | ADMIN, ENCARGADO |
| PATCH | `/admin/facilities/{id}` | ADMIN, ENCARGADO |
| POST | `/admin/facilities/{id}/schedules` | ADMIN, ENCARGADO |
| POST | `/admin/facilities/{id}/rates` | ADMIN, ENCARGADO |
| POST | `/admin/facilities/{id}/rates/publish` | ADMIN, ENCARGADO |

`rates/publish` cierra o desactiva la tarifa vigente e inserta una nueva version. Las
reservas existentes conservan el importe cotizado y las nuevas usan el monto publicado.

## Reglas de API

- Listados paginados con `page`, `limit` y filtros.
- `422` para validacion de esquema o dominio de entrada.
- `401` sin sesion; `403` sin permisos; `404` recurso inexistente.
- `409` para conflictos de disponibilidad o transiciones invalidas.
- Swagger/OpenAPI generado por FastAPI sera la referencia ejecutable.
