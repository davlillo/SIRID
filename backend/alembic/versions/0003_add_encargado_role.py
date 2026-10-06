"""Agrega el rol ENCARGADO para administrar instalaciones y tarifas."""

from alembic import op

revision = "0003_add_encargado_role"
down_revision = "0002_zone_and_notification_log"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL no permite usar un valor nuevo del enum antes de confirmar la
    # transaccion que lo agrega. Alembic ejecuta esta migracion antes del seed.
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ENCARGADO'")


def downgrade() -> None:
    # PostgreSQL no permite eliminar un valor de ENUM de forma segura sin
    # reconstruir todas las columnas dependientes.
    pass
