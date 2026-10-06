"""Enumeraciones del dominio. Espejo exacto de los tipos PostgreSQL."""

from enum import StrEnum


class UserRole(StrEnum):
    CLIENT = "CLIENT"
    ENCARGADO = "ENCARGADO"
    ADMIN = "ADMIN"


class FacilityKind(StrEnum):
    STADIUM = "STADIUM"
    FIELD = "FIELD"
    COURT = "COURT"
    POOL = "POOL"
    EVENT_SPACE = "EVENT_SPACE"
    MULTIUSE = "MULTIUSE"


class SportType(StrEnum):
    FOOTBALL_11 = "FOOTBALL_11"
    FOOTBALL_7 = "FOOTBALL_7"
    FOOTBALL_5 = "FOOTBALL_5"
    BASKETBALL = "BASKETBALL"
    SWIMMING = "SWIMMING"
    EVENT = "EVENT"
    MULTIUSE = "MULTIUSE"


class ReservationStatus(StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class ReservationEventType(StrEnum):
    CREATED = "CREATED"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class Zone(StrEnum):
    """Agrupacion visual del catalogo. No sustituye a `facility_id`."""

    ESTADIO = "ESTADIO"
    FUTBOL = "FUTBOL"
    ACUATICA = "ACUATICA"
    CANCHAS = "CANCHAS"
    EVENTOS = "EVENTOS"
    SERVICIOS = "SERVICIOS"


# Solo estas ocupan una franja horaria (spect/02-modelo-de-dominio.md).
ACTIVE_RESERVATION_STATUSES = frozenset({ReservationStatus.PENDING, ReservationStatus.CONFIRMED})
