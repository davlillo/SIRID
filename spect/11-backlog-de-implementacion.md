# Backlog de implementacion

Estimacion inicial en puntos relativos. Se refinara al crear las tareas en Jira.

| ID | Historia | Prioridad | Puntos |
|---|---|---|---:|
| US-01 | Como visitante quiero conocer el servicio desde una landing | Alta | 3 |
| US-02 | Como cliente quiero iniciar sesion con Google | Alta | 5 |
| US-03 | Como visitante quiero explorar instalaciones | Alta | 5 |
| US-04 | Como cliente quiero consultar disponibilidad por fecha | Alta | 8 |
| US-05 | Como cliente quiero crear una reserva | Alta | 8 |
| US-06 | Como sistema quiero impedir reservas solapadas | Critica | 8 |
| US-07 | Como cliente quiero consultar y cancelar mis reservas | Alta | 5 |
| US-08 | Como admin quiero gestionar instalaciones | Alta | 8 |
| US-09 | Como admin quiero gestionar horarios y tarifas | Alta | 8 |
| US-10 | Como admin quiero confirmar reservas | Alta | 5 |
| US-11 | Como admin quiero cancelar y completar reservas | Media | 5 |
| US-12 | Como usuario quiero recibir notificaciones por correo | Alta | 5 |
| US-13 | Como cliente quiero seleccionar una instalacion en un plano 3D | Media | 8 |
| US-14 | Como equipo quiero ejecutar el sistema con Docker Compose | Alta | 5 |
| US-15 | Como equipo quiero disponer de pruebas automatizadas | Alta | 8 |

## Orden de sprints

### Sprint 1: base ejecutable

- Estructura monorepo.
- Docker Compose.
- FastAPI healthcheck.
- Next.js base y design tokens.
- PostgreSQL, SQLAlchemy y Alembic.
- Modelo inicial y datos demo.

### Sprint 2: identidad y catalogo

- Login Google.
- Usuarios y roles.
- Catalogo y detalle de instalaciones.
- CRUD administrativo basico.

### Sprint 3: disponibilidad y reservas

- Horarios y tarifas.
- Consulta de disponibilidad.
- Creacion y cancelacion.
- Restriccion anti-solapamiento.
- Auditoria y pruebas de concurrencia.

### Sprint 4: aprobacion y notificaciones

- Panel de reservas admin.
- Confirmar, cancelar y completar.
- Plantillas Gmail SMTP.
- Manejo de fallos y logs.

### Sprint 5: experiencia y cierre

- Landing final.
- Plano 3D y fallback de lista.
- Responsive y accesibilidad.
- E2E, documentacion y hardening Docker.

## Definition of Done

- La historia cumple sus criterios de aceptacion.
- Tiene validacion y manejo de errores.
- Cuenta con pruebas relevantes.
- La API esta documentada.
- No rompe permisos ni la regla anti-solapamiento.
- Funciona mediante Docker Compose.
