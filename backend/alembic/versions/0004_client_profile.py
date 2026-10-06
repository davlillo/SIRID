"""Agrega los datos requeridos para registrar clientes."""

from alembic import op
import sqlalchemy as sa

revision = "0004_client_profile"
down_revision = "0003_add_encargado_role"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(80), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(80), nullable=True))
    op.add_column("users", sa.Column("dui", sa.String(10), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(24), nullable=True))
    op.create_index("uq_users_dui", "users", ["dui"], unique=True)


def downgrade() -> None:
    op.drop_index("uq_users_dui", table_name="users")
    op.drop_column("users", "phone")
    op.drop_column("users", "dui")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
