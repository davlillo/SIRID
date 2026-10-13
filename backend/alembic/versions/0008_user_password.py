"""Credencial local opcional para iniciar sesion con usuario o correo."""

from alembic import op
import sqlalchemy as sa

revision = "0008_user_password"
down_revision = "0007_organizations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("password_hash", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "password_hash")
