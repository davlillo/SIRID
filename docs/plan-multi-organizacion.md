# Plan de implementación: SIRID multi-organización aislado

> **Estado:** implementación en curso en `feat/add-multi-org-isolation`.  
> **Escenario:** dos o más organizaciones independientes comparten la aplicación, pero no sus datos operativos.  
> **Alternativa relacionada:** [Plan de una organización](./plan-una-organizacion.md).

## 1. Resumen ejecutivo

Este plan añade un límite multi-tenant real a SIRID. Cada organización tendrá identidad, dominio y configuración propios; sus usuarios, instalaciones y reservas quedarán asociadas a ella. La API limitará cada operación al tenant correspondiente. El catálogo público seguirá disponible sin iniciar sesión, pero mostrará las instalaciones de una organización seleccionada.

El administrador del sistema podrá crear organizaciones, gestionar usuarios y administrar instalaciones, horarios y tarifas de cualquiera de ellas. **No gestionará ni consultará reservas**: las reservas y sus datos operativos quedan bajo los encargados de reservaciones de su organización. El acceso administrativo global al catálogo es una excepción explícita al aislamiento de instalaciones; no concede acceso a clientes, reservas, eventos, notificaciones ni reportes de reservas.

Este plan extiende el alcance original de Etapa 1: aquel documento especifica un único complejo y login Google, no multi-tenancy. En el repositorio tampoco existe actualmente una entidad `Organization` ni filtros organizacionales.

## 2. Contexto verificado

### 2.1 Estado actual

- FastAPI/SQLAlchemy async/PostgreSQL/Alembic forman el backend; Next.js App Router/TypeScript/TanStack Query forman el frontend.
- Google Identity ya se verifica en el backend: firma, audiencia, issuer, expiración y `email_verified`.
- SIRID crea su propia sesión en cookie `HttpOnly`; el rol se vuelve a cargar desde la base de datos.
- `UserRole` actual contiene `CLIENT`, `ENCARGADO` y `ADMIN`; el modelo `UserModel` no referencia una organización.
- `FacilityModel` y `ReservationModel` no tienen `organization_id`. Las consultas de catálogo, disponibilidad, reservas y administración son globales.
- Existe una restricción PostgreSQL `reservations_no_overlap` que evita solapamientos por instalación y horario.
- `ADMIN_EMAILS` configura el administrador inicial; los roles de clientes y encargados deben administrarse desde SIRID.
- El catálogo público expone lista, detalle y disponibilidad sin login.
- El login Google crea usuarios no existentes como `CLIENT`; esto requiere una política explícita para los tenants.

### 2.2 Organizaciones configurables

| Organización | Dominio de elegibilidad | Perfiles iniciales previstos |
|---|---|---|
| Organización A | `org-a.example` | Encargado(s) y clientes definidos por el administrador. |
| Organización B | `org-b.example` | Encargado(s) y clientes definidos por el administrador. |

El dominio ayuda a identificar la organización, pero **no debe asignar por sí solo el rol**. El rol y el estado se administran en SIRID.

## 3. Objetivos y alcance

### Objetivos

1. Permitir creación y administración de varias organizaciones por el administrador del sistema.
2. Asociar usuarios a organizaciones y roles autorizados.
3. Aislar clientes, reservas, reportes, notificaciones y auditoría por organización; permitir al administrador global gestionar instalaciones, horarios y tarifas de cualquier organización.
4. Mantener el inicio de sesión Google y el catálogo público.
5. Evitar fuga o modificación cross-tenant aun si el cliente altera IDs, rutas o payloads.
6. Mantener la garantía de no solapamiento de reservas dentro del modelo de datos.

### Incluido

- CRUD de organizaciones con slug y dominio permitido.
- Google OIDC con asociación/verificación de cuenta y tenant.
- Gestión de usuarios/roles por el administrador del sistema.
- Scope organizacional en persistencia, repositorios, servicios, routers y UI.
- Resolución pública de tenant y catálogo sin login.
- Migración de los datos existentes a la organización bootstrap genérica, editable desde el panel.
- Pruebas de aislamiento, migración y compatibilidad.

### Fuera de alcance salvo aprobación explícita

- Aislamiento físico de bases de datos o esquemas por organización.
- Varios proveedores de identidad.
- Una misma cuenta asociada simultáneamente a varias organizaciones.
- Pagos, facturación o liquidación entre organizaciones.
- Administración de usuarios por cada encargado (la propuesta conserva al administrador del sistema como único gestor de usuarios).
- Borrado físico de organizaciones con datos; se propone desactivación/archivado.

## 4. Modelo de permisos propuesto

### 4.1 Separar plano de control y plano de organización

| Actor | Ámbito | Facultades propuestas |
|---|---|---|
| Administrador del sistema (`ADMIN`) | Global | Crear/editar/desactivar organizaciones; gestionar usuarios; crear/editar/desactivar instalaciones, horarios y tarifas en cualquier organización. No listar, consultar, confirmar, cancelar, completar ni reportar reservas. |
| Encargado (`ENCARGADO`) | Una organización | Consultar y gestionar las reservas de su organización, incluida la confirmación/cancelación/completado según reglas actuales. Puede consultar instalaciones de su organización para tramitar reservas; no administra organizaciones ni catálogo. |
| Cliente (`CLIENT`) | Una organización y recursos propios | Consultar catálogo de su organización; crear y operar sus propias reservas. |
| Visitante | Organización seleccionada en ruta pública | Leer catálogo público y disponibilidad publicable de esa organización. No consulta datos privados. |

**Implicación:** el actual `ADMIN` tiene facultades administrativas amplias y algunas rutas de reservas; se deben retirar esas rutas al administrador. Las operaciones de instalaciones pasan a `ADMIN` global con organización explícita como objetivo; las reservas pasan a `ENCARGADO` con scope derivado de su `organization_id`. No basta con ocultar enlaces en el frontend: cada endpoint y servicio valida rol y tenant.

### 4.2 Decisiones de autorización por cerrar

1. ¿Un mismo email/Google `sub` puede pertenecer a más de una organización? La implementación inicial asigna una organización por usuario.
2. ¿Los clientes pueden autorregistrarse en la organización o deben ser provisionados por el administrador? Se propone permitir alta automática solo para dominios registrados.
3. ¿Se requieren excepciones de clientes con correo externo al dominio de su organización? Se propone permitirlas si el administrador los provisiona explícitamente.

## 5. Modelo de dominio y datos

### 5.1 Esquema lógico propuesto

```text
Organization
  id, slug, name, email_domain, is_active, created_at, updated_at

User (identidad Google asociada a una organización)
  id, organization_id, google_subject, email, name, profile fields, role, is_active

Facility
  id, organization_id, ..., slug, is_active

Reservation
  id, organization_id, customer_id, facility_id, dates, status, amount, ...
```

Modelo inicial recomendado para usuarios:

- `Organization` separa identidad/slug/dominio de la organización.
- `User` conserva `google_subject` y email únicos globalmente y tiene exactamente una `organization_id` y un rol `CLIENT`, `ENCARGADO` o `ADMIN`.
- `ADMIN` es el administrador del sistema. Su `organization_id` indica organización de referencia, pero tiene permisos globales solo para organizaciones, usuarios y catálogo.
- No se crea tabla de membresías en esta etapa: cada usuario pertenece a una organización mediante `users.organization_id`. Si en el futuro una identidad necesita varias, se podrá migrar a relación explícita.

### 5.2 Scope de recursos

- `facilities.organization_id` es obligatorio y referencia la organización propietaria.
- `reservations.organization_id` se recomienda explícitamente, además de `facility_id`, para aplicar filtros directos y comprobar consistencia mediante constraints.
- Agregar unicidad compuesta en instalación `(id, organization_id)` y claves foráneas compuestas desde reserva para garantizar que facility y reserva pertenecen a la misma organización.
- Una clave foránea compuesta debe asegurar que el cliente de la reserva y la reserva pertenecen a la misma organización.
- Horarios, tarifas e imágenes pertenecen al tenant a través de `facility_id`; eventos y logs de notificación heredan el ámbito de la reserva. No duplicar `organization_id` en cada tabla hija salvo que simplifique un control/índice requerido.
- El slug de instalación debería ser único por organización (`UNIQUE (organization_id, slug)`), no necesariamente global.
- `organization_id` debe estar indexado en tablas con grandes listas de negocio.

### 5.3 Consistencia de la restricción anti-solapamiento

La regla existente `reservations_no_overlap` se conserva. Como el identificador de instalación es globalmente UUID, el constraint actual ya evita el solapamiento de la misma instalación. Si se emplea unicidad compuesta de instalación por tenant, se debe actualizar el constraint para incluir el par de ownership y seguir usando intervalo semiabierto `[)` para estados `PENDING`/`CONFIRMED`.

No se debe debilitar ni eliminar la garantía transaccional de PostgreSQL para sustituirla por una consulta de disponibilidad de aplicación.

## 6. Flujos de negocio

### 6.1 Crear organización

1. Administrador del sistema abre `/admin/organizaciones`.
2. Envía nombre, slug y dominio de correo normalizados.
3. API valida unicidad del slug/dominio y estado del actor.
4. Se crea la organización inicialmente activa o en estado pendiente según decisión de activación.
5. API responde únicamente datos administrativos de la organización.
6. El administrador puede crear/asignar encargados y clientes para ese tenant.
7. La organización aparece como opción del catálogo público una vez activa y con datos visibles.

Requisitos de validación: slug estable, dominio normalizado (sin `@`), no permitir sufijos ambiguos, evitar dominios repetidos y evitar desactivación/borrado con datos activos sin política de retención.

### 6.2 Provisionar y autenticar usuario

1. Administrador selecciona una organización y provisiona un email verificado esperado, rol y estado.
2. Usuario inicia sesión mediante Google.
3. Backend verifica ID token, audiencia, issuer, expiración y `email_verified`.
4. Backend resuelve el usuario por `google_subject`; si aún no está enlazado, lo vincula a la cuenta provisionada por correo verificado con reglas anti-colisión.
5. Backend comprueba que el usuario esté activo y obtiene su `organization_id` y rol de la base de datos.
6. Se establece sesión propia. El scope del cliente/encargado se deriva del usuario autenticado; el administrador global puede gestionar catálogo de cualquier organización.
7. Usuario desactivado o no provisionado sigue la política de incorporación y no adquiere rol por dominio ni payload.

No usar un campo de tenant/rol editable en el browser como autoridad. El cliente/encargado queda ligado a la organización de su usuario. El administrador indica una organización objetivo al gestionar instalaciones y el backend valida que exista y esté activa.

### 6.3 Navegación pública sin login

**Propuesta implementada en esta rama:** pasar el slug de organización como query param compartible, por ejemplo `/instalaciones?organization=org-a` y `/instalaciones?organization=org-b`.

1. Landing pública ofrece organizaciones activas o una organización se selecciona desde un enlace compartible.
2. El slug de URL determina el tenant para la lectura pública; la API valida que exista y esté activo.
3. Catálogo, detalle, mapa, disponibilidad y filtros incluyen la organización resuelta.
4. La respuesta nunca incorpora instalaciones de otro tenant.
5. Al iniciar una reserva, el usuario y la instalación deben pertenecer a la misma organización.

El catálogo puede ser público, pero la reserva exige autenticación/autorización. No exponer intervalos/identidad del cliente de reservas ajenas: devolver solo disponibilidad agregada o intervalos ocupados anonimizados según contrato actual.

### 6.4 Solicitud autenticada en backend

```text
Cookie -> CurrentUser -> rol + organization_id -> scope autorizado -> servicio -> repositorio
                                                               -> PostgreSQL
```

El scope de clientes/encargados se obtiene del usuario autenticado, nunca de un `organization_id` libre en el body. El administrador global sí puede elegir organización para las operaciones de catálogo permitidas. Para recursos por UUID, las consultas deben incluir el scope autorizado en la misma query; no cargar un registro global y verificar después si eso puede filtrar su existencia.

## 7. Arquitectura técnica propuesta

### 7.1 Backend

Módulos esperados:

- `backend/app/infrastructure/models.py`: Organization y relaciones `organization_id` en User, Facility y Reservation.
- Nuevos `schemas/organization.py` y `schemas/user_management.py`: DTOs de organización y usuarios.
- Nuevos `repositories/organization_repository.py` y extensiones a `user_repository.py`/repositorios de negocio.
- Servicios separados: `OrganizationService`, gestión de usuarios y resolución del scope.
- Dependencias explícitas para administrador global, encargado de organización y cliente.
- Routers separados o claramente segmentados: `/v1/admin/organizations`, `/v1/admin/users`, catálogo administrativo global y rutas de reservas scoped por organización.
- APIs públicas aceptan slug organizacional y restringen los resultados al tenant activo.
- Manejo coherente de recursos cross-tenant: `404` es preferible cuando se quiere no revelar existencia; documentar si hay `403` para roles insuficientes.

### 7.2 Protección de base de datos

Mínimo requerido:

- Foreign keys no nulas para datos de tenant, incluyendo usuario, instalación y reserva.
- Unique/composite constraints que eviten referencias cruzadas entre organizaciones.
- Todas las queries de repositorios de negocio reciben `organization_id` explícito derivado del actor/contexto.
- Índices de tenant para filtros/paginación.
- Transacciones y errores SQL mantienen semántica existente.

Row-Level Security de PostgreSQL puede evaluarse como defensa en profundidad, pero no debe agregarse sin una estrategia de propagación/limpieza de tenant context por conexión async y pruebas que demuestren que el pool no filtra contexto entre requests. En la primera entrega, scope explícito de aplicación más constraints comprobables es el punto de partida más simple.

### 7.3 API propuesta

Los endpoints son propuestas, no contrato final.

| Método/ruta | Acceso | Función |
|---|---|---|
| `POST /v1/auth/google` | Público limitado | Verificar Google y establecer sesión. |
| `GET /v1/auth/me` | Sesión | Usuario, rol, organización y contexto efectivo. |
| `GET /v1/organizations` | Público | Directorio de organizaciones activas, sin dominio ni datos privados. |
| `GET /v1/organizations/{slug}/facilities` | Público | Catálogo solo de esa organización. |
| `GET /v1/organizations/{slug}/facilities/{facility_slug}` | Público | Detalle solo dentro del tenant. |
| `GET /v1/organizations/{slug}/facilities/{id}/availability` | Público con rate limit | Disponibilidad publicable del tenant. |
| `GET /v1/admin/organizations` | `ADMIN` global | Listar organizaciones. |
| `POST /v1/admin/organizations` | `ADMIN` global | Crear organización. |
| `PATCH /v1/admin/organizations/{id}` | `ADMIN` global | Actualizar datos/estado. |
| `GET /v1/admin/users` | `ADMIN` global | Listar identidades con organización, rol y estado. |
| `POST /v1/admin/users` | `ADMIN` global | Provisionar correo, organización y rol. |
| `PATCH /v1/admin/users/{id}` | `ADMIN` global | Cambiar rol/estado; la organización es inmutable en esta etapa. |
| `GET /v1/admin/facilities` | `ADMIN` global o `ENCARGADO` scoped | Admin ve instalaciones de todas las organizaciones; encargado solo las propias, en lectura. |
| `POST/PATCH /v1/admin/facilities...` | `ADMIN` global | Gestionar instalaciones, horarios y tarifas de cualquier organización. |
| `/v1/admin/reservations...` | `ENCARGADO` scoped; `CLIENT` para sus propias operaciones | Operaciones de reservas dentro de su organización; `ADMIN` no está autorizado. |

Una opción alternativa es preservar las rutas públicas actuales y añadir `organization` como slug obligatorio; no aceptar un tenant por defecto ambiguo una vez que haya más de uno.

### 7.4 Frontend

- Añadir gestión `/admin/organizaciones` para el administrador de sistema.
- Añadir gestión de usuarios con selector de organización en el plano de control.
- Crear contexto visual tenant-scoped para encargados/clientes; mostrar claramente nombre de organización activa.
- En el panel global, exigir seleccionar organización al crear/editar instalaciones; las vistas administrativas del catálogo pueden cambiar entre organizaciones.
- No mostrar operaciones de reservas al administrador global; todas las pantallas del encargado quedan limitadas a su `organization_id`.
- Propagar el slug seleccionado en las rutas públicas de catálogo, detalle y mapa mediante `?organization={slug}`.
- Garantizar que los hooks query key incluyan `organizationId/slug`; invalidar cache al cambiar tenant.
- No reutilizar una cache de catálogo de una organización en otra.
- Menú y pantallas se ajustan al rol y organización efectivos, pero servidor sigue siendo decisor.
- Probar estado de carga/error de tenant desconocido, desactivado, sin instalaciones y cambio de organización.

## 8. Migración de datos existente

### 8.1 Supuesto de backfill

El sistema actual contiene datos de un solo complejo deportivo. La migración los asigna a una organización bootstrap llamada provisionalmente `Organización inicial`, inicialmente inactiva y sin dominio. El administrador puede editar su nombre, slug y dominio, y activarla para conservar y publicar esos datos. No inferir propietarios por email ni repartir registros entre organizaciones nuevas.

### 8.2 Secuencia de migración

1. Crear tabla `organizations`; sembrar una organización bootstrap genérica con ID estable.
2. Agregar `organization_id` a usuarios y asignarles la organización bootstrap; `ADMIN_EMAILS` identifica al administrador global.
3. Agregar `organization_id` temporalmente nullable a tablas principales.
4. Backfill de instalaciones y usuarios existentes a la organización bootstrap; completar reservas desde su instalación y validar consistencia.
5. Detectar y reportar filas huérfanas/múltiples relaciones incoherentes antes de imponer constraints.
6. Crear uniques/FKs compuestos e índices por organización.
7. Convertir `organization_id` a `NOT NULL` donde corresponda.
8. Actualizar/recrear constraint de no-solapamiento de forma transaccional, preservando `[)` y estados ocupantes.
9. Ejecutar Alembic upgrade/downgrade contra PostgreSQL real y confirmar compatibilidad con volúmenes de datos existentes.
10. Activar la nueva lectura tenant-scoped; verificar los conteos de la organización bootstrap pre/post y smoke tests antes de aceptar tráfico.

### 8.3 Nuevas organizaciones

Cada organización nueva empieza con su propio catálogo, horarios y tarifas; no hereda datos de la organización bootstrap ni de otros tenants. El administrador crea la organización y provisiona sus usuarios. El seed de desarrollo debe ser idempotente y no depender de nombres reales de organización.

## 9. Plan por fases y checkpoints

### Fase 0 — Reglas, permisos y modelo

- Aplicar la matriz acordada: ADMIN gestiona organizaciones/usuarios/instalaciones globalmente; ENCARGADO gestiona reservas de su organización.
- Mantener una organización por usuario en esta etapa.
- Decidir auto-registro de clientes y emails externos a dominios organizacionales.
- Confirmar que el backfill inicial queda en la organización bootstrap y cómo se resuelve el catálogo público.
- Crear matriz de datos por propietario: Organization, User, Facility, Reservation, Event, Notification.

**Checkpoint:** aprobación de matriz de permisos y esquema antes de editar migraciones.

### Fase 1 — Modelo/migración/backfill

- Diseñar tablas, relaciones, índices, restricciones compuestas y downgrade.
- Implementar migración segura de datos existentes.
- Probar contra PostgreSQL real con muestra completa del dataset actual.
- Hacer verificaciones de integridad y conteo por tenant.

**Checkpoint:** revisión de esquema y plan de reversa antes de continuar.

### Fase 2 — Identidad y organización del usuario

- Ajustar Google auth para resolver identidad, organización y rol persistidos.
- Implementar regla de dominio/organización y provisionamiento controlado.
- Conservar `ADMIN` como privilegio global explícito y limitar `ENCARGADO`/`CLIENT` a su `organization_id`.
- Hacer efectivo el bloqueo de usuarios desactivados.

**Checkpoint:** revisar casos de autenticación, onboarding y privilegios.

### Fase 3 — Scope de datos backend

- Introducir contexto tenant derivado en dependencias/servicios.
- Filtrar todas las queries de facility, availability, rates, schedules, reservations, clients, reports, audit y notification.
- Comprobar propiedad en creación y transición de reservas.
- Asegurar constraints compuestas y respuestas no reveladoras para UUID ajeno.
- Añadir auditoría de cambios de organización/usuario según alcance.

**Checkpoint:** revisión de inventario de endpoints y evidencia de pruebas anti-fuga.

### Fase 4 — Control-plane API e interfaz

- Crear API CRUD de organizaciones, con validación de dominio/slug y activación.
- Crear API de usuarios, organización asignada y delegación de roles.
- Implementar `/admin/organizaciones` y `/admin/usuarios`.
- Añadir selección y visualización de tenant en paneles operativos.
- Manejar caches, estado vacío, organización deshabilitada y permisos faltantes.

**Checkpoint:** walkthrough funcional y capturas desktop/mobile.

### Fase 5 — Catálogo público multi-org

- Mantener el selector público y la organización en query string compartible; no elegir una organización de fallback cuando se especifica un slug inválido.
- Adaptar catálogo, detalle, mapa y disponibilidad para scope por slug.
- Añadir landing/directorio de organizaciones activas si se requiere descubrimiento.
- Verificar que las URLs públicas exijan una organización seleccionada; no usar fallback al bootstrap cuando haya más de una.

**Checkpoint:** revisar flujo anónimo de selección y deep-link por organización.

### Fase 6 — Pruebas y rollout

- Ejecutar tests de unidad, API, PostgreSQL y E2E por tenant.
- Ensayar migración/restauración en copia de datos.
- Actualizar documentación, entorno y seed.
- Desplegar con backup, ejecutar migración en ventana controlada y validar cada organización por separado.
- Mantener una forma documentada de detener activación multi-tenant si falla una verificación; no revertir datos a ciegas.

**Checkpoint:** aceptación final con pruebas y revisión de aislamiento.

## 10. Matriz de aislamiento

| Recurso/operación | Visitante | Cliente A | Encargado A | Encargado B | Admin sistema |
|---|---|---|---|---|---|
| Ver organizaciones activas | Sí, datos públicos | Sí | Sí | Sí | Sí |
| Ver catálogo A | Sí por URL de A | Sí | Sí | No desde su sesión B; público solo si selecciona A | Sí, para administración del catálogo |
| Crear reserva A | No | Sí, como cliente A | Sí dentro de scope operativo | No | No |
| Ver reserva ajena de A | No | No | Sí dentro de scope operativo | No | No |
| Crear/editar instalación A | No | No | No | No | Sí |
| Crear organización | No | No | No | No | Sí |
| Asignar usuario a organización | No | No | No | No | Sí |
| Leer datos de control-plane | No | No | No | No | Sí |

En navegación pública, los visitantes pueden acceder al catálogo de cualquier organización activa si el producto es público; eso no asocia su cuenta a la organización ni concede acceso a datos privados.

## 11. Pruebas y criterios de aceptación

### 11.0 Trazabilidad de HU-13 y HU-14

| Historia/criterio | Comportamiento esperado |
|---|---|
| HU-13: Google autentica correctamente | SIRID establece su sesión y resuelve rol + organización persistidos; solo accede al tenant autorizado. |
| HU-13: autenticación rechazada/incompleta | No hay cookie; mensaje general sin detalles que permitan enumerar cuentas. |
| HU-13: usuario inactivo | Google puede autenticar la identidad, pero SIRID deniega sesión/operaciones. |
| HU-14: crear usuario y asignar rol | ADMIN provisiona correo, organización y rol; primer login vincula Google y concede solo ese scope. |
| HU-14: actualizar rol/organización/estado | Cambio aplica en backend y no concede acceso a datos de otro tenant. |
| HU-14: desactivar usuario | Se deniega login/operación siguiente; historial queda asociado y no se borra. |
| Extensión multi-tenant: crear organización | ADMIN crea tenant con slug/dominio no duplicados; nueva organización no hereda datos de otra. |
| Extensión multi-tenant: catálogo público | URL/selector de una organización devuelve solo instalaciones/disponibilidad de esa organización. |

### 11.1 Aislamiento backend (bloqueante)

- Encargado A no lista ni modifica instalaciones o reservas de B desde sus operaciones scoped con UUID conocido.
- Administrador global puede listar/crear/editar instalaciones de todas las organizaciones, pero no accede a reservas, eventos, notificaciones ni reportes de reservas.
- Encargado puede operar reservas de su organización y recibe rechazo al consultar o modificar reservas de otra organización.
- Cliente A no crea reserva en instalación B aunque envíe el ID correcto.
- Cliente A no ve reservas, notificaciones, auditoría ni perfil de clientes B.
- Reportes y filtros de fechas nunca mezclan organizaciones.
- Consultas por slug de instalación también aplican organización; un slug igual en tenants distintos no colisiona.
- Cambiar `organization_id` en payload no modifica tenant efectivo ni permite mover recursos.
- Respuestas para UUID cross-tenant no revelan existencia si la política usa `404`.
- Constraint/foreign key rechaza una reserva cuya organización no coincide con la del cliente y la instalación.
- La no-superposición permanece y dos solicitudes concurrentes de la misma instalación generan un único éxito.
- Usuario desactivado pierde acceso en solicitudes posteriores.

### 11.2 Público y frontend

- Visitante puede abrir el catálogo público de una organización y ver únicamente sus instalaciones.
- Slug desconocido/inactivo devuelve not found o página de organización no disponible; no muestra catálogo por defecto.
- Cambiar slug no reusa cache de otro tenant.
- Un usuario de una organización no cambia el panel operativo a otra mediante manipulación del cliente.
- Pantalla control-plane lista/crea/edita/desactiva organizaciones y provisiona usuarios según sus permisos.
- Navegación por teclado, labels, errores, estados vacíos y diseño responsive validados.

### 11.3 Migración

- Todo registro previo queda asignado exactamente a la organización bootstrap tras backfill.
- Conteos de usuarios, instalaciones, reservas, eventos y notificaciones concuerdan antes/después.
- Downgrade probado en base temporal; documentar cualquier pérdida o cambio de datos al volver atrás.
- Constraints existentes de fechas, importes y no-solapamiento siguen activas.

## 12. Seguridad y riesgos

| Riesgo | Nivel | Mitigación requerida |
|---|---|---|
| IDOR/fuga cross-tenant por un endpoint olvidado | Crítico | Inventario de rutas, scope en query/servicio y tests con IDs cruzados. |
| ADMIN global hereda permisos de reservas actuales | Alto | Restringir las rutas de reserva a `ENCARGADO` scoped; conservar administración global de organizaciones/usuarios/instalaciones. |
| Dominio de email se interpreta como autorización suficiente | Alto | Correo verificado + cuenta asociada a organización; rol siempre en DB. |
| Mapeo erróneo de datos históricos | Alto | Backfill inspeccionado, reportes de integridad, copia de seguridad y rollback ensayado. |
| Public API mezcla catálogos o disponibilidad | Alto | Resolver tenant por identificador/slug y scope en repositorio/servicio, no filtrar en frontend. |
| Una identidad requiere acceso a varias organizaciones | Medio | No soportado en primera versión; modelar una organización por usuario y migrar a una relación explícita si el requisito aparece. |
| Usuarios clientes se crean automáticamente sin tenant correcto | Alto | Definir onboarding; no aceptar organización elegida libremente al autorregistrarse. |
| Índices/consultas sin tenant degradan rendimiento | Medio | Índices compuestos y análisis de consultas tras cargar volumen esperado. |
| Rate limit en memoria no se comparte entre réplicas | Medio | Mantener una réplica en MVP o planear contador compartido al escalar. |

## 13. Observabilidad y operación

- Registrar eventos de organización creada/desactivada y usuario/rol cambiado con actor, objetivo, organización y timestamp; no registrar tokens.
- Métricas de autenticación diferenciadas por resultado sin exponer correo como label cardinal de alto volumen.
- Logs de errores incluyen `organization_id` solo cuando ya fue validado y sin información sensible.
- Backups deben cubrir el nuevo catálogo de organizaciones y FKs.
- Crear seed de desarrollo idempotente en la organización bootstrap con datos inequívocamente ficticios.
- Documentar orden de inicialización y dominios autorizados en `.env.example`; secretos no contienen listas de usuarios como fuente principal de roles.

## 14. Definition of Done

- [ ] Matriz acordada aplicada: ADMIN gestiona organizaciones/usuarios/instalaciones globalmente; ENCARGADO opera reservas scoped.
- [ ] Cada entidad de negocio tiene organización propietaria directa o derivable y consistente.
- [ ] Los endpoints de cliente/encargado obtienen tenant desde el usuario, nunca desde input confiado; las excepciones globales de ADMIN se limitan a catálogo y control-plane.
- [ ] Todas las consultas de negocio aplican tenant y existen pruebas cross-tenant negativas.
- [ ] Catálogo público selecciona un tenant de forma explícita y no mezcla resultados.
- [ ] Datos anteriores se migraron a la organización bootstrap y se reconciliaron con conteos verificados.
- [ ] Constraint anti-solapamiento permanece transaccional.
- [ ] Usuario desactivado no opera aunque conserve cookie.
- [ ] Gestión de organizaciones/usuarios solo está disponible a administrador autorizado.
- [ ] Alembic upgrade/downgrade probado contra PostgreSQL real.
- [ ] Backend, typecheck, build disponible y E2E ejecutados; defectos críticos cerrados.
- [ ] Validación visual desktop/mobile y accesibilidad básica completadas.
- [ ] Manual, README, especificación API, datos de desarrollo y runbook de migración actualizados.

## 15. Comparación con el plan de una organización

| Dimensión | Una organización | Multi-organización aislada |
|---|---|---|
| Cambio de esquema | Menor; sin tenant en recursos | Organización y `organization_id` en usuarios/instalaciones/reservas con migración |
| Login Google | Ya existe; completar política de cuentas/roles | Igual, además resolver la organización de la cuenta y los dominios |
| Catálogo sin login | Un catálogo | Directorio/selector o URL por slug y catálogo scoped |
| Riesgo de fuga cross-tenant | No aplica aún | Requisito crítico con tests por endpoint |
| Panel admin | Gestión de usuarios del único complejo | Gestión global de organizaciones/usuarios/instalaciones; reservas solo por encargado scoped |
| Esfuerzo/alcance | Menor | Mayor por migración y cambios transversales |
| Costo de aplazar | Rehacer scope y backfill cuando haya otra org | Inversión inicial mayor, permite aislar desde el primer tenant adicional |

## 16. Recomendación de uso

Si se necesitan instalaciones/reservas independientes para más de una organización, aplicar este plan antes de cargar datos de esos tenants. Si solo se está prototipando en un tenant temporal y no se necesita separación real todavía, usar el plan de una organización solo después de aceptar explícitamente el costo de migración y sin introducir datos de varias organizaciones en la misma base sin scope.

## 17. Referencias internas

- `README.md` — puesta en marcha y comportamiento actual.
- `spect/00-vision-y-alcance.md` — alcance original de un complejo y acceso Google.
- `spect/01-stack-y-arquitectura.md` — capas y contrato entre Next.js, FastAPI y PostgreSQL.
- `spect/05-esquema-postgresql.md` — esquema y garantía anti-solapamiento.
- `spect/06-autenticacion-y-seguridad.md` — sesión, roles y seguridad.
- `spect/10-estrategia-de-pruebas.md` — estrategia de tests y casos críticos.
- `backend/app/infrastructure/google_identity.py` — verificador actual de Google.
- `backend/app/services/auth_service.py` — asignación/vinculación de usuario y rol.
- `backend/app/infrastructure/models.py` — modelos actuales sin organización.
- `backend/app/api/facilities.py` — catálogo público y disponibilidad actuales.
- `backend/app/api/admin.py` — operaciones administrativas actuales.
- `docs/plan-una-organizacion.md` — alternativa single-tenant.
