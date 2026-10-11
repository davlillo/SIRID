# HU-07 — Gestionar instalaciones deportivas · Evidencias

> **Jira:** [SIRID-8](https://ues-team-nfbnyzvr.atlassian.net/browse/SIRID-8) · **Épica:** ÉPICA-02 · **Responsable:** Sergio David Hernández García · **5 SP**
> Esta carpeta reúne las evidencias para adjuntar en la historia. Verificado el 11/10/2026 contra PostgreSQL real y el stack en contenedores.

## Criterios de aceptación

| Criterio (Jira) | Estado | Evidencia |
|---|---|---|
| 1. Registrar nombre, tipo, capacidad y descripción deja la instalación disponible para reservar | ✅ | Flujo en vivo: `201` + `is_bookable=true` + aparece en catálogo + reserva `201 PENDING` |
| 2. Una instalación marcada «Fuera de servicio» no puede reservarse | ✅ | Flujo en vivo: tras `is_active=false` desaparece del catálogo y la reserva responde `404 facility-not-found` |

## Diagramas (UML)

| Archivo | Tipo | Contenido |
|---|---|---|
| [`diagrams/hu07-casos-de-uso.drawio`](../../../diagrams/hu07-casos-de-uso.drawio) | Casos de uso | Actores, registrar/actualizar/desactivar/consultar, «include» validar, «extend» impedir reserva |
| [`diagrams/hu07-actividad.drawio`](../../../diagrams/hu07-actividad.drawio) | Actividad | Alta/edición → validación → persistencia → disponible; desactivación → excluir → rechazar reserva |
| [`diagrams/hu07-secuencia.drawio`](../../../diagrams/hu07-secuencia.drawio) | Secuencia | Encargado/Cliente → Frontend → API → FacilityService → PostgreSQL |
| [`diagrams/reservas-class-diagram.drawio`](../../../diagrams/reservas-class-diagram.drawio) | Clases/ER | Entidad `Instalacion` y `ServicioInstalacion` (reutilizado) |

## Capturas

| Archivo | Qué muestra |
|---|---|
| `00-selector-organizaciones.png` | Selector público de organización |
| `01-catalogo-publico.png` | Catálogo público (instalación disponible para reservar) |
| `02-panel-admin.png` | Panel administrativo |
| `03-admin-instalaciones-listado.png` | Listado de instalaciones (ADMIN) |
| `04-admin-instalaciones-edicion.png` | Edición + horario + tarifas (ADMIN) |
| `05-admin-instalaciones-crear.png` | Formulario de alta (ADMIN) |
| `06-encargado-instalaciones.png` | **ENCARGADO** gestiona instalaciones de su organización |
| `07-encargado-crear.png` | Alta desde el rol ENCARGADO (organización fijada, sin selector) |

## Pruebas automatizadas

```bash
cd backend
$env:DATABASE_URL="postgresql+asyncpg://sirid:change-me@localhost:5436/sirid"
.\.venv\Scripts\python.exe -m pytest -q
```

- Resultado: **156 passed** (incluye `TestPermissions::test_an_encargado_creates_a_facility_in_its_own_organization`, `..._creates_only_in_its_own_organization` y `..._cannot_edit_another_organization_facility`).
- `npm run typecheck` en `frontend/` — sin errores.

## Trazabilidad (dónde vive cada ítem)

| Ítem del checklist | Dónde |
|---|---|
| CRUD con formulario y listado | `frontend/app/admin/instalaciones/page.tsx` (tabla + `FacilityForm`) |
| API crear/editar/desactivar | `backend/app/api/admin.py` (`create_facility`, `update_facility`) |
| Reglas de negocio | `backend/app/services/facility_service.py` (`create`, `update`, `require_bookable`) |
| Persistencia | `backend/app/repositories/facility_repository.py` + `models.py` (`FacilityModel`) |
| Validaciones | `backend/app/schemas/facility.py` (`FacilityCreate`, `FacilityUpdate`) |
| Bloqueo de reserva (RN-10) | `facility_service.require_bookable` → usado por `reservation_service.create` |
| Pruebas | `backend/tests/test_api_admin.py` (`TestPermissions`, `TestCatalog`) |

## Rol del actor (aclaración)

Jira define HU-07 «como **encargado**». La implementación original (refactor multi-organización) la había asignado al `ADMIN`. **Se corrigió para que el `ENCARGADO` gestione las instalaciones de su propia organización**, sin poder tocar las de otras (responde `404`). El `ADMIN` conserva alcance global.

> Nota: horarios (HU-08) y tarifas (HU-09) siguen siendo de `ADMIN` en esta entrega; el panel del encargado no muestra esas secciones.
