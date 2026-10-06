# Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | Una instalacion no puede tener dos reservas activas con periodos solapados. |
| RN-02 | Una reserva solo puede crearse dentro de un horario operativo. |
| RN-03 | El periodo se interpreta como intervalo semiabierto `[inicio, fin)`. |
| RN-04 | La tarifa se calcula en el backend con la tarifa vigente al crear la reserva. |
| RN-05 | El cliente debe estar autenticado para reservar. |
| RN-06 | El cliente solo puede consultar y cancelar sus propias reservas. |
| RN-07 | Solo el administrador puede confirmar una reserva pendiente. |
| RN-08 | Una reserva confirmada puede cancelarse, pero no volver a pendiente. |
| RN-09 | Una reserva solo puede completarse despues de que termine su periodo. |
| RN-10 | Una instalacion inactiva no aparece como reservable. |

## Concurrencia

La disponibilidad mostrada en pantalla es informativa. La garantia definitiva sera una exclusion constraint de PostgreSQL sobre la instalacion y el rango temporal. Si dos peticiones compiten, una persiste y la otra recibe `409 Conflict`.

## Politica de notificaciones

- La creacion genera aviso de solicitud recibida.
- La confirmacion genera aviso de reserva aprobada.
- La cancelacion genera aviso de reserva cancelada.
- Si SMTP falla, la reserva no se revierte; el fallo se registra y queda visible para reintento administrativo futuro.
