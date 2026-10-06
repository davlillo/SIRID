# Frontend · SIRID Reserva

Next.js 15 con App Router, TypeScript estricto y Atomic Design.

## Estructura

```text
app/                rutas; solo componen templates y features
components/
  atoms/            button, field, states, status-badge, technical-label, brand-mark
  molecules/        site-header, site-footer, facility-card, date-stepper
  organisms/        facility-catalog, availability-calendar, reservation-flow, complex-map-3d
  templates/        public-layout, admin-layout
features/           auth, facilities, reservations, admin, ui, providers
lib/                api (cliente HTTP), types (contrato), format, cn
styles/             davlillos-tokens.css
public/             brand, patterns, textures, icons, facilities
```

Ninguna ruta concentra logica de negocio y ningun atom accede a datos.

## Design system

Los tokens salen de `davlillos-design-system/ui/tokens.json` y se copian, no se reinterpretan:

| Token | Valor | Uso |
|---|---|---|
| Terracota | `#C65F45` | CTA e identidad |
| Marfil | `#F7F3EA` | Fondo |
| Carbon | `#191817` | Texto y contraste |
| Arena | `#E8D8BE` | Superficies |
| Oliva | `#65705A` | Disponibilidad, filtros y labels tecnicos |
| Cafe | `#49352C` | Profundidad |

Tipografias: Space Grotesk (display), IBM Plex Sans (interfaz), IBM Plex Mono (datos,
estados, coordenadas y etiquetas tecnicas).

## Sesion

La cookie de sesion es `HttpOnly`: el frontend nunca la lee ni la escribe. Toda peticion sale
con `credentials: "include"`. Lo que guarda `AuthProvider` decide que se dibuja, no que se
permite: cada endpoint protegido vuelve a validar la sesion y el rol en el backend.

## Plano 3D

`ComplexMap3D` es client-only y recibe las instalaciones de `GET /v1/facilities`. No tiene
nombres codificados: la geometria sale de `map_x`, `map_z`, `map_width` y `map_depth`, y la
altura del `facility_kind`. La escena no decide si una hora esta libre.

Siempre se acompaña de `MapFallback`, una lista navegable por teclado que se usa tambien
cuando no hay WebGL o cuando el usuario pidio `prefers-reduced-motion`.

## Comandos

```bash
npm run dev
npm run typecheck
npm run build
```

En la unidad `E:` de esta maquina `npm run build` falla con `EISDIR` por un defecto del
volumen al resolver `readlink`; ver la nota del README raiz. `dev` y `typecheck` no se ven
afectados.
