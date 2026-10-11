# Manual de implementacion

## 1. Requisitos

- Docker Desktop con Compose.
- Node.js 22 LTS para desarrollo frontend fuera de Docker.
- Python 3.12 para desarrollo backend fuera de Docker.
- Cuenta Google Cloud para OAuth.
- Cuenta Gmail con contraseña de aplicacion para SMTP.

## 2. Preparar el proyecto

Desde la raiz:

```bash
cp .env.example .env
docker compose up --build
```

El comando levanta PostgreSQL, ejecuta `alembic upgrade head` en backend y levanta Next.js.

URLs iniciales:

- `http://localhost:3000`: landing.
- `http://localhost:3000/organizaciones`: selector público de organizaciones.
- `http://localhost:3000/instalaciones?organization=<slug>`: catálogo de la organización seleccionada.
- `http://localhost:3000/mapa`: maqueta 3D.
- `http://localhost:8000/docs`: OpenAPI.
- `http://localhost:8000/v1/health`: salud de la API.

## 3. Configurar Google OAuth

1. Crear un proyecto en Google Cloud Console.
2. Configurar la pantalla de consentimiento OAuth.
3. Crear un cliente OAuth de tipo Web.
4. Agregar `http://localhost:3000` a los origenes autorizados.
5. Guardar el Client ID en `GOOGLE_CLIENT_ID`.
6. Configurar el mismo Client ID en el proveedor React de Google.
7. En produccion agregar un dominio HTTPS real.

El backend siempre debe verificar el token. Nunca se debe aceptar el email o rol enviado directamente por el navegador.

## 3.1 Organizaciones y roles

- La migración crea una organización bootstrap genérica, inicialmente inactiva, y asigna ahí los datos existentes.
- El administrador de bootstrap se identifica con `ADMIN_EMAILS`; su cuenta puede usar cualquier dominio.
- El administrador inicia sesión con Google y renombra/configura la organización inicial o crea nuevas organizaciones desde `/admin/organizaciones`.
- Desde `/admin/usuarios`, provisiona los encargados y clientes con su organización/rol. Los usuarios vinculan su cuenta de Google al correo provisionado.
- Los catálogos públicos se consultan con el slug de cada organización y son accesibles sin sesión. Reservar requiere iniciar sesión y pertenecer a la organización de la instalación.
- ADMIN puede gestionar instalaciones/horarios/tarifas de cualquier organización. Solo ENCARGADO puede gestionar reservas, dentro de su organización.

## 4. Configurar Gmail SMTP

1. Activar verificacion en dos pasos en la cuenta Gmail.
2. Crear una contraseña de aplicacion.
3. Colocar usuario, contraseña de aplicacion y remitente en `.env`.
4. No usar la contraseña normal de Gmail.

## 5. Flujo de desarrollo backend

1. Crear o modificar schema Pydantic.
2. Crear o modificar modelo ORM.
3. Crear migracion Alembic:

```bash
docker compose exec backend alembic revision -m "describe_change"
```

4. Implementar repositorio.
5. Implementar servicio de aplicacion.
6. Agregar router y dependencia de sesion.
7. Agregar pruebas unitarias e integracion.
8. Probar OpenAPI y permisos.

Los routers no deben contener consultas complejas ni reglas de negocio. El servicio decide; el repositorio persiste.

## 6. Servicios backend previstos

| Servicio | Responsabilidad |
|---|---|
| `AuthService` | Verificar Google, crear usuario y administrar sesion |
| `FacilityService` | Catalogo, CRUD, tipos y metadatos del plano |
| `ScheduleService` | Horarios operativos y excepciones |
| `RateService` | Tarifas vigentes y cotizacion |
| `AvailabilityService` | Bloques libres y ocupados |
| `ReservationService` | Crear, consultar y cambiar estados |
| `NotificationService` | Correos y registro de fallos |
| `AuditService` | Eventos de seguridad y cambios |

## 7. Flujo de reserva

1. Frontend pide disponibilidad.
2. Cliente selecciona un bloque.
3. Frontend envia instalacion e intervalo ISO 8601.
4. `ReservationService` valida usuario, instalacion, horario y tarifa.
5. PostgreSQL aplica `reservations_no_overlap`.
6. Se guarda la reserva y su evento `CREATED`.
7. Se confirma la transaccion.
8. `NotificationService` intenta enviar el correo.
9. La API devuelve la reserva al frontend.

Si PostgreSQL devuelve conflicto, la API responde `409` y el frontend solicita disponibilidad actualizada.

## 8. Flujo frontend con Atomic Design

- Atom: boton, etiqueta tecnica, badge, icono.
- Molecule: tarjeta de instalacion, selector de fecha, resumen de tarifa.
- Organism: catalogo, calendario de disponibilidad, tabla administrativa, plano.
- Template: layout publico, layout autenticado y layout admin.
- Feature: `facilities`, `reservations`, `auth`, `admin`.
- Route: solo compone templates y features; no concentra logica de negocio.

## 9. Datos iniciales

Crear un seed de desarrollo para estadio, piscinas, futbol 7/11/5, basket, salon y terraza. Cada instalacion debe tener horarios, tarifa, imagen y coordenadas del plano.

## 10. Verificacion

```bash
docker compose exec backend alembic current
docker compose exec backend pytest
docker compose exec frontend npm run typecheck
docker compose config
```

Antes de integrar una historia se debe comprobar la Definition of Done en `spect/11-backlog-de-implementacion.md`.

## 10.1 Implementar la escena 3D

1. Crear `ComplexMap3D` como componente client-only.
2. Cargar las instalaciones desde `GET /v1/facilities`.
3. Mapear `map_x`, `map_y`, `map_z`, `map_width` y `map_depth` a escala de escena.
4. Renderizar geometria segun `facility_kind`.
5. Usar colores de estado calculados desde disponibilidad.
6. Al seleccionar un nodo, navegar a `/instalaciones/[slug]`.
7. Incluir una lista HTML equivalente para teclado, mobile y ausencia de WebGL.
8. No permitir que la escena decida si una hora esta libre.

Geometria sugerida:

| Tipo | Geometria |
|---|---|
| `STADIUM` | Elipse o volumen extruido con campo interior |
| `FIELD` | Plano rectangular con lineas de campo |
| `COURT` | Plano rectangular con lineas y aros |
| `POOL` | Caja baja con material azul y carriles |
| `EVENT_SPACE` | Caja extruida con acceso marcado |
| `MULTIUSE` | Plataforma rectangular abierta |

## 11. Produccion

- Sustituir secretos de `.env` por un gestor de secretos.
- Usar HTTPS y cookies `Secure`.
- Quitar `--reload`.
- Construir imagenes versionadas.
- Ejecutar migraciones como paso controlado de despliegue.
- Configurar backups PostgreSQL.
- Restringir CORS al dominio final.
- Revisar `npm audit` y auditoria de dependencias Python.
