# Maquetas detalladas

## Navegacion publica

Header: marca DAVLILLOS, enlace `Instalaciones`, enlace `Mapa`, boton `Ingresar`.

Footer: marca, enlaces de ayuda, correo de contacto, `STATUS: BUILDING` y version de la aplicacion.

## Home

```text
[HEADER]
[DVL / RESERVE_01]
[Titular: Reserva el lugar. Juega sin cruces.]
[Texto] [Explorar instalaciones] [Como funciona]
[Visual editorial del complejo / mapa]

[Instalaciones destacadas: Fut 7 | Piscina | Eventos]
[Metodo: Elegir -> Solicitar -> Confirmar]
[Preview mapa 3D]
[CTA: Ver disponibilidad]
[FOOTER]
```

## Catalogo

```text
[CATALOG_01] Instalaciones
[Filtros: zona | deporte | tipo | capacidad]
[Orden: recomendadas | tarifa | capacidad]
[Grid de FacilityCard]
[Paginacion o carga progresiva]
```

Cada tarjeta contiene imagen, tipo, nombre, capacidad, tarifa desde, badge de disponibilidad y CTA.

## Detalle

```text
[Breadcrumb]
[Galeria] [Ficha tecnica]
[Nombre / deporte / capacidad / servicios]
[Plano 3D con nodo resaltado]
[Selector fecha]
[Bloques libres]
[Resumen de tarifa]
[Reservar este espacio]
```

## Crear reserva

El flujo debe conservar la seleccion en pantalla y mostrar una confirmacion final antes del POST.

```text
1. Fecha
2. Hora inicial y final
3. Datos de solicitud
4. Importe cotizado
5. Login Google si falta sesion
6. Confirmar solicitud
7. Estado pendiente y correo
```

## Panel cliente

- Proxima reserva destacada.
- Historial filtrable.
- Badge de estado.
- Detalle de instalacion y periodo.
- Accion cancelar solo cuando la regla lo permite.

## Panel admin

```text
[Sidebar: Resumen | Reservas | Instalaciones | Horarios | Tarifas]
[KPIs: pendientes | confirmadas hoy | ocupacion | ingresos cotizados]
[Tabla de reservas]
[Panel de detalle y acciones]
```

La tabla es prioritaria sobre el adorno visual: el administrador necesita decidir rapidamente.

## Responsive

- Desktop: layout de 12 columnas y mapa junto al detalle.
- Tablet: layout de 6 columnas, filtros plegables.
- Mobile: una columna, CTA fijo inferior durante el flujo de reserva.
- El mapa 3D se transforma en vista superior simplificada y lista accesible.
