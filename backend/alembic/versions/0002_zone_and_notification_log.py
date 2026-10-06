"""Agrega la zona del complejo y el registro de notificaciones.

La zona agrupa el catalogo (spect/15-especificacion-del-complejo.md) sin
reemplazar `facility_id`. El log de notificaciones hace observable un fallo SMTP
sin revertir la reserva.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_zone_and_notification_log"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    postgresql.ENUM(
        "ESTADIO", "FUTBOL", "ACUATICA", "CANCHAS", "EVENTOS", "SERVICIOS", name="facility_zone"
    ).create(op.get_bind(), checkfirst=True)

    op.add_column(
        "facilities",
        sa.Column(
            "zone",
            postgresql.ENUM(name="facility_zone", create_type=False),
            nullable=False,
            server_default="CANCHAS",
        ),
    )
    op.create_index("ix_facilities_zone", "facilities", ["zone"])

    op.create_table(
        "notification_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reservation_id", postgresql.UUID(as_uuid=True)),
        sa.Column("recipient", sa.String(320), nullable=False),
        sa.Column("template", sa.String(80), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("error_detail", sa.String(1000)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["reservation_id"], ["reservations.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "status IN ('SENT', 'FAILED', 'SKIPPED')", name="ck_notification_status"
        ),
    )
    op.create_index(
        "ix_notification_logs_reservation_created",
        "notification_logs",
        ["reservation_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notification_logs_reservation_created", table_name="notification_logs")
    op.drop_table("notification_logs")
    op.drop_index("ix_facilities_zone", table_name="facilities")
    op.drop_column("facilities", "zone")
    op.execute("DROP TYPE IF EXISTS facility_zone")
