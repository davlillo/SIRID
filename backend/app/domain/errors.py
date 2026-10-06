"""Errores de dominio. Cada uno traduce a un status HTTP fijo.

El mapeo vive aqui y no en los routers para que el servicio sea la autoridad
(spect/14-arquitectura-de-servicios-backend.md).
"""


class DomainError(Exception):
    """Base de los errores previstos. Se serializa como problem+json."""

    status: int = 400
    title: str = "Domain error"
    slug: str = "domain-error"

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class AuthenticationFailed(DomainError):
    status = 401
    title = "Authentication failed"
    slug = "authentication-failed"


class InvalidGoogleCredential(AuthenticationFailed):
    title = "Invalid Google credential"
    slug = "invalid-google-credential"


class RateLimited(DomainError):
    status = 429
    title = "Too many requests"
    slug = "rate-limited"


class AdminRequired(DomainError):
    status = 403
    title = "Administrator role required"
    slug = "admin-required"


class UserNotFound(DomainError):
    status = 404
    title = "User not found"
    slug = "user-not-found"


class ClientDuiTaken(DomainError):
    status = 409
    title = "DUI de cliente ya registrado"
    slug = "client-dui-taken"


class ClientEmailTaken(DomainError):
    status = 409
    title = "Correo de cliente ya registrado"
    slug = "client-email-taken"


class ClientNotFound(DomainError):
    status = 404
    title = "Cliente no encontrado"
    slug = "client-not-found"


class AccountDisabled(AuthenticationFailed):
    title = "Cuenta desactivada"
    slug = "account-disabled"


class FacilityNotFound(DomainError):
    status = 404
    title = "Facility not found"
    slug = "facility-not-found"


class FacilityNotBookable(DomainError):
    status = 409
    title = "Facility is not bookable"
    slug = "facility-not-bookable"


class FacilitySlugTaken(DomainError):
    status = 409
    title = "Facility slug already used"
    slug = "facility-slug-taken"


class InvalidSchedule(DomainError):
    status = 422
    title = "Invalid schedule"
    slug = "invalid-schedule"


class InvalidRate(DomainError):
    status = 422
    title = "Tarifa inválida"
    slug = "invalid-rate"


class RateNotAvailable(DomainError):
    status = 422
    title = "No hay una tarifa activa para el período solicitado"
    slug = "rate-not-available"


class InvalidReservationPeriod(DomainError):
    status = 422
    title = "Invalid reservation period"
    slug = "invalid-reservation-period"


class OutsideOperatingHours(DomainError):
    status = 422
    title = "Requested period is outside operating hours"
    slug = "outside-operating-hours"


class ReservationNotFound(DomainError):
    status = 404
    title = "Reservation not found"
    slug = "reservation-not-found"


class NotReservationOwner(ReservationNotFound):
    """Se responde 404 para no filtrar la existencia de reservas ajenas.

    spect/06-autenticacion-y-seguridad.md pide una respuesta consistente que no
    permita enumerar recursos de otro cliente.
    """

    slug = "reservation-not-found"


class InvalidReservationTransition(DomainError):
    status = 409
    title = "Invalid reservation transition"
    slug = "invalid-reservation-transition"


class ReservationNotFinished(DomainError):
    status = 409
    title = "Reservation period has not finished"
    slug = "reservation-not-finished"


class ReservationConflict(DomainError):
    status = 409
    title = "Reservation conflict"
    slug = "reservation-conflict"
