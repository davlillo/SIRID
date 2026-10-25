"""Client invitations and optional organization SMTP credentials."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0010_client_invitations_smtp"
down_revision = "0009_reservation_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_smtp",
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("host", sa.String(255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(320), nullable=False),
        sa.Column("encrypted_password", sa.Text(), nullable=False),
        sa.Column("from_email", sa.String(320), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
    )
    op.add_column("users", sa.Column("invitation_token_hash", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("invitation_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint("uq_users_invitation_token_hash", "users", ["invitation_token_hash"])
    op.add_column("notification_logs", sa.Column("client_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_notification_logs_client", "notification_logs", "users", ["client_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_notification_logs_client_id", "notification_logs", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_notification_logs_client_id", table_name="notification_logs")
    op.drop_constraint("fk_notification_logs_client", "notification_logs", type_="foreignkey")
    op.drop_column("notification_logs", "client_id")
    op.drop_constraint("uq_users_invitation_token_hash", "users", type_="unique")
    op.drop_column("users", "invitation_expires_at")
    op.drop_column("users", "invitation_token_hash")
    op.drop_table("organization_smtp")
