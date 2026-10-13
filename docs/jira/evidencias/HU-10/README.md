# HU-10 — Registrar pago o anticipo

## Criterios de aceptación (Jira)

1. Un pago registrado queda vinculado a su reservación.
2. Si el pago acumulado no alcanza el monto requerido, confirmar la reserva informa pago insuficiente.

## Implementación

| Capa | Ubicación |
|------|-----------|
| Migración | `backend/alembic/versions/0009_reservation_payments.py` |
| Modelo | `ReservationPaymentModel` en `backend/app/infrastructure/models.py` |
| Reglas | `assert_positive_payment_amount`, `assert_sufficient_payment` en `backend/app/domain/rules.py` |
| API | `GET/POST /v1/admin/reservations/{id}/payments` |
| Confirmación | `ReservationService.confirm` valida saldo antes de pasar a `CONFIRMED` |
| UI | Panel detalle en `/admin/reservas` |

## Regla de negocio

- Importe exigido = `quoted_amount` de la reserva (cotizado al crear la solicitud).
- Varios anticipos se suman hasta cubrir el total.
- Solo reservas `PENDING` admiten nuevos pagos.

## Pruebas

```bash
docker compose exec backend python -m pytest tests/test_api_payments.py tests/test_domain_rules.py::TestPaymentRules -q
```

## Flujo manual sugerido (capturas Jira)

1. Reserva pendiente → registrar anticipo parcial → intentar confirmar → mensaje de pago insuficiente.
2. Completar el monto → confirmar → estado `CONFIRMED`.
3. Listado de pagos en el panel con fechas e importes.
