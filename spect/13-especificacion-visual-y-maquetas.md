# Especificacion visual y maquetas

## Fuente de verdad del diseño

El sistema debe basarse en:

`C:\Users\serda\Downloads\davlillos-design-system-v1.0\davlillos-design-system`

Documentos visuales de referencia:

- `brand/identity.md`
- `brand/guidelines.md`
- `colors/palette.md`
- `colors/semantic.md`
- `typography/fonts.md`
- `ui/tokens.json`
- `ui/tokens.css`
- `ui/tailwind-theme.js`
- `ui/components.md`
- `web/landing.md`
- `web/responsive.md`
- `web/motion.md`

Assets a reutilizar:

- `assets/logo/svg/davlillos-lockup-horizontal.svg`
- `assets/logo/svg/davlillos-symbol-primary.svg`
- `assets/patterns/svg/dvl-grid.svg`
- `assets/patterns/svg/dvl-topo.svg`
- `assets/textures/png/paper-grain.png`
- `assets/textures/png/olive-topo.png`
- `assets/artifacts/ui/landing-hero.png`

En el proyecto, los assets seleccionados se copiaran a `frontend/public/brand/` y `frontend/public/textures/`, conservando la fuente original documentada.

## Tokens

| Token | Valor | Uso |
|---|---|---|
| Terracota | `#C65F45` | CTA y seleccion activa |
| Marfil | `#F7F3EA` | Fondo claro |
| Carbon | `#191817` | Texto y fondo oscuro |
| Arena | `#E8D8BE` | Superficies |
| Oliva | `#65705A` | Disponibilidad y filtros |
| Cafe | `#49352C` | Profundidad |

Radios: 6px para controles, 12px para superficies, 20px solo para piezas destacadas. Bordes finos y sombras minimas.

## Maqueta de rutas

### `/`

Hero editorial, catalogo destacado, metodo de reserva, preview del plano, CTA y footer tecnico.

### `/instalaciones`

Encabezado de catalogo, filtros por tipo/deporte/capacidad, grid de tarjetas y estado vacio.

### `/instalaciones/[slug]`

Galeria, datos tecnicos, plano con instalacion resaltada, disponibilidad y CTA.

### `/reservar/[id]`

Paso 1 fecha, paso 2 bloque, paso 3 resumen, paso 4 autenticacion/confirmacion.

### `/mis-reservas`

Lista de reservas con estado, fecha, instalacion, importe y cancelacion.

### `/admin`

Indicadores, pendientes recientes y acceso a operaciones.

### `/admin/reservas`

Tabla con filtros, detalle lateral y acciones de estado.

### `/admin/instalaciones`

CRUD de espacios, horarios, tarifas y coordenadas del mapa.

## Maqueta de estados

- Disponible: oliva y texto `DISPONIBLE`.
- Pendiente: arena y texto `PENDIENTE`.
- Confirmada: oliva oscuro y texto `CONFIRMADA`.
- Cancelada: carbon atenuado y texto `CANCELADA`.
- Completada: cafe y texto `COMPLETADA`.
- Error: color semantico de error independiente de terracota.

## Motion

Usar 120-180ms para controles, 180-260ms para transiciones y 320-480ms para reveals. No usar movimiento continuo en el plano. Respetar `prefers-reduced-motion`.
