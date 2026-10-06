# Arquitectura de servicios del backend

## Objetivo

El backend no sera un conjunto de endpoints con logica mezclada. Sera una API orientada a servicios de aplicacion. Cada servicio representara una capacidad del negocio y coordinara repositorios, validaciones, eventos y notificaciones.

## Capas

```text
api/                 HTTP: rutas, dependencias y schemas de entrada/salida
services/            Casos de uso y reglas de aplicacion
domain/              Entidades, value objects, enums y reglas puras
repositories/        Consultas y persistencia
infrastructure/      SQLAlchemy, correo, Google, JWT y configuracion
```

La dependencia siempre apunta hacia adentro: API -> servicios -> puertos/repositorios. Un servicio no debe importar un router.

## Servicios

### AuthService

- Verifica el credential de Google.
- Busca o crea el usuario por `google_subject`.
- Asigna `CLIENT` por defecto.
- Emite y revoca la sesion local.

### UserService

- Consulta el usuario autenticado.
- Administra el cambio controlado de rol.
- Nunca permite que el cliente cambie su propio rol.

### FacilityService

- Lista espacios reservables.
- Crea, actualiza, activa e inactiva espacios.
- Administra metadatos de render, imagenes y caracteristicas.

### ScheduleService

- Administra horarios semanales.
- Valida que no existan rangos diarios invalidos.
- En una segunda iteracion administrara cierres excepcionales y feriados.

### RateService

- Busca la tarifa vigente.
- Calcula el importe de una reserva.
- Conserva el importe cotizado en la reserva para que cambios futuros de tarifa no alteren historicos.

### AvailabilityService

- Combina horario operativo, reservas activas y fecha solicitada.
- Devuelve bloques libres y ocupados.
- No crea reservas y no decide permisos.

### ReservationService

- Crea reservas pendientes.
- Valida transiciones de estado.
- Verifica propietario o rol admin.
- Traduce conflictos de PostgreSQL a error de dominio `ReservationConflict`.
- Registra `ReservationEvent` dentro de la misma transaccion.

### NotificationService

- Renderiza plantillas Jinja2.
- Envia por Gmail SMTP.
- No ejecuta rollback si falla SMTP despues del commit.
- Devuelve un resultado observable para registrar reintentos.

### AuditService

- Registra actor, accion, reserva, estado anterior y nuevo estado.
- No guarda tokens ni contraseñas.

## Contratos de servicio

Los servicios recibiran dependencias por constructor. Ejemplo conceptual:

```python
class ReservationService:
    def __init__(self, reservation_repository, facility_service, rate_service, audit_service):
        ...

    async def create(self, customer_id, command):
        ...
```

La implementacion concreta de repositorios se puede reemplazar en pruebas por fakes o mocks sin modificar la API.

## Transacciones

La operacion de reserva usa una unica transaccion para insertar la reserva y su evento. El correo se dispara luego del commit. La restriccion de PostgreSQL es la autoridad final en concurrencia.

## Manejo de errores

Errores de dominio previstos:

- `FacilityNotFound` -> 404.
- `FacilityNotBookable` -> 409.
- `OutsideOperatingHours` -> 422.
- `InvalidReservationTransition` -> 409.
- `ReservationConflict` -> 409.
- `NotReservationOwner` -> 404 o 403 segun politica.
- `AdminRequired` -> 403.

No se deben capturar excepciones genericas para convertirlas en respuestas exitosas. Los errores inesperados se registran y devuelven un mensaje seguro.
