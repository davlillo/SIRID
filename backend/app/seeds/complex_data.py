"""Catalogo inicial del complejo SIRID.

Datos declarativos: el seed solo los recorre. Las coordenadas `map_*` describen
la escena 3D en unidades de escena, no en metros reales
(spect/08-plano-3d.md limita el alcance a una maqueta esquematica).
"""

from datetime import time
from decimal import Decimal

FULL_WEEK = tuple(range(7))
WEEKDAYS = (0, 1, 2, 3, 4, 5)
SUNDAY = (6,)


def schedule(weekdays: tuple[int, ...], opens: str, closes: str) -> list[dict]:
    return [
        {
            "weekday": weekday,
            "opens_at": time.fromisoformat(opens),
            "closes_at": time.fromisoformat(closes),
        }
        for weekday in weekdays
    ]


FACILITIES: list[dict] = [
    {
        "slug": "estadio-sirid",
        "name": "Estadio SIRID",
        "zone": "ESTADIO",
        "sport_type": "FOOTBALL_11",
        "facility_kind": "STADIUM",
        "surface": "NATURAL_GRASS",
        "capacity": 5000,
        "location_label": "Zona Estadio",
        "description": (
            "El volumen principal del complejo. Campo de futbol 11 con graderios, "
            "iluminacion nocturna y camerinos. Se reserva por bloques largos para "
            "partidos oficiales y eventos deportivos."
        ),
        "map": (-11.0, 0.0, -5.0, 15.0, 11.0),
        "metadata": {
            "field_size_m": "105 x 68",
            "lighting": "LED 1200 lux",
            "locker_rooms": 4,
            "stands": "Norte, Sur y Palco",
            "broadcast_ready": True,
        },
        "schedules": schedule(FULL_WEEK, "08:00", "22:00"),
        "rate": {"name": "Bloque de estadio", "amount": Decimal("450.00"), "minutes": 120},
        "images": [("/facilities/stadium.svg", "Vista esquematica del estadio principal")],
    },
    {
        "slug": "cancha-futbol-11",
        "name": "Cancha Futbol 11",
        "zone": "FUTBOL",
        "sport_type": "FOOTBALL_11",
        "facility_kind": "FIELD",
        "surface": "SYNTHETIC_GRASS",
        "capacity": 22,
        "location_label": "Zona Futbol",
        "description": (
            "Campo reglamentario de futbol 11 en cesped sintetico de ultima generacion. "
            "Pensado para partidos de liga amateur y entrenamientos de plantilla completa."
        ),
        "map": (6.0, 0.0, -7.0, 13.0, 8.0),
        "metadata": {
            "field_size_m": "100 x 64",
            "lighting": "LED 800 lux",
            "locker_rooms": 2,
            "goals": 2,
        },
        "schedules": schedule(WEEKDAYS, "06:00", "22:00") + schedule(SUNDAY, "07:00", "20:00"),
        "rate": {"name": "Hora de futbol 11", "amount": Decimal("60.00"), "minutes": 60},
        "images": [("/facilities/field.svg", "Vista esquematica de la cancha de futbol 11")],
    },
    {
        "slug": "cancha-norte-fut-7",
        "name": "Cancha Norte",
        "zone": "FUTBOL",
        "sport_type": "FOOTBALL_7",
        "facility_kind": "FIELD",
        "surface": "SYNTHETIC_GRASS",
        "capacity": 14,
        "location_label": "Zona Futbol",
        "description": (
            "Cancha de futbol 7 en cesped sintetico con iluminacion propia. "
            "El formato mas solicitado para partidos entre semana."
        ),
        "map": (6.0, 0.0, 1.0, 10.0, 6.5),
        "metadata": {
            "field_size_m": "65 x 45",
            "lighting": "LED 600 lux",
            "locker_rooms": 1,
            "goals": 2,
        },
        "schedules": schedule(WEEKDAYS, "06:00", "22:00") + schedule(SUNDAY, "07:00", "20:00"),
        "rate": {"name": "Hora de futbol 7", "amount": Decimal("40.00"), "minutes": 60},
        "images": [("/facilities/field.svg", "Vista esquematica de la cancha de futbol 7")],
    },
    {
        "slug": "cancha-sur-a-fut-5",
        "name": "Cancha Sur A",
        "zone": "FUTBOL",
        "sport_type": "FOOTBALL_5",
        "facility_kind": "FIELD",
        "surface": "SYNTHETIC_GRASS",
        "capacity": 10,
        "location_label": "Zona Futbol Sur",
        "description": (
            "Cancha de futbol 5 con muro perimetral y red superior. Disponibilidad y "
            "tarifa independientes de la Cancha Sur B."
        ),
        "map": (1.5, 0.0, 8.0, 6.0, 4.0),
        "metadata": {"field_size_m": "38 x 20", "lighting": "LED 500 lux", "enclosed": True},
        "schedules": schedule(WEEKDAYS, "06:00", "23:00") + schedule(SUNDAY, "07:00", "21:00"),
        "rate": {"name": "Hora de futbol 5", "amount": Decimal("28.00"), "minutes": 60},
        "images": [("/facilities/field.svg", "Vista esquematica de la cancha Sur A")],
    },
    {
        "slug": "cancha-sur-b-fut-5",
        "name": "Cancha Sur B",
        "zone": "FUTBOL",
        "sport_type": "FOOTBALL_5",
        "facility_kind": "FIELD",
        "surface": "SYNTHETIC_GRASS",
        "capacity": 10,
        "location_label": "Zona Futbol Sur",
        "description": (
            "Gemela de la Cancha Sur A. Reservar una no bloquea la otra: son dos "
            "instalaciones distintas con su propia agenda."
        ),
        "map": (9.0, 0.0, 8.0, 6.0, 4.0),
        "metadata": {"field_size_m": "38 x 20", "lighting": "LED 500 lux", "enclosed": True},
        "schedules": schedule(WEEKDAYS, "06:00", "23:00") + schedule(SUNDAY, "07:00", "21:00"),
        "rate": {"name": "Hora de futbol 5", "amount": Decimal("28.00"), "minutes": 60},
        "images": [("/facilities/field.svg", "Vista esquematica de la cancha Sur B")],
    },
    {
        "slug": "arena-central-basket",
        "name": "Arena Central",
        "zone": "CANCHAS",
        "sport_type": "BASKETBALL",
        "facility_kind": "COURT",
        "surface": "HARDWOOD",
        "capacity": 20,
        "location_label": "Zona Canchas",
        "description": (
            "Cancha de baloncesto techada con piso de duela profesional, tableros "
            "de vidrio templado y marcador electronico. Apta para partidos y clinicas."
        ),
        "map": (-11.0, 0.0, 4.0, 8.0, 5.0),
        "metadata": {
            "court_size_m": "28 x 15",
            "hoops": 2,
            "scoreboard": True,
            "covered": True,
        },
        "schedules": schedule(WEEKDAYS, "06:00", "22:00") + schedule(SUNDAY, "08:00", "20:00"),
        "rate": {"name": "Hora de cancha", "amount": Decimal("30.00"), "minutes": 60},
        "images": [("/facilities/court.svg", "Vista esquematica de la arena de baloncesto")],
    },
    {
        "slug": "piscina-olimpica",
        "name": "Piscina Olimpica",
        "zone": "ACUATICA",
        "sport_type": "SWIMMING",
        "facility_kind": "POOL",
        "surface": "TILE",
        "capacity": 80,
        "location_label": "Zona Acuatica",
        "description": (
            "Piscina de 50 metros con ocho carriles, sistema de cronometraje y "
            "gradas laterales. En esta version se reserva la piscina completa."
        ),
        "map": (15.5, 0.0, -1.0, 6.0, 5.0),
        "metadata": {
            "length_m": 50,
            "lanes": 8,
            "depth_m": 2.0,
            "heated": True,
            "timing_system": True,
        },
        "schedules": schedule(WEEKDAYS, "06:00", "20:00") + schedule(SUNDAY, "08:00", "18:00"),
        "rate": {"name": "Hora de piscina olimpica", "amount": Decimal("80.00"), "minutes": 60},
        "images": [("/facilities/pool.svg", "Vista esquematica de la piscina olimpica")],
    },
    {
        "slug": "piscina-recreativa",
        "name": "Piscina Recreativa",
        "zone": "ACUATICA",
        "sport_type": "SWIMMING",
        "facility_kind": "POOL",
        "surface": "TILE",
        "capacity": 40,
        "location_label": "Zona Acuatica",
        "description": (
            "Piscina de uso familiar y recreativo con profundidad reducida, area "
            "de descanso y sombra perimetral."
        ),
        "map": (15.5, 0.0, 6.0, 5.0, 4.0),
        "metadata": {"length_m": 25, "lanes": 4, "depth_m": 1.2, "heated": False},
        "schedules": schedule(WEEKDAYS, "07:00", "20:00") + schedule(SUNDAY, "08:00", "18:00"),
        "rate": {"name": "Hora de piscina recreativa", "amount": Decimal("45.00"), "minutes": 60},
        "images": [("/facilities/pool.svg", "Vista esquematica de la piscina recreativa")],
    },
    {
        "slug": "salon-principal",
        "name": "Salon Principal",
        "zone": "EVENTOS",
        "sport_type": "EVENT",
        "facility_kind": "EVENT_SPACE",
        "surface": "POLISHED_CONCRETE",
        "capacity": 300,
        "location_label": "Zona Eventos",
        "description": (
            "Espacio cerrado y climatizado para premiaciones, conferencias y eventos "
            "corporativos. La cotizacion final depende del montaje solicitado."
        ),
        "map": (-11.0, 0.0, 10.0, 9.0, 6.0),
        "metadata": {
            "area_m2": 420,
            "air_conditioning": True,
            "projector": True,
            "sound_system": True,
            "layouts": ["auditorio", "banquete", "escuela"],
        },
        "schedules": schedule(FULL_WEEK, "08:00", "23:00"),
        "rate": {"name": "Bloque de salon", "amount": Decimal("220.00"), "minutes": 120},
        "images": [("/facilities/event.svg", "Vista esquematica del salon principal")],
    },
    {
        "slug": "terraza-multiuso",
        "name": "Terraza Multiuso",
        "zone": "EVENTOS",
        "sport_type": "MULTIUSE",
        "facility_kind": "MULTIUSE",
        "surface": "DECK",
        "capacity": 120,
        "location_label": "Zona Eventos",
        "description": (
            "Plataforma abierta con vista al complejo. Sirve para clases grupales, "
            "activaciones de marca y celebraciones al aire libre."
        ),
        "map": (-2.0, 0.0, 10.5, 6.0, 5.0),
        "metadata": {
            "area_m2": 260,
            "covered": False,
            "power_outlets": 12,
            "views": "Estadio y zona acuatica",
        },
        "schedules": schedule(FULL_WEEK, "08:00", "22:00"),
        "rate": {"name": "Bloque de terraza", "amount": Decimal("120.00"), "minutes": 120},
        "images": [("/facilities/multiuse.svg", "Vista esquematica de la terraza multiuso")],
    },
    # Espacios informativos: aparecen en el plano pero no se reservan.
    {
        "slug": "parqueo-norte",
        "name": "Parqueo Norte",
        "zone": "SERVICIOS",
        "sport_type": "MULTIUSE",
        "facility_kind": "MULTIUSE",
        "surface": "ASPHALT",
        "capacity": 180,
        "location_label": "Acceso Norte",
        "is_bookable": False,
        "description": (
            "Estacionamiento principal del complejo. Se muestra en el plano para "
            "orientarse; no forma parte del catalogo reservable."
        ),
        "map": (15.5, 0.0, -9.0, 7.0, 5.0),
        "metadata": {"spaces": 180, "accessible_spaces": 8, "covered": False},
        "schedules": [],
        "rate": None,
        "images": [],
    },
    {
        "slug": "vestidores-centrales",
        "name": "Vestidores Centrales",
        "zone": "SERVICIOS",
        "sport_type": "MULTIUSE",
        "facility_kind": "MULTIUSE",
        "surface": "TILE",
        "capacity": 60,
        "location_label": "Nucleo de Servicios",
        "is_bookable": False,
        "description": (
            "Vestidores, duchas y guardarropa compartidos por las canchas. El acceso "
            "va incluido con cualquier reserva deportiva."
        ),
        "map": (-2.0, 0.0, 1.0, 5.0, 3.5),
        "metadata": {"showers": 16, "lockers": 120, "accessible": True},
        "schedules": [],
        "rate": None,
        "images": [],
    },
]
