# Despliegue local con Docker

## Servicios

| Servicio | Puerto local | Responsabilidad |
|---|---:|---|
| `frontend` | 3000 | Next.js |
| `backend` | 8000 | FastAPI y OpenAPI |
| `postgres` | 5432 | PostgreSQL persistente |

## Comandos objetivo

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend alembic upgrade head
```

URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Configuracion

Variables requeridas:

```text
DATABASE_URL=postgresql+asyncpg://davlillos:secret@postgres:5432/davlillos
GOOGLE_CLIENT_ID=
JWT_SECRET=
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_APP_PASSWORD=
SMTP_FROM=
```

## Reglas de infraestructura

- PostgreSQL usa el volumen `postgres_data`.
- `.env`, tokens y claves no se versionan.
- Backend y frontend tendran Dockerfiles multi-stage cuando se prepare produccion.
- Contenedores ejecutaran con usuario no root cuando sea compatible.
- Healthcheck de PostgreSQL y `/health` del backend.
- El frontend no debe depender de `localhost` para comunicarse con el backend dentro de Docker; usara la URL publica configurada para el navegador y el proxy correspondiente.
- El entorno de produccion usara HTTPS, imagenes versionadas y backups.

## Diagnostico

```bash
docker compose ps
docker compose logs backend
docker compose exec postgres pg_isready -U davlillos -d davlillos
```

## Contextos de build

Cada servicio tiene su propio `.dockerignore`. Esto evita enviar `node_modules`, `.next`, caches, entornos virtuales y documentos al daemon de Docker. El frontend usa un contexto pequeno y el backend copia solamente su aplicacion y dependencias.

## Nota de desarrollo

El Compose esta pensado para desarrollo local. El backend usa `--reload` y volumen de codigo; para produccion se debe construir una imagen inmutable, eliminar `--reload`, ejecutar la migracion como paso controlado y configurar HTTPS delante de los servicios.
