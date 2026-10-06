"""Permite dar de baja usuarios sin perder su informacion (RF-02)."""

from alembic import op
import sqlalchemy as sa

revision = "0005_user_active_flag"
down_revision = "0004_client_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("users", "is_active")
