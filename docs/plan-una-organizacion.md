# Plan de implementación: SIRID con una organización

> **Estado:** propuesta para revisión; no autoriza cambios de código por sí sola.  
> **Escenario:** SIRID opera para una única organización y un único complejo deportivo.  
> **Alternativa relacionada:** [Plan multi-organización aislada](./plan-multi-organizacion.md).

## 1. Resumen ejecutivo

Este plan adapta las historias HU-13 y HU-14 al estado actual de SIRID para una instalación de una sola organización. Se conserva el inicio de sesión con Google que ya existe, se administra la habilitación y el rol de cada cuenta en la base de datos y se añade una interfaz/API para que el administrador gestione usuarios internos. El catálogo público continúa disponible sin iniciar sesión.

La diferencia esencial respecto al plan multi-organización es que aquí **no se crea una frontera de tenant**: el catálogo, las instalaciones, la disponibilidad y las reservas pertenecen al único complejo configurado. Es la opción de menor cambio inmediato. Si posteriormente se habilita una segunda organización, se requerirá una migración y una revisión transversal de las consultas, no solo agregar un selector visual.

## 2. Contexto verificado

### 2.1 Estado del repositorio

- Backend: FastAPI, SQLAlchemy 2 async, PostgreSQL y Alembic.
- Frontend: Next.js App Router, TypeScript y TanStack Query.
- El login actual recibe una credencial de Google, verifica el ID token en backend y establece una cookie de sesión propia `HttpOnly`.
- El modelo `users` ya posee `google_subject`, `email`, `role` e `is_active`.
- Roles actuales: `CLIENT`, `ENCARGADO` y `ADMIN`.
- `ADMIN_EMAILS` configura la cuenta de bootstrap del administrador; la asignación de clientes/encargados pasa a gestionarse en SIRID.
- El login de Google vincula usuarios por `google_subject` y puede vincular una fila previa por correo.
- El login puede crear usuarios nuevos como `CLIENT`; la política de incorporación de clientes debe conservarse o cambiarse explícitamente.
- Existe `is_active`; las solicitudes autenticadas vuelven a consultar el usuario, por lo que una desactivación puede bloquear también una sesión ya emitida.
- El catálogo público actual no requiere autenticación y presenta las instalaciones del complejo.

### 2.2 Evidencia de Etapa 1

El documento `TOO115 - ETAPA 01.docx` especifica en HU-13 el inicio de sesión con Google y la denegación de acceso para una cuenta desactivada en SIRID, aunque Google autentique correctamente. HU-14 describe la creación de usuarios internos, la vinculación de sus cuentas Google y la asignación de roles. El documento modela un complejo; no define aislamiento multi-organización.

## 3. Objetivo y límites

### Objetivos

1. Permitir que usuarios internos autorizados inicien sesión con Google.
2. Permitir que el administrador cree, edite, active/desactive y asigne roles a usuarios internos.
3. Rechazar cuentas desactivadas incluso si Google valida su identidad.
4. Mantener el acceso público al catálogo y proteger las operaciones privadas con autorización del backend.
5. Mantener compatibilidad con clientes y reservas actuales.

### Incluido en este escenario

- El administrador del sistema puede crear la organización inicial y editar sus datos/dominio.
- La aplicación admite una sola organización activa. Una segunda creación se rechaza e indica que requiere habilitar el plan multi-organización.
- La tabla de organización funciona como configuración/control-plane; las instalaciones y reservas no reciben todavía `organization_id`.

### Fuera de alcance en este escenario

- Crear una segunda organización.
- Aislar datos por organización.
- Selector de organización o rutas con slug de organización en el catálogo público.
- Gestión de dominios de varias organizaciones.
- Contraseñas locales, almacenamiento de contraseñas o recuperación de contraseñas.
- Acceso federado de múltiples proveedores distintos de Google.

## 4. Política funcional propuesta

| Actor | Identidad | Facultades propuestas |
|---|---|---|
| Administrador (`ADMIN`) | Cuenta Google previamente configurada | Gestionar usuarios internos, roles y estado; facultades administrativas que ya tenga el sistema para el único complejo. |
| Encargado (`ENCARGADO`) | Cuenta Google registrada y habilitada | Gestionar las operaciones de reservaciones que le asigne la política acordada; administrar instalaciones/horarios/tarifas según permisos actuales. |
| Cliente (`CLIENT`) | Cuenta Google | Consultar catálogo/disponibilidad y operar sus propias reservas. |
| Visitante | Sin sesión | Consultar catálogo público y disponibilidad que el producto decida publicar; no reservar ni consultar datos privados. |

El administrador crea o configura la organización única desde una pantalla de configuración. La primera cuenta con permiso `ADMIN` sigue necesitando un bootstrap seguro (por ejemplo, `ADMIN_EMAILS`); no se debe depender de una pantalla a la que solo puede entrar un administrador ya creado para dar de alta al primer administrador.

### Decisiones funcionales pendientes antes de implementar

1. **Clientes nuevos:** decidir si pueden seguir siendo creados automáticamente como `CLIENT` al iniciar sesión con Google o si el administrador debe preaprobarlos. El flujo actual los crea automáticamente.
2. **Dominio permitido:** decidir si el acceso interno se restringe al dominio de la única organización. La HU de Etapa 1 exige Google, pero no fija un dominio.
3. **Usuarios administrables:** decidir si HU-14 se limita a cuentas internas (`ADMIN`/`ENCARGADO`) o si el panel también puede activar/desactivar clientes. Ya existe administración separada de perfiles cliente.
4. **Escalada de privilegios:** impedir que un administrador se quite el rol a sí mismo o que deje el sistema sin ningún administrador activo.
5. **Desactivación:** confirmar que debe invalidar el acceso en la siguiente solicitud autenticada y que desactivar no elimina historial ni reservas.

## 5. Diseño funcional

### 5.1 Inicio de sesión interno con Google

1. El usuario selecciona “Iniciar sesión con Google”.
2. Google autentica al usuario y devuelve un ID token al cliente web.
3. El frontend envía la credencial al endpoint existente `POST /v1/auth/google`.
4. FastAPI verifica firma, audiencia, emisor, expiración y `email_verified` mediante el verificador existente.
5. El servicio busca el usuario por `google_subject`; como compatibilidad, puede vincular una cuenta previamente provisionada por correo verificado.
6. La aplicación evalúa el estado activo y el rol que residen en la base de datos. El rol nunca se acepta desde el navegador ni se deduce de una selección del usuario.
7. Si la cuenta no está autorizada o está desactivada, no se emite cookie y se devuelve un error seguro y general.
8. Si es válida, el backend firma la sesión propia y la escribe en la cookie configurada.
9. Los endpoints protegidos vuelven a cargar el usuario y comprobar su estado/rol.

**Política recomendada de alta interna:** el administrador provisiona el correo y rol antes del primer acceso; el usuario vincula la fila con Google al autenticarse por primera vez. No se deben aceptar datos de rol de Google ni del frontend.

**Dominio:** si se acuerda una lista de dominios permitidos, debe verificarse en backend con una comparación normalizada del dominio exacto. El claim `hd` solo aplica a cuentas gestionadas por Google Workspace; no se debe confiar en un parámetro enviado por el navegador. La mera pertenencia a un dominio no concede rol interno: la autorización se obtiene de la fila de usuario provisionada.

### 5.2 Gestión de usuarios

Propuesta de operaciones:

| Operación | Resultado |
|---|---|
| Listar | Mostrar cuentas internas, correo, rol y estado; nunca credenciales/tokens. |
| Crear | Registrar correo Google, rol permitido y estado activo. `google_subject` permanece pendiente hasta el primer login si el usuario aún no se ha autenticado. |
| Actualizar | Cambiar campos editables y/o rol, sujeto a reglas anti-escalada. |
| Desactivar | Establecer `is_active=false`; conservar identidad, reservas e historial. |
| Reactivar | Permitir nuevo acceso con el vínculo Google existente. |

La identidad externa no se borra cuando se desactiva una cuenta. La operación no debe borrar reservas ni eventos de auditoría. Los cambios de rol y estado deberían producir un registro de auditoría si el alcance de la etapa lo requiere.

### 5.3 Administración de la organización única

- Si no existe organización, el administrador autenticado puede crearla con nombre, slug de referencia y dominio autorizado.
- Si ya existe, puede consultar y actualizar sus datos; no puede crear una segunda organización bajo este plan.
- La unicidad debe protegerse también en backend/base de datos para evitar dos altas simultáneas.
- Cambiar el dominio no cambia por sí solo roles ni cuentas Google enlazadas.

### 5.4 Catálogo público

- Se mantiene la navegación actual: landing, lista, detalle, mapa y disponibilidad pública.
- En este escenario no se muestra selector de organización: existe una sola fuente de instalaciones.
- Se debe decidir explícitamente si la disponibilidad pública muestra intervalos ocupados exactos o solo franjas no disponibles, para evitar exposición innecesaria de reservas.

## 6. Cambios técnicos propuestos

### 6.1 Backend y persistencia

Archivos/módulos a revisar o extender:

- Añadir modelo y migración para la organización única, sin relacionar todavía instalaciones/reservas por tenant.
- Añadir servicio/repositorio/schema y endpoints de configuración para crear/editar la organización única.
- `backend/app/infrastructure/google_identity.py`: mantener la validación oficial; agregar validación de dominio solo si se aprueba la política.
- `backend/app/services/auth_service.py`: resolver la política de usuario preprovisionado/cliente nuevo, vinculación de Google y bloqueo de cuentas inactivas.
- `backend/app/infrastructure/models.py`: decidir si `google_subject` debe admitir `NULL` para filas provisionadas que aún no han iniciado sesión. La base actual lo exige, aunque el flujo de vinculación por correo permitiría enlazar una fila preexistente si se puede crear.
- `backend/app/repositories/user_repository.py`: consultas para listar, buscar por correo, crear y actualizar usuarios.
- `backend/app/services/user_service.py`: completar casos de uso de gestión, validación de roles y protecciones contra auto-bloqueo.
- `backend/app/api/admin.py` o un router específico `backend/app/api/admin_users.py`: endpoints protegidos por administrador.
- `backend/app/schemas/auth.py` y nuevos schemas administrativos: contratos con validación de correo/rol/estado; excluir secretos del response.
- `backend/alembic/versions/`: migración reversible si cambia nulabilidad/índices o se agregan campos.

No es necesario crear un nuevo sistema de contraseñas. Google prueba la identidad; SIRID guarda la autorización local.

### 6.2 API propuesta

Los nombres son tentativos; deben armonizarse con el contrato OpenAPI existente.

| Método y ruta | Permiso | Uso |
|---|---|---|
| `POST /v1/auth/google` | Público, con rate limit | Login existente. |
| `GET /v1/auth/me` | Sesión | Usuario y rol efectivos. |
| `POST /v1/auth/logout` | Sesión opcional | Cierre de cookie. |
| `GET /v1/admin/users` | `ADMIN` | Listar usuarios internos con paginación/filtros. |
| `POST /v1/admin/users` | `ADMIN` | Provisionar correo y rol. |
| `GET /v1/admin/users/{id}` | `ADMIN` | Detalle editable. |
| `PATCH /v1/admin/users/{id}` | `ADMIN` | Cambiar rol/campos permitidos/estado. |
| `GET /v1/admin/organization` | `ADMIN` | Obtener la organización única. |
| `POST /v1/admin/organization` | `ADMIN` | Crear la organización inicial si aún no existe; rechazar duplicados. |
| `PATCH /v1/admin/organization` | `ADMIN` | Actualizar el registro único. |

La gestión de clientes existentes bajo `/v1/admin/clients` no debe duplicarse sin decisión de alcance. La API debe evitar filtrar `google_subject` si no es necesario para el panel.

### 6.3 Frontend

- Mantener el proveedor Google y los contextos de autenticación actuales.
- Incorporar `/admin/usuarios` y navegación desde el panel administrativo.
- Incorporar `/admin/organizacion` para crear (solo si no existe) y editar la organización única.
- Crear hooks de listado, alta y actualización bajo `frontend/features/admin/`.
- Reutilizar componentes de formularios, tabla, badge de estado, modal y toast existentes.
- Mostrar estados de carga, lista vacía, error, éxito y validación.
- Ocultar la ruta del menú a usuarios sin permiso, sin tratarlo como medida de seguridad: el backend sigue siendo autoridad.
- No mostrar ni almacenar tokens Google en el estado persistente del frontend.

## 7. Secuencia de implementación por fases

### Fase 0 — Cierre de reglas

- Confirmar política de alta de clientes y usuarios internos.
- Definir dominios admitidos (si aplica) y política de auto-registro.
- Fijar matriz `ADMIN`/`ENCARGADO`/`CLIENT` para cada endpoint administrativo.
- Acordar comportamiento de desactivación, reactivación y último administrador.
- Revisar los criterios de HU-13/HU-14 frente a `TOO115 - ETAPA 01.docx`.

**Punto de revisión:** no avanzar a persistencia hasta que las reglas estén aprobadas.

### Fase 1 — Modelo/migración y servicios

- Implementar la decisión de provisionamiento previo y vínculo Google.
- Ajustar nulabilidad de `google_subject` solo si hace falta para crear cuentas antes del primer login.
- Completar repositorio/servicio de usuarios internos.
- Aplicar reglas de permisos y estado en backend.
- Añadir/ajustar migración Alembic con `upgrade` y `downgrade`.

**Punto de revisión:** validar migración, compatibilidad con usuarios actuales y reglas de negocio.

### Fase 2 — API de gestión

- Exponer endpoints de lista, creación, detalle y actualización bajo autorización `ADMIN`.
- Añadir paginación, validaciones y errores HTTP coherentes.
- Verificar que ninguna ruta permita modificar usuarios sin rol suficiente.

**Punto de revisión:** revisar contrato API y pruebas antes de interfaz.

### Fase 3 — Interfaz

- Construir pantalla `/admin/usuarios` y enlazarla al layout administrativo.
- Implementar formularios de creación/edición y acción de desactivar/reactivar.
- Cubrir accesibilidad de etiquetas, teclado, modal y mensajes.

**Punto de revisión:** validar flujo y capturas visuales desktop/mobile.

### Fase 4 — Integración y cierre

- Ejecutar pruebas unitarias, API y PostgreSQL real para migración/constraints relevantes.
- Ejecutar typecheck y build disponible del frontend.
- Probar inicio de sesión Google, cuenta inactiva, cuenta sin provisionar, roles y gestión CRUD.
- Actualizar README, `spect/06-autenticacion-y-seguridad.md`, contrato API y guía manual.
- Aceptar HU solo cuando criterios y casos de prueba estén trazados.

## 8. Pruebas y criterios de aceptación

### 8.0 Trazabilidad de HU-13 y HU-14

| Historia/criterio | Comportamiento esperado |
|---|---|
| HU-13: Google autentica correctamente | SIRID establece su sesión y permite las operaciones autorizadas para el rol persistido. |
| HU-13: Google rechaza o no completa autenticación | No se crea sesión; se presenta un mensaje general sin revelar si falló el correo, la cuenta o la credencial. |
| HU-13: usuario interno desactivado | Se deniega acceso aunque Google valide identidad; el backend tampoco acepta llamadas posteriores con cookie aún vigente. |
| HU-14: crear usuario con rol | Administrador registra correo y rol permitido; después del vínculo Google la persona puede iniciar sesión con esos permisos. |
| HU-14: actualizar usuario/rol | Cambios autorizados se persisten y toman efecto desde la siguiente solicitud autenticada. |
| HU-14: desactivar usuario | El usuario no puede iniciar sesión ni operar con una sesión anterior; sus datos históricos se conservan. |

### 8.1 Backend

- Token Google válido para usuario activo produce cookie segura y rol leído desde DB.
- Token inválido, expirado, audiencia incorrecta o email no verificado no crea sesión.
- Usuario desactivado no recibe sesión aunque Google autentique correctamente.
- Cuenta interna provisionada por correo se enlaza al `sub` Google una sola vez.
- Un correo ya enlazado a otro sujeto no puede apropiarse mediante login.
- Usuario no autorizado/no provisionado sigue la política acordada y no adquiere rol interno.
- `CLIENT`/`ENCARGADO` no pueden listar ni cambiar usuarios internos.
- `ADMIN` puede crear, actualizar y desactivar; los intentos de auto-bloqueo/retirada del último admin se rechazan según regla acordada.
- Desactivar no elimina historial de reservas y bloquea siguientes requests autenticados.
- Los endpoints no devuelven tokens, secretos ni hashes.

### 8.2 Frontend/E2E

- Login exitoso dirige al área correcta según rol.
- Error de Google o de cuenta interna muestra mensaje general sin datos sensibles.
- El usuario admin ve el listado, crea un usuario pendiente de primer login y asigna rol.
- El admin puede cambiar el rol/desactivar/reactivar según las reglas.
- El cliente no ve la sección de gestión; las peticiones directas igualmente reciben `403`.
- Catálogo público sigue siendo navegable sin sesión.

## 9. Seguridad y operación

- Conservar cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Mantener rate limit para login y no registrar tokens/cookies.
- Normalizar email antes de comparar; usar `google_subject` como identidad externa estable y email para provisionamiento controlado.
- No confiar en roles, `organization_id` (no aplica aquí) ni claims libres enviados por el browser.
- Limitar los datos de errores y aplicar respuestas coherentes para cuentas inexistentes/inactivas.
- No guardar ni manejar contraseñas locales.
- Revisar rate limiter en memoria antes de escalar a varias instancias.

## 10. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Crear cualquier cuenta Google como cliente contradice el alta controlada | Acceso indebido o confusión de cuentas | Definir regla de auto-registro antes de codificar y probarla. |
| Cuenta interna provisionada no tiene `google_subject` | Alta no puede persistirse con el esquema actual | Migrar columna a nullable, o cambiar proceso para vincular primero; no inventar un subject. |
| Convertir usuario existente a otro email Google | Toma de cuenta o conflicto de unicidad | Vincular por email verificado una sola vez y probar duplicados/concurrencia. |
| Administrador se elimina a sí mismo o deja cero administradores | Pérdida de administración | Regla de invariantes y endpoint protegido. |
| Dominio usado como única autorización | Usuario externo del dominio obtiene privilegios | El dominio solo restringe elegibilidad; rol y estado provienen de DB. |
| Futuro multi-tenant | Reescritura de queries/migraciones | Documentar este costo; escoger Plan B antes de que existan datos productivos de varias organizaciones. |

## 11. Datos y migración

- Se agrega una tabla `organizations` limitada a una fila, pero no se añade `organization_id` a usuarios, instalaciones o reservas.
- No se cambia el ownership de `facilities` ni `reservations`.
- La organización se crea mediante inicialización controlada o por el endpoint administrativo si no existe; el primer administrador requiere bootstrap independiente.
- Mantener usuarios y roles existentes; retirar cualquier lista de encargados en `.env` y conservar `ADMIN_EMAILS` solo para bootstrap del administrador.
- Si se modifica `google_subject`, migrar con Alembic sin reescribir migraciones ya compartidas.
- El seed de desarrollo no debe insertar cuentas con privilegios reales ni depender de credenciales privadas.

## 12. Definition of Done

- [ ] Las reglas de alta, dominios, roles y desactivación fueron aprobadas.
- [ ] El login Google existente conserva sus contratos y no confía en el rol del navegador.
- [ ] El administrador puede gestionar las cuentas/roles del alcance acordado.
- [ ] El administrador puede crear la organización inicial y no puede crear una segunda bajo este plan.
- [ ] El estado inactivo bloquea login y posteriores operaciones autenticadas.
- [ ] Los permisos se comprueban en backend y están cubiertos por tests.
- [ ] Migraciones `upgrade`/`downgrade` se prueban contra PostgreSQL.
- [ ] Catálogo público y reservas actuales no sufren regresiones.
- [ ] Typecheck, pruebas backend y validación visual del panel se ejecutaron.
- [ ] README y especificación de seguridad reflejan el comportamiento real.

## 13. Cuándo escoger este plan

Escogerlo si la entrega y operación contemplan una sola organización y se acepta hacer después una migración multi-tenant. Si se requieren varias organizaciones con instalaciones, reservas y usuarios aislados, escoger [el plan multi-organización](./plan-multi-organizacion.md) antes de cargar datos de los nuevos tenants.
