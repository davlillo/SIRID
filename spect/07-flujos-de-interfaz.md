# Flujos de interfaz

## Direccion visual

La interfaz aplicara el design system DAVLILLOS: terracota `#C65F45` como CTA, marfil `#F7F3EA` como fondo, carbon `#191817` para contraste, arena `#E8D8BE` para superficies y oliva `#65705A` para disponibilidad y filtros. Tipografias: Space Grotesk, IBM Plex Sans e IBM Plex Mono.

## Landing

1. Hero con mensaje principal y CTA `Explorar instalaciones`.
2. Instalaciones destacadas.
3. Explicacion breve del proceso: elegir, reservar, confirmar.
4. Vista previa del plano del complejo.
5. CTA de inicio de sesion o catalogo.
6. Footer tecnico con marca y estado del sistema.

La composicion debe ser editorial, con espacio negativo y una sola textura dominante. No usar gradientes genericos ni tarjetas excesivas.

## Flujo de cliente

1. Explora el catalogo.
2. Filtra por deporte o capacidad.
3. Abre una instalacion.
4. Selecciona fecha y bloque libre.
5. Revisa tarifa y datos de la solicitud.
6. Inicia sesion con Google si es necesario.
7. Confirma la solicitud.
8. Ve el estado `Pendiente` y recibe correo.

## Flujo de administrador

1. Inicia sesion con cuenta autorizada.
2. Revisa indicadores y reservas pendientes.
3. Filtra por fecha, instalacion y estado.
4. Abre una reserva y confirma o cancela.
5. Marca como completada cuando corresponde.
6. Recibe feedback visible si el correo no pudo enviarse.

## Componentes

- `FacilityCard`, `FacilityFilters`, `AvailabilityCalendar`.
- `ReservationSummary`, `ReservationStatusBadge`, `CancelReservationDialog`.
- `AdminReservationTable`, `AdminStats`, `FacilityForm`.
- `ComplexMap3D`, `MapLegend`.
- `AuthButton`, `Toast`, `EmptyState`, `ErrorState`.

## Datos del complejo en la interfaz

El catalogo debe agrupar las instalaciones por zona:

- `Estadio`: Estadio Davlillos.
- `Futbol`: Futbol 11, Futbol 7, Futbol 5 A y Futbol 5 B.
- `Acuatica`: Piscina Olimpica y Piscina Recreativa.
- `Canchas`: Baloncesto y futuras canchas.
- `Eventos`: Salon Principal y Terraza Multiuso.

El usuario puede entrar por catalogo o por mapa. Ambas entradas deben terminar en el mismo detalle de `facility` y no duplicar el flujo de reserva.

## Responsive y accesibilidad

- Mobile first; 4 columnas mobile, 6 tablet y 12 desktop.
- Reordenar contenido en mobile en lugar de comprimirlo.
- Targets tactiles de minimo 44px.
- Estados no comunicados solo por color.
- Labels asociados a inputs y foco visible.
- Soporte para `prefers-reduced-motion`.
- El plano 3D tendra alternativa en lista para teclado, mobile o bajo rendimiento.
