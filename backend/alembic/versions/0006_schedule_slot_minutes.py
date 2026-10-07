"""Duracion de prestamo por rango de horario y cierre a medianoche."""

from alembic import op
import sqlalchemy as sa

revision = "0006_schedule_slot_minutes"
down_revision = "0005_user_active_flag"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("facility_schedules", sa.Column("slot_minutes", sa.Integer(), nullable=True))
    op.execute(
        """
        UPDATE facility_schedules AS s
        SET slot_minutes = COALESCE(
            (
                SELECT r.minimum_minutes
                FROM facility_rates AS r
                WHERE r.facility_id = s.facility_id AND r.is_active
                ORDER BY r.valid_from DESC
                LIMIT 1
            ),
            60
        )
        """
    )
    op.alter_column(
        "facility_schedules", "slot_minutes", nullable=False, server_default=sa.text("60")
    )
    op.create_check_constraint(
        "ck_schedule_slot_minutes",
        "facility_schedules",
        "slot_minutes BETWEEN 15 AND 1440 AND slot_minutes % 15 = 0",
    )
    op.drop_constraint("ck_schedule_time_order", "facility_schedules", type_="check")
    op.create_check_constraint(
        "ck_schedule_time_order",
        "facility_schedules",
        "closes_at > opens_at OR closes_at = '00:00'",
    )


def downgrade() -> None:
    op.drop_constraint("ck_schedule_time_order", "facility_schedules", type_="check")
    op.execute("DELETE FROM facility_schedules WHERE closes_at <= opens_at")
    op.create_check_constraint(
        "ck_schedule_time_order", "facility_schedules", "closes_at > opens_at"
    )
    op.drop_constraint("ck_schedule_slot_minutes", "facility_schedules", type_="check")
    op.drop_column("facility_schedules", "slot_minutes")
