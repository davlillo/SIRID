"""Create the initial DAVLILLOS reservation schema."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    # Los tipos se crean una sola vez, aqui. Las referencias de columna usan
    # `create_type=False` para que `create_table` no intente recrearlos.
    postgresql.ENUM("CLIENT", "ADMIN", name="user_role").create(
        op.get_bind(), checkfirst=True
    )
    postgresql.ENUM(
        "PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", name="reservation_status"
    ).create(op.get_bind(), checkfirst=True)
    postgresql.ENUM(
        "CREATED", "CONFIRMED", "CANCELLED", "COMPLETED", name="reservation_event_type"
    ).create(op.get_bind(), checkfirst=True)

    user_role = postgresql.ENUM(name="user_role", create_type=False)
    reservation_status = postgresql.ENUM(name="reservation_status", create_type=False)
    event_type = postgresql.ENUM(name="reservation_event_type", create_type=False)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("google_subject", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("avatar_url", sa.String(2048)),
        sa.Column("role", user_role, nullable=False, server_default="CLIENT"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("google_subject"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "facilities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("sport_type", sa.String(80), nullable=False),
        sa.Column("facility_kind", sa.String(40), nullable=False),
        sa.Column("surface", sa.String(80)),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("location_label", sa.String(160), nullable=False),
        sa.Column("is_bookable", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("map_x", sa.Numeric(8, 2)),
        sa.Column("map_y", sa.Numeric(8, 2)),
        sa.Column("map_z", sa.Numeric(8, 2)),
        sa.Column("map_width", sa.Numeric(8, 2)),
        sa.Column("map_depth", sa.Numeric(8, 2)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "facility_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("facility_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("alt_text", sa.String(255), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["facility_id"], ["facilities.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "facility_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("facility_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weekday", sa.SmallInteger(), nullable=False),
        sa.Column("opens_at", sa.Time(), nullable=False),
        sa.Column("closes_at", sa.Time(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["facility_id"], ["facilities.id"], ondelete="CASCADE"),
        sa.CheckConstraint("weekday BETWEEN 0 AND 6", name="ck_schedule_weekday"),
        sa.CheckConstraint("closes_at > opens_at", name="ck_schedule_time_order"),
    )
    op.create_table(
        "facility_rates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("facility_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("minimum_minutes", sa.Integer(), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["facility_id"], ["facilities.id"], ondelete="CASCADE"),
        sa.CheckConstraint("amount >= 0", name="ck_rate_amount_non_negative"),
        sa.CheckConstraint("minimum_minutes > 0", name="ck_rate_minimum_positive"),
    )
    op.create_table(
        "reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("facility_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", reservation_status, nullable=False, server_default="PENDING"),
        sa.Column("quoted_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("customer_note", sa.String(1000)),
        sa.Column("admin_note", sa.String(1000)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["facility_id"], ["facilities.id"]),
        sa.CheckConstraint("ends_at > starts_at", name="ck_reservation_time_order"),
        sa.CheckConstraint("quoted_amount >= 0", name="ck_reservation_amount_non_negative"),
    )
    op.execute(
        """ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
        EXCLUDE USING gist (
          facility_id WITH =,
          tstzrange(starts_at, ends_at, '[)') WITH &&
        ) WHERE (status IN ('PENDING', 'CONFIRMED'))"""
    )
    op.create_table(
        "reservation_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reservation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("event_type", event_type, nullable=False),
        sa.Column("from_status", reservation_status),
        sa.Column("to_status", reservation_status),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["reservation_id"], ["reservations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_reservations_customer_created", "reservations", ["customer_id", "created_at"])
    op.create_index("ix_reservations_facility_start", "reservations", ["facility_id", "starts_at"])
    op.create_index("ix_reservations_status_start", "reservations", ["status", "starts_at"])
    op.create_index("ix_reservation_events_reservation_created", "reservation_events", ["reservation_id", "created_at"])


def downgrade() -> None:
    op.drop_table("reservation_events")
    op.drop_table("reservations")
    op.drop_table("facility_rates")
    op.drop_table("facility_schedules")
    op.drop_table("facility_images")
    op.drop_table("facilities")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS reservation_event_type")
    op.execute("DROP TYPE IF EXISTS reservation_status")
    op.execute("DROP TYPE IF EXISTS user_role")
