# Librerias, assets y fuentes de diseño

## Frontend

| Libreria | Version orientativa | Motivo |
|---|---|---|
| Next.js | 15.x | App Router y estructura web |
| React | 19.2.x | Componentes y server/client components |
| TypeScript | 5.7.x | Tipado estricto |
| Tailwind CSS | 3.4.x | Tokens y composicion responsive |
| shadcn/ui | CLI actual | Componentes copiables y accesibles |
| Radix UI | Transitiva | Dialogos, menus, tabs y popovers |
| TanStack Query | 5.x | Estado remoto |
| React Hook Form | 7.x | Formularios |
| Zod | 3.x | Validacion de formularios |
| Three.js | 0.17x | Motor WebGL |
| @react-three/fiber | 9.x | Three.js declarativo para React |
| @react-three/drei | 9.x | Camara, controles, texto y helpers |
| lucide-react | 0.x | Iconos lineales |
| date-fns | 4.x | Fechas y periodos |

## Backend

| Libreria | Motivo |
|---|---|
| FastAPI | API REST y OpenAPI |
| Pydantic | Schemas y validacion |
| SQLAlchemy 2 async | ORM y consultas |
| asyncpg | Driver PostgreSQL |
| Alembic | Migraciones |
| google-auth | Validacion de identidad Google |
| PyJWT | Sesion local |
| aiosmtplib | SMTP asincrono |
| Jinja2 | Plantillas de correo |
| pytest/httpx | Pruebas |

## Design system

Ruta de referencia original:

`C:\Users\serda\Downloads\davlillos-design-system-v1.0\davlillos-design-system`

Ruta de integracion prevista:

```text
frontend/public/brand/
frontend/public/patterns/
frontend/public/textures/
frontend/styles/davlillos-tokens.css
```

Se deben copiar, no reinterpretar arbitrariamente, los SVG de logo, patrones y texturas autorizados. El archivo `ui/tokens.json` es la fuente de verdad.

## Tipografias

- Space Grotesk: titulares y nombres de instalaciones.
- IBM Plex Sans: interfaz, descripcion y ayuda.
- IBM Plex Mono: estados, IDs, horarios, coordenadas y etiquetas tecnicas.

## Assets propios a producir

- Fotografias reales o renders consistentes del complejo.
- Iconos de futbol, basket, piscina y eventos en estilo lineal.
- Miniaturas de cada instalacion.
- Materiales de la escena 3D en colores DAVLILLOS.

No usar imagenes de stock corporativo generico ni gradientes neon como sustituto de una direccion de arte.
