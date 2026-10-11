# SIRID — Sistema de Reservación de Instalaciones Deportivas

## Vision

SIRID permitirá que clientes de distintas organizaciones consulten sus instalaciones deportivas, revisen disponibilidad y soliciten reservas desde una experiencia web. El administrador del sistema gestionará organizaciones, usuarios e instalaciones; cada encargado gestionará las reservas de su organización.

## Problema

Las reservas telefonicas y los registros manuales dificultan conocer la disponibilidad real y permiten asignar una misma instalacion a periodos coincidentes.

## Objetivos del MVP

- Mostrar una landing publica y un catalogo de instalaciones.
- Permitir autenticacion mediante Google.
- Consultar disponibilidad por fecha y periodo.
- Crear reservas con estado `PENDING`.
- Permitir al encargado confirmar, cancelar y completar reservas de su organización.
- Permitir al administrador del sistema crear organizaciones y gestionar usuarios, instalaciones, horarios y tarifas en cualquiera de ellas.
- Aislar clientes, instalaciones y reservas entre organizaciones, con catálogo público seleccionable por organización.
- Impedir solapamientos mediante una restriccion en PostgreSQL.
- Notificar por correo las reservas creadas y sus cambios relevantes.
- Ofrecer un plano 3D esquematico e interactivo del complejo.

## Actores

| Actor | Objetivo |
|---|---|
| Cliente | Consultar instalaciones, reservar y revisar sus reservas |
| Encargado | Gestionar las reservas de su organización |
| Administrador del sistema | Gestionar organizaciones, usuarios e instalaciones; no accede a reservas |
| Organización | Mantener un catálogo y reservas aisladas |
| Google | Proveedor de identidad |
| Gmail SMTP | Proveedor de correo transaccional |

## Incluye

- Usuarios autenticados con Google.
- Roles `CLIENT`, `ENCARGADO` y `ADMIN`.
- Organizaciones con usuarios, instalaciones, horarios, tarifas y reservas aislados.
- CRUD global de organizaciones/usuarios; CRUD de instalaciones disponible al administrador del sistema.
- Catálogo público y detalle de instalación por organización.
- Disponibilidad y validacion de horarios.
- Reserva, cancelacion y consulta del historial propio.
- Confirmación, cancelación y finalización de reservas por el encargado de la organización.
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
- Un encargado puede completar el flujo de reserva de su organización sin editar la base de datos manualmente.
- Un usuario no puede consultar ni modificar reservas de otra organización.
- El administrador puede gestionar instalaciones de varias organizaciones, pero no consultar ni operar reservas.
- El proyecto se levanta con un unico comando Docker Compose documentado.

## Restricciones

- La primera version debe ser realizable por un equipo academico pequeno.
- Gmail se usara mediante SMTP y contraseña de aplicacion.
- La Etapa 2 debe poder implementar esta especificacion sin redefinir el dominio.
