# Implementación multi-organización de SIRID

> **Rama:** `feat/add-multi-org-isolation`  
> **Estado:** primera implementación integrada; verificación de integración ejecutada con PostgreSQL real.

Este documento describe lo que se incorporó y cómo ponerlo en marcha. El plan de trabajo detallado sigue en [plan-multi-organizacion.md](./plan-multi-organizacion.md); la alternativa de una sola organización está en [plan-una-organizacion.md](./plan-una-organizacion.md).

## Resumen

SIRID ahora puede alojar varias organizaciones con catálogo y reservas separados. La autenticación continúa usando Google. Google comprueba la identidad; SIRID determina desde la base de datos la organización, el rol y el estado del usuario.

### Permisos

| Rol | Alcance |
|---|---|
| `ADMIN` | Crea y administra organizaciones y usuarios; administra instalaciones, horarios y tarifas de todas las organizaciones. No consulta ni gestiona reservas. |
| `ENCARGADO` | Gestiona las instalaciones (HU-07) y las reservas de la organización asociada a su cuenta. |
| `CLIENT` | Consulta instalaciones públicas y crea/consulta/cancela sus propias reservas dentro de su organización. |
| Visitante | Consulta instalaciones y disponibilidad pública de la organización seleccionada, sin sesión. |

## Qué se agregó

- Entidad `organizations` con `slug`, nombre, dominio de correo y estado activo.
- `organization_id` en usuarios, instalaciones y reservas.
- FKs compuestas en reservas para impedir que el cliente o la instalación pertenezcan a otro tenant.
- Migración Alembic `0007_organizations`, que crea una organización bootstrap genérica y asigna ahí los datos previos.
- Administración de organizaciones y usuarios internos desde el panel.
- Administración global del catálogo de instalaciones; las operaciones de reserva quedan reservadas al encargado.
- Selector público de organizaciones en `/organizaciones`; los catálogos se consultan con `?organization=<slug>`.
- Scope de organización en disponibilidad, consultas de reservas, estadísticas del encargado, eventos y notificaciones.

### Archivos principales

| Archivo | Responsabilidad |
|---|---|
| `backend/alembic/versions/0007_organizations.py` | Crea la organización bootstrap, agrega ownership y migra los datos existentes. |
| `backend/app/infrastructure/models.py` | Modelos y restricciones de organización/usuarios/instalaciones/reservas. |
| `backend/app/api/organizations.py` | Catálogo público, gestión administrativa de organizaciones y usuarios. |
| `backend/app/api/deps.py` | Dependencias de acceso para ADMIN, ENCARGADO y catálogo de solo lectura. |
| `backend/app/services/reservation_service.py` | Reglas de reserva y validación de rol/organización. |
| `frontend/app/organizaciones/page.tsx` | Selector público. |
| `frontend/app/admin/organizaciones/page.tsx` | Alta, edición y activación de organizaciones. |
| `frontend/app/admin/usuarios/page.tsx` | Provisionamiento y asignación de rol/estado. |
| `frontend/app/admin/instalaciones/page.tsx` | Gestión de instalaciones, con selección de organización. |

## Cómo iniciar sesión con Google

### Configuración en Google Cloud Console

1. Crea o selecciona un proyecto en Google Cloud Console.
2. Configura la pantalla de consentimiento de OAuth.
3. Crea un cliente OAuth de tipo **Web application**.
4. Añade estos **Authorized JavaScript origins**:
   - `http://localhost:3000` para desarrollo local.
   - `https://<dominio-real>` para cada origen web de producción.
5. Copia el **Client ID** en `GOOGLE_CLIENT_ID` del `.env`; Docker Compose lo pasa al backend y al frontend.

En los orígenes autorizados escribe solo esquema, host y puerto; no agregues rutas como `/ingresar` ni una barra final.

### Valores de esta implementación

| Campo de Google Cloud Console | Valor actual |
|---|---|
| Authorized JavaScript origins (local) | `http://localhost:3000` |
| Authorized JavaScript origins (producción) | `https://<dominio-real>` |
| Authorized redirect URIs | Ninguno para el flujo actual; se usa popup y no hay callback de redirección. |

El frontend usa `GoogleLogin` de Google Identity Services en UX **popup**: el callback recibe `response.credential`, y SIRID lo envía al backend en `POST /v1/auth/google`. Por ello, ese endpoint de SIRID **no** es un Authorized redirect URI. Solo si se cambia a UX `redirect` o a un flujo de autorización por código se debe registrar la URL exacta que recibirá la respuesta.

Este flujo no solicita Calendar, Drive u otras APIs de Google, y no necesita guardar un client secret en el frontend. El backend verifica la firma, el issuer, la audiencia, la expiración y que el email esté verificado.

### Audiencia externa y test users

Si las organizaciones usan dominios Google Workspace distintos, configura el tipo de usuario como **External**; `Internal` se limita a usuarios de una sola organización Google Workspace. El sistema no fija nombres ni dominios concretos: el administrador configura cada organización.

En modo **Testing**, Google normalmente permite el acceso OAuth solo a los correos de la lista **Test users**. La documentación de Google contempla una excepción cuando la aplicación solicita únicamente los scopes básicos de identidad (`openid`, `email`, `profile`): en ese caso, puede permitir el acceso sin esa lista. SIRID usa ese flujo básico. Puedes registrar los correos de prueba en la consola, pero esa lista **no asigna roles ni organizaciones** en SIRID y no debe tratarse como el control de acceso del sistema.

Para pasar a producción, revisa el estado de publicación y la verificación que Google requiera para los scopes y la marca que utilice la aplicación. SIRID no solicita scopes sensibles de otras APIs de Google.

Referencias oficiales:

- [Google OAuth production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)
- [Verificar un ID token de Google en el backend](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Configurar el client ID para Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

## Cómo se asignan organización y rol

### Bootstrap del administrador

`ADMIN_EMAILS` en `.env.example`/`.env` identifica al administrador global. Puede ser un correo de cualquier dominio y no se usa para asignar encargados o clientes. Configura el correo que recibirá `ADMIN`, por ejemplo:

```dotenv
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
ADMIN_EMAILS=administrador@tu-organizacion.example
```

No agregues a esa variable los encargados ni los clientes. El administrador inicial debe iniciar sesión con Google para entrar al panel.

### Configurar organizaciones y usuarios

1. Inicia sesión con el correo definido en `ADMIN_EMAILS`.
2. Abre **Panel → Organizaciones**. La organización bootstrap aparece como inactiva, con nombre provisional y sin dominio. Puedes editarla con el nombre, slug y dominio que correspondan y luego activarla para publicar el catálogo y permitir nuevas cuentas de ese dominio.
3. Para cada organización adicional, crea su nombre, slug y dominio desde el mismo panel.
4. Abre **Panel → Usuarios** y provisiona cada encargado con la organización y rol `ENCARGADO`. Para este rol, el correo debe pertenecer al dominio registrado de la organización.
5. Los encargados completan el vínculo iniciando sesión con su cuenta de Google.
6. Los clientes pueden registrarse al iniciar sesión si su dominio coincide exactamente con una organización activa. También pueden provisionarse desde el panel; el administrador puede completar después su perfil de cliente.

Las cuentas y roles se guardan en PostgreSQL. Un dominio admitido solo determina la organización de una cuenta nueva y **no concede privilegios de encargado**. Una cuenta desactivada no puede iniciar sesión ni realizar operaciones posteriores.

La organización bootstrap conserva el ownership de los datos heredados. Renómbrala y actívala si esos datos deben pertenecer a una organización real; crear una organización adicional no traslada instalaciones ni reservas automáticamente. El primer ADMIN se asigna a ese registro mediante su ID interno estable, no por nombre, slug ni dominio.

## Catálogo público

- `/organizaciones` lista las organizaciones activas sin iniciar sesión.
- `/instalaciones?organization=<slug>` muestra el catálogo de la organización seleccionada.
- Los enlaces al detalle y al mapa conservan la organización seleccionada.
- Si se recibe una instalación de otra organización al crear una reserva, el backend la rechaza. La organización del usuario nunca se toma de un campo libre enviado por el navegador.

La migración conserva las rutas legacy `/v1/facilities` restringiéndolas a la organización bootstrap; las nuevas consultas multi-organización usan `/v1/organizations/{slug}/facilities`.

## Migración y datos

La migración `0007_organizations`:

1. Crea una organización bootstrap inactiva con nombre/slug provisionales, ID estable y dominio sin asignar.
2. Añade `organization_id` a usuarios, instalaciones y reservas existentes.
3. Asigna los registros existentes a la organización bootstrap.
4. Crea constraints/índices y FKs compuestas de reserva a usuario e instalación.

Las instalaciones de cada organización deben crearse en esa organización; no se copian datos automáticamente entre ellas. La restricción PostgreSQL `reservations_no_overlap` sigue siendo la garantía transaccional contra reservas solapadas.

## Validación realizada

- `npm run build` — pasa.
- `npm run typecheck` — pasa.
- `python -m compileall -q backend/app backend/tests` — pasa.
- Ruff focalizado en backend y pruebas modificadas — pasa.
- Alembic `upgrade head --sql` offline — genera SQL correctamente.
- Pruebas completas en PostgreSQL 16 vía Docker en WSL Ubuntu — **154 passed**.

El test se ejecutó con `docker compose run --rm --build backend pytest -q`. El contenedor `sirid-postgres-1` se detuvo al terminar; se conservó el volumen `sirid_postgres_data`. No se hizo commit.
