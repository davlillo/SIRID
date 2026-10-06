# Stack y arquitectura

## Decision

Se usara un monorepo con un frontend Next.js, un backend FastAPI y PostgreSQL. Cada pieza tendra su contenedor y se comunicaran mediante HTTP REST.

## Stack

| Area | Tecnologia | Uso |
|---|---|---|
| Frontend | Next.js + TypeScript | App Router, paginas y servidor web |
| UI | Tailwind CSS + shadcn/ui | Sistema visual y componentes accesibles |
| Estado remoto | TanStack Query | Cache, mutaciones y estados de red |
| Formularios | React Hook Form + Zod | Validacion y formularios |
| 3D | Three.js + React Three Fiber + Drei | Plano interactivo |
| Backend | Python 3.12 + FastAPI | API REST |
| ORM | SQLAlchemy 2 async + asyncpg | Persistencia |
| Migraciones | Alembic | Versionado de esquema |
| Auth | Google Identity + JWT en cookie | Login y sesion propia |
| Email | aiosmtplib + Jinja2 | SMTP y plantillas |
| Base de datos | PostgreSQL 16 | Datos y restriccion anti-solapamiento |
| Infraestructura | Docker Compose | Entorno local reproducible |

## Estructura propuesta

```text
frontend/
  app/
  components/
    atoms/
    molecules/
    organisms/
    templates/
  features/
  lib/
  public/
backend/
  app/
    api/
    core/
    domain/
    services/
    repositories/
    models/
    schemas/
    notifications/
  alembic/
infra/
  postgres/
spect/
docker-compose.yml
.env.example
```

## Flujo de una reserva

```text
Cliente -> Next.js -> FastAPI -> servicio de reservas
                                      |
                                      v
                              PostgreSQL transaccional
                                      |
                                      v
                              Gmail SMTP, despues del commit
```

## Principios

- La API es la autoridad para permisos, tarifas, estados y disponibilidad.
- Los routers de FastAPI coordinan; las reglas viven en servicios de aplicacion.
- Los repositorios encapsulan consultas SQLAlchemy.
- Las respuestas publicas usan schemas Pydantic, no modelos ORM directos.
- Las migraciones son inmutables despues de ser aplicadas en un entorno compartido.
- Los efectos externos, como el correo, se ejecutan despues de confirmar la transaccion.

## Contrato entre aplicaciones

- API versionada con prefijo `/v1`.
- JSON para peticiones y respuestas.
- UUID como identificador publico.
- Fechas en ISO 8601 con zona horaria.
- Errores con `status`, `title`, `detail` e `instance`.
- CORS limitado al origen configurado de Next.js.

## Atomic Design

La interfaz se dividira por nivel de composicion:

- `atoms`: boton, badge, icono, etiqueta, campo base y marca.
- `molecules`: tarjeta de instalacion, selector de fecha, resumen de tarifa y filtros.
- `organisms`: catalogo, calendario, tabla admin, formulario y plano 3D.
- `templates`: layout publico, layout autenticado y layout administrativo.
- `features`: logica de negocio de auth, facilities, availability, reservations y admin.

Las rutas de `app/` compondran features y templates. No se colocara logica de acceso a datos dentro de un atom u organism generico.

## Rutas iniciales de frontend

| Ruta | Tipo |
|---|---|
| `/` | Landing publica |
| `/instalaciones` | Catalogo |
| `/instalaciones/[slug]` | Detalle y disponibilidad |
| `/reservar/[id]` | Flujo de reserva |
| `/mapa` | Complejo 3D |
| `/mis-reservas` | Cliente |
| `/admin` | Dashboard |
| `/admin/reservas` | Gestion de reservas |
| `/admin/instalaciones` | Gestion de catalogo |
