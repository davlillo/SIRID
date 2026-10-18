# SIRID — Guía de uso y trazabilidad de historias (HU)

> Documento operativo: cómo levantar la plataforma, cómo entrar, y **dónde vive cada historia de usuario (HU)** dentro del sistema.
> Complementa a `docs/jira/` (visión y sprints) y a `spect/` (especificaciones técnicas).

---

## 1. Qué es SIRID

Plataforma web para un complejo deportivo: catálogo de instalaciones, horarios, tarifas, disponibilidad y ciclo de reservas. La garantía central es que **una instalación nunca tiene dos reservas activas solapadas**, y esa garantía la da PostgreSQL (exclusión `reservations_no_overlap` sobre `tstzrange(starts_at, ends_at, '[)')`), no la interfaz.

Stack: **Next.js 15** (frontend) + **FastAPI / SQLAlchemy 2 async** (backend) + **PostgreSQL 16** + **Alembic** (migraciones).

---

## 2. Cómo levantar la plataforma

### Opción A — Docker Compose (recomendado)

```bash
cp .env.example .env
docker compose up --build
```

El backend aplica `alembic upgrade head`, carga el catálogo demo (idempotente) y levanta la API. URLs:

| URL | Contenido |
|---|---|
| `http://localhost:3000` | Landing pública |
| `http://localhost:3000/instalaciones` | Catálogo con filtros |
| `http://localhost:3000/organizaciones` | Selector de organización |
| `http://localhost:3000/admin` | Panel administrativo |
| `http://localhost:8000/docs` | OpenAPI ejecutable |
| `http://localhost:8000/v1/health` | Salud de API + base |

> **Nota puerto 8000:** en esta máquina el puerto 8000 lo ocupa otro stack (`earth2`). Existe un `docker-compose.override.yml` que expone el backend de SIRID en **`http://localhost:8010`** (el frontend sigue en 3000 y `NEXT_PUBLIC_API_URL` apunta a 8010). Si liberás el 8000, borrá ese override para volver a las URLs del README.
>
> **Nota entorno E:** (ver README) el bind-mount de la unidad `E:` puede fallar en Docker Desktop. Habilitá la unidad en *Settings → Resources → File Sharing*.

### Opción B — Solo Postgres en Docker + backend local

Útil para correr pruebas o el backend sin reconstruir contenedores.

```bash
# 1) Base de datos (queda en el puerto del .env, por defecto 5436)
docker compose up -d postgres

# 2) Backend local
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# 3) Migrar y poblar (DATABASE_URL apuntando a localhost:<puerto>)
$env:DATABASE_URL="postgresql+asyncpg://sirid:change-me@localhost:5436/sirid"
$env:JWT_SECRET="<un-secreto-largo>"
$env:ENVIRONMENT="development"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seeds.seed_demo   # 12 instalaciones demo

# 4) API
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8010
```

### Pruebas

```bash
# Requiere PostgreSQL. Las pruebas usan una base <nombre>_test (hacen TRUNCATE).
cd backend
$env:DATABASE_URL="postgresql+asyncpg://sirid:change-me@localhost:5436/sirid"
.\.venv\Scripts\python.exe -m pytest -q
```

Estado verificado en este equipo: **154 passed** (dominio, API, permisos, disponibilidad, concurrencia) y `npm run typecheck` sin errores.

---

## 3. Cómo entrar (roles y acceso)

### Google (real)

Configurá `GOOGLE_CLIENT_ID` y listá los correos administradores en `ADMIN_EMAILS`. El rol **nunca** se toma del navegador: se resuelve en la base.

### Login de desarrollo (sin Google)

Requiere tres flags:

```dotenv
ENVIRONMENT=development
DEV_AUTH_ENABLED=true                 # backend
NEXT_PUBLIC_DEV_AUTH_ENABLED=true     # frontend
```

Luego, en `/ingresar`, aparecen tres botones: **Entrar como encargado / cliente / admin**. Crean usuarios fijos `dev-encargado@sirid.local`, `dev-client@sirid.local`, `dev-admin@sirid.local`.

| Rol | Alcance |
|---|---|
| `ADMIN` | Organizaciones y usuarios; catálogo de instalaciones/horarios/tarifas de todas las organizaciones. |
| `ENCARGADO` | Instalaciones de **su** organización (HU-07) y reservas de **su** organización. Horarios/tarifas siguen en ADMIN. |
| `CLIENT` | Consulta catálogo público y crea/consulta/cancela **sus** reservas. |
| Visitante | Catálogo y disponibilidad pública, sin sesión. |

### ⚠️ Paso crítico: activar la organización bootstrap

La migración `0007_organizations` crea la organización bootstrap **inactiva a propósito**. **Mientras esté inactiva, crear instalaciones devuelve `404 OrganizationNotFound`.** Activarla una vez:

- Panel → **Organizaciones** → editar la organización inicial → marcar **activa**.
- O por API: `PATCH /v1/admin/organizations/00000000-0000-0000-0000-000000000001` con `{"is_active": true}`.

Las instalaciones demo del seed pertenecen a esa organización.

---

## 4. Mapa de páginas (frontend)

| Ruta | Qué hace | HU relacionadas |
|---|---|---|
| `/` | Landing pública | — |
| `/organizaciones` | Selector de organización (multi-tenant) | transversal |
| `/instalaciones` | Catálogo con filtros por zona/deporte/capacidad | HU-07 (lectura), HU-02 |
| `/instalaciones/[slug]` | Detalle + disponibilidad | HU-02 |
| `/reservar/[id]` | Flujo de solicitud de reserva | HU-03 |
| `/mapa` | Plano 3D del complejo (React Three Fiber) | experiencia |
| `/mis-reservas` | Historial del cliente | HU-11 |
| `/ingresar` | Inicio de sesión (Google / dev) | HU-13 |
| `/admin` | Administración de organizaciones y usuarios | — |
| `/admin/reportes` | Reporte resumido y PDF de reservaciones | HU-12 |
| `/admin/instalaciones` | Alta/edición de instalaciones + horario + tarifas | **HU-07, HU-08, HU-09** |
| `/admin/clientes` | Registro y edición de clientes | HU-01 |
| `/admin/reservas` | Confirmar / cancelar / completar reservas | HU-04, HU-05, HU-06 |
| `/admin/usuarios` | Provisión de usuarios internos y roles | HU-14 |
| `/admin/organizaciones` | Alta, edición y activación de organizaciones | transversal |

---

## 5. Dónde entra cada HU

Backend: `api/` (rutas) → `services/` (casos de uso) → `repositories/` (SQL) → `infrastructure/models.py` (ORM). Dominio puro en `domain/`.

### Sprint 1

| HU | Pantalla | Endpoints | Backend | Estado |
|---|---|---|---|---|
| **HU-13** Iniciar sesión | `/ingresar` | `POST /v1/auth/google`, `POST /v1/auth/development`, `GET /v1/auth/me`, `POST /v1/auth/logout` | `services/auth_service.py`, `infrastructure/google_identity.py`, cookie de sesión `HttpOnly` | Implementado |
| **HU-14** Gestionar usuarios | `/admin/usuarios` | `GET/POST /v1/admin/users`, `PATCH /v1/admin/users/{id}` | `services/user_service.py`, `schemas/user_management.py` | Implementado |
| **HU-07** Gestionar instalaciones | `/admin/instalaciones` | `GET/POST /v1/admin/facilities`, `GET/PATCH /v1/admin/facilities/{id}` | `services/facility_service.py`, `repositories/facility_repository.py`, `schemas/facility.py` | **Verificado** (ADMIN global; ENCARGADO solo su organización) |
| **HU-08** Configurar horarios | `/admin/instalaciones` (bloque *Horario semanal*) | `POST /v1/admin/facilities/{id}/schedules` | `services/schedule_service.py` | Implementado |
| **HU-09** Definir tarifas | `/admin/instalaciones` (bloque *Tarifas*) | `POST /v1/admin/facilities/{id}/rates`, `POST .../rates/publish` | `services/rate_service.py` | Implementado |
| **HU-01** Registrar cliente | `/admin/clientes` | `GET/POST /v1/admin/clients`, `PATCH /v1/admin/clients/{id}` | `services/client_service.py`, `schemas/client.py` | Implementado |
| **HU-02** Consultar disponibilidad | `/instalaciones/[slug]` | `GET /v1/facilities/{id}/availability`, `.../availability/check`, `GET /v1/organizations/{slug}/facilities/{id}/availability` | `services/availability_service.py` | Implementado |

### Sprint 2

| HU | Pantalla | Endpoints | Backend | Estado |
|---|---|---|---|---|
| **HU-03** Solicitar reservación | `/reservar/[id]` | `POST /v1/reservations` | `services/reservation_service.py` (+ exclusión anti-solape) | Implementado |
| **HU-04** Confirmar reservación | `/admin/reservas` | `POST /v1/admin/reservations/{id}/confirm` | `services/reservation_service.py` | Implementado |
| **HU-05** Cancelar reservación | `/mis-reservas`, `/admin/reservas` | `POST /v1/reservations/{id}/cancel`, `POST /v1/admin/reservations/{id}/cancel` | `services/reservation_service.py` | Implementado |
| **HU-06** Completar reservación | `/admin/reservas` | `POST /v1/admin/reservations/{id}/complete` | `services/reservation_service.py` | Implementado |
| **HU-10** Registrar pago/anticipo | `/admin/reservas` (panel detalle) | `POST/GET /v1/admin/reservations/{id}/payments` | `reservation_payments` | **Implementado** |
| **HU-11** Historial de reservaciones | `/mis-reservas` | `GET /v1/reservations/me`, `GET /v1/reservations/{id}` | `repositories/reservation_repository.py` | Implementado |
| **HU-12** Reportes | `/admin/reportes` | `GET /v1/admin/reports/reservations` | `repositories/reservation_repository.py` | Implementado; PDF mediante impresión del reporte filtrado |

### Transversal — Multi-organización

| Función | Pantalla | Endpoints |
|---|---|---|
| Listar organizaciones | `/organizaciones` | `GET /v1/organizations` |
| Administrar organizaciones | `/admin/organizaciones` | `GET/POST /v1/admin/organizations`, `PATCH /v1/admin/organizations/{id}` |
| Catálogo por organización | `/instalaciones?organization=<slug>` | `GET /v1/organizations/{slug}/facilities`, `.../{facility_slug}`, `.../id/{facility_id}` |

---

## 6. Verificación de HU-07 (evidencia)

Flujo ejecutado contra PostgreSQL real + API en vivo (no mocks):

| Paso | Resultado |
|---|---|
| 1. Login ADMIN | `200` |
| 2. Activar organización bootstrap | `200` |
| 3. Crear instalación (**CA1**: registrar la deja reservable) | `201`, `is_active=true`, `is_bookable=true` |
| 4. Aparece en catálogo público | `True` |
| 5. Definir horario semanal | `200` |
| 6. Definir tarifa | `201` |
| 7. Login CLIENT | `200` |
| 8. Reservar la instalación **activa** | `201`, estado `PENDING` |
| 9. Desactivar instalación | `200` |
| 10. Desaparece del catálogo público | `False` |
| 11. Reservar la instalación **inactiva** (**CA2**) | `404 facility-not-found` |

**Conclusión:** HU-07 cumple sus dos criterios de aceptación.

---

## 7. Brechas conocidas (para el cierre)

- **HU-10 (pagos/anticipos):** registro en panel de reservas; confirmación (HU-04) exige `total_paid >= quoted_amount`.
- **Evidencia/UML en Jira:** solo existe el diagrama de clases (`diagrams/reservas-class-diagram.drawio`). Faltan casos de uso, actividad, secuencia y capturas; Jira declara 0 adjuntos.
- **Trazabilidad por HU:** el trabajo base llegó en un commit único (`todo`); no hay PR por HU.
- **Estado en Jira:** las 5 épicas siguen «Por hacer» y el Sprint 1 «Activo» con fecha vencida (07/10/2026).
- **Bootstrap manual:** recordar activar la organización antes de crear instalaciones (paso §3).
