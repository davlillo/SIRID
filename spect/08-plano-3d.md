# Plano 3D interactivo

## Objetivo

Mostrar la distribucion conceptual del complejo y permitir seleccionar una instalacion. El plano ayuda a elegir visualmente, pero la disponibilidad real siempre proviene de la API.

## Complejo representado

La primera escena debe contemplar nueve nodos reservables o agrupaciones:

| Nodo | Representacion | Reserva |
|---|---|---|
| Estadio Davlillos | Volumen principal grande | Eventos o futbol 11 |
| Cancha Fut 7 | Rectangulo de cesped | Bloques deportivos |
| Cancha Fut 5 A | Rectangulo pequeno | Bloques deportivos |
| Cancha Fut 5 B | Rectangulo pequeno | Bloques deportivos |
| Arena Basket | Rectangulo con aro | Bloques deportivos |
| Piscina Olimpica | Plano azul profundo | Carriles o uso exclusivo |
| Piscina Recreativa | Plano azul claro | Uso recreativo |
| Salon Principal | Volumen cerrado | Eventos |
| Terraza Multiuso | Plataforma abierta | Eventos o actividades |

El backend entrega la lista de instalaciones y sus coordenadas. La escena no debe tener nombres codificados cuando se conecte a datos reales.

## Implementacion

- `@react-three/fiber` para el canvas React.
- `@react-three/drei` para controles, textos y utilidades.
- Geometrias simples: planos, cajas, cilindros y lineas.
- En una segunda iteracion se pueden agregar `ExtrudeGeometry`, `ShapeGeometry` para canchas y una capa de agua para piscinas.
- Datos de ubicacion almacenados en la configuracion de cada instalacion: `map_x`, `map_y`, `map_z`, `map_width`, `map_depth`.
- Color semantico: oliva disponible, arena seleccionable, carbon no disponible, terracota seleccionado.

## Interaccion

- Orbit controls limitados para evitar perder orientacion.
- Click o tap sobre una instalacion.
- Tooltip con nombre, deporte y estado.
- Boton para volver a vista superior.
- Leyenda visible.
- Teclado y lista alternativa sin WebGL.

## Rendimiento

- No cargar modelos pesados en el MVP.
- Lazy load del canvas en la pagina de detalle.
- Limitar sombras y luces.
- Respetar `prefers-reduced-motion`.
- Mostrar fallback si WebGL no esta disponible.

## Maqueta por capas

1. Terreno y caminos: plano base con reticula tecnica.
2. Volumenes principales: estadio, salon y terraza.
3. Superficies deportivas: campos y cancha de basket.
4. Agua: piscinas con material semitransparente sin refraccion pesada.
5. Etiquetas: nombres, tipo y estado.
6. Interaccion: seleccion, tooltip y enlace a reserva.

## Limite de alcance

No representa un levantamiento arquitectonico ni garantiza escala constructiva. Si luego se reciben planos reales, se podra reemplazar la capa visual sin cambiar el modelo de reservas.
