# SIRID Reserva Deportiva

Sistema web para consultar y reservar instalaciones de un complejo deportivo: estadio,
futbol 11/7/5, baloncesto, piscinas, salon de eventos y terraza multiuso.

La garantia central del sistema es que **una instalacion nunca puede tener dos reservas
activas solapadas**, y esa garantia la da PostgreSQL, no la interfaz.

## Puesta en marcha

```bash
cp .env.example .env
docker compose up --build
```

El backend ejecuta `alembic upgrade head`, carga el catalogo de desarrollo (idempotente) y
levanta la API. Con eso quedan disponibles:

| URL | Contenido |
|---|---|
| `http://localhost:3000` | Landing publica |
| `http://localhost:3000/instalaciones` | Catalogo con filtros por zona, deporte y capacidad |
| `http://localhost:3000/instalaciones/[slug]` | Detalle, disponibilidad y flujo de reserva |
| `http://localhost:3000/mapa` | Plano 3D del complejo |
| `http://localhost:3000/mis-reservas` | Panel del cliente |
| `http://localhost:3000/admin` | Panel administrativo |
| `http://localhost:8000/docs` | OpenAPI ejecutable |
| `http://localhost:8000/v1/health` | Salud de la API y de la base |

Para iniciar sesion hay que configurar `GOOGLE_CLIENT_ID` y listar los correos
administradores en `ADMIN_EMAILS`. Los encargados de clientes y tarifas se
configuran en `ENCARGADO_EMAILS`. Ver `spect/12-manual-implementacion.md`.

## Estado

Implementado y verificado contra PostgreSQL real:

- **Dominio**: estados de reserva, horarios operativos, intervalo semiabierto `[inicio, fin)`,
  cotizacion por bloques y duracion minima.
- **Backend**: FastAPI con capas `api / services / domain / repositories / infrastructure`,
  SQLAlchemy 2 async, Alembic, errores `application/problem+json`, rate limit y cabeceras de
  seguridad.
- **Auth**: Google Identity verificado en servidor, sesion propia en cookie `HttpOnly`.
  El rol nunca se toma del navegador.
- **Reservas**: creacion, cancelacion, confirmacion, completado y auditoria de cada
  transicion en la misma transaccion que el cambio de estado.
- **Concurrencia**: exclusion constraint `reservations_no_overlap` sobre
  `tstzrange(starts_at, ends_at, '[)')` para reservas `PENDING` y `CONFIRMED`.
- **Correo**: Gmail SMTP con plantillas Jinja2, disparado despues del commit. Un fallo SMTP
  no revierte la reserva: queda en `notification_logs` y el admin puede reintentar.
- **Frontend**: Next.js 15 App Router, Atomic Design, TanStack Query, plano 3D con
  React Three Fiber y lista equivalente accesible.
- **Pruebas**: 93 pruebas (dominio, API, permisos, disponibilidad y concurrencia).

## Pruebas

```bash
docker compose exec backend python -m pytest -q
```

Las pruebas de integracion necesitan `DATABASE_URL`; Docker Compose ya la define. Las 32
pruebas de dominio corren sin base de datos.

```bash
docker compose exec frontend npm run typecheck
```

## Estructura

```text
backend/
  app/
    api/              rutas, dependencias y traduccion de errores HTTP
    domain/           enums, errores y reglas puras sin IO
    services/         casos de uso: auth, catalogo, disponibilidad, reservas, correo
    repositories/     consultas SQLAlchemy
    infrastructure/   engine, modelos ORM, Google Identity
    notifications/    plantillas de correo
    seeds/            catalogo de desarrollo
  alembic/            migraciones versionadas
  tests/              dominio, API, permisos y concurrencia
frontend/
  app/                rutas del App Router
  components/         atoms, molecules, organisms, templates
  features/           auth, facilities, reservations, admin, providers
  lib/                cliente HTTP, tipos y formato
  styles/             tokens del design system (isotipo DVL, producto SIRID)
  public/brand,patterns,textures,facilities
spect/                especificaciones y manual de implementacion
docs/                 documentacion academica de la Etapa 1
```

## Notas del entorno de desarrollo

Este repositorio vive en la unidad `E:`. En esa unidad, Node devuelve `EISDIR` en lugar de
`EINVAL` al hacer `readlink` sobre un archivo normal, y tanto webpack como Next.js abortan por
eso. Se puede comprobar asi:

```bash
node -e "const fs=require('fs'); try{fs.readlinkSync('package.json')}catch(e){console.log(e.code)}"
```

`EINVAL` es lo esperado; `EISDIR` indica el problema. Mientras el volumen se comporte asi,
`npm run build` debe ejecutarse desde una copia en `C:` o dentro del contenedor de frontend.
El servidor de desarrollo (`npm run dev`) y `npm run typecheck` si funcionan en `E:`.

Por la misma razon, Docker Desktop puede rechazar el bind mount de `E:`. Si aparece
`error while creating mount source path ... file exists`, hay que habilitar la unidad en
Docker Desktop → Settings → Resources → File Sharing y reiniciar Docker.

## Documentacion

Empezar por `spect/12-manual-implementacion.md`. Despues:

1. `spect/00-vision-y-alcance.md`
2. `spect/01-stack-y-arquitectura.md`
3. `spect/03-reglas-de-negocio.md`
4. `spect/14-arquitectura-de-servicios-backend.md`
5. `spect/15-especificacion-del-complejo.md`
6. `spect/17-maquetas-detalladas.md`
