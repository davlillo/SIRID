"""Pagos y anticipos ligados a reservaciones (HU-10)."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0009_reservation_payments"
down_revision = "0008_user_password"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reservation_payments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "reservation_id",
            UUID(as_uuid=True),
            sa.ForeignKey("reservations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "recorded_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="USD", nullable=False),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("amount > 0", name="ck_reservation_payment_amount_positive"),
    )
    op.create_index(
        "ix_reservation_payments_reservation_id",
        "reservation_payments",
        ["reservation_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_reservation_payments_reservation_id", table_name="reservation_payments")
    op.drop_table("reservation_payments")
