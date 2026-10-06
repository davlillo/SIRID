# Especificacion funcional del complejo

## Zonas

El complejo DAVLILLOS se modelara como un conjunto de zonas. Una zona organiza visualmente instalaciones, pero la unidad que se reserva siempre es `Facility`.

| Zona | Instalaciones |
|---|---|
| Estadio | Estadio Davlillos y graderios |
| Futbol | Futbol 11, Futbol 7, Futbol 5 A y Futbol 5 B |
| Acuatica | Piscina Olimpica y Piscina Recreativa |
| Canchas | Basket y futuras canchas complementarias |
| Eventos | Salon Principal y Terraza Multiuso |
| Servicios | Vestidores, parqueo, recepcion y circulaciones; no reservables en MVP |

## Instalaciones reservables

### Estadio Davlillos

- Tipo: `STADIUM`.
- Uso: futbol 11, eventos deportivos y eventos especiales.
- Capacidad: 5000 espectadores como dato inicial.
- Reserva: bloques largos configurables.
- Metadatos: graderios, iluminacion, camerinos, medidas del campo.

### Futbol 11

- Tipo: `FIELD`.
- Uso: partidos y entrenamientos.
- Superficie: cesped sintetico o natural configurable.
- Capacidad de jugadores: 22 como dato inicial.

### Futbol 7

- Tipo: `FIELD`.
- Uso: partidos y entrenamientos.
- Capacidad de jugadores: 14 como dato inicial.

### Futbol 5

- Tipo: `FIELD`.
- Dos instancias independientes: A y B.
- Cada instancia tiene disponibilidad y tarifas propias.
- Una reserva de A no bloquea B.

### Baloncesto

- Tipo: `COURT`.
- Uso: partidos, entrenamientos y clinicas.
- Superficie y equipamiento se muestran en el detalle.

### Piscinas

- Tipo: `POOL`.
- Piscina Olimpica: carriles y capacidad alta.
- Piscina Recreativa: uso familiar o recreativo.
- En el MVP se reserva la piscina completa; carriles individuales quedan fuera del alcance.

### Espacios de eventos

- `EVENT_SPACE`: Salon Principal.
- `MULTIUSE`: Terraza Multiuso.
- El cliente indica una nota de evento.
- La cotizacion puede depender de duracion, capacidad y horario.
- El administrador mantiene la confirmacion manual.

## Caracteristicas comunes

Cada ficha debe mostrar:

- Nombre y tipo.
- Deporte o uso.
- Descripcion.
- Capacidad.
- Superficie.
- Servicios incluidos.
- Galeria de imagenes.
- Horario de atencion.
- Tarifa desde.
- Estado reservable.
- Ubicacion en el mapa.

## Reglas de agrupacion

- La zona es una agrupacion visual y no reemplaza `facility_id`.
- Una instalacion puede tener varias imagenes, horarios y tarifas.
- Una instalacion inactiva no se ofrece al cliente.
- Una instalacion informativa, como parqueo, puede existir en el mapa con `is_bookable = false`.
