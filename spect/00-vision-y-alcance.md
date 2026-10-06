# DAVLILLOS Reserva Deportiva

## Vision

DAVLILLOS Reserva Deportiva permitira que los clientes consulten instalaciones deportivas, revisen disponibilidad y soliciten reservas desde una experiencia web. El personal administrador gestionara instalaciones, horarios, tarifas y el ciclo de vida de cada reserva.

## Problema

Las reservas telefonicas y los registros manuales dificultan conocer la disponibilidad real y permiten asignar una misma instalacion a periodos coincidentes.

## Objetivos del MVP

- Mostrar una landing publica y un catalogo de instalaciones.
- Permitir autenticacion mediante Google.
- Consultar disponibilidad por fecha y periodo.
- Crear reservas con estado `PENDING`.
- Permitir al administrador confirmar, cancelar y completar reservas.
- Impedir solapamientos mediante una restriccion en PostgreSQL.
- Notificar por correo las reservas creadas y sus cambios relevantes.
- Ofrecer un plano 3D esquematico e interactivo del complejo.

## Actores

| Actor | Objetivo |
|---|---|
| Cliente | Consultar instalaciones, reservar y revisar sus reservas |
| Administrador | Gestionar catalogo y aprobar o actualizar reservas |
| Google | Proveedor de identidad |
| Gmail SMTP | Proveedor de correo transaccional |

## Incluye

- Usuarios autenticados con Google.
- Roles `CLIENT` y `ADMIN`.
- CRUD administrativo de instalaciones, horarios y tarifas.
- Catalogo publico y detalle de instalacion.
- Disponibilidad y validacion de horarios.
- Reserva, cancelacion y consulta del historial propio.
- Confirmacion, cancelacion y finalizacion administrativa.
- Auditoria de cambios de reserva.
- Correos SMTP.
- Plano 3D esquematico basado en geometria de Three.js.
- Docker Compose para desarrollo local.

## No incluye en el MVP

- Pagos en linea.
- Reservas recurrentes.
- Aplicacion movil nativa.
- Chat o mensajeria interna.
- Integracion con calendarios externos.
- Multi-sede.
- Modelado arquitectonico 3D fotorealista.
- Cancelacion automatica por falta de pago.

## Criterios de exito

- Ninguna instalacion puede tener dos reservas activas solapadas.
- Un cliente no puede acceder a reservas de otro cliente.
- Un administrador puede completar el flujo de reserva sin editar la base de datos manualmente.
- El proyecto se levanta con un unico comando Docker Compose documentado.

## Restricciones

- La primera version debe ser realizable por un equipo academico pequeno.
- Gmail se usara mediante SMTP y contraseña de aplicacion.
- La Etapa 2 debe poder implementar esta especificacion sin redefinir el dominio.
