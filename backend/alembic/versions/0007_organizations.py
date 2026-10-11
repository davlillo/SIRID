"""Agregar organizaciones y ownership tenant de usuarios, instalaciones y reservas."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007_organizations"
down_revision = "0006_schedule_slot_minutes"
branch_labels = None
depends_on = None

BOOTSTRAP_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("email_domain", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("slug", name="uq_organizations_slug"),
        sa.UniqueConstraint("email_domain", name="uq_organizations_email_domain"),
    )
    op.execute(
        """INSERT INTO organizations (id, slug, name, email_domain, is_active)
           VALUES ('00000000-0000-0000-0000-000000000001', 'organizacion-inicial',
                   'Organización inicial', NULL, FALSE)"""
    )

    for table in ("users", "facilities", "reservations"):
        op.add_column(
            table,
            sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.execute(
            f"UPDATE {table} SET organization_id = '{BOOTSTRAP_ORGANIZATION_ID}'"
        )
        op.alter_column(table, "organization_id", nullable=False)
        op.create_foreign_key(
            f"fk_{table}_organization_id",
            table,
            "organizations",
            ["organization_id"],
            ["id"],
        )
        op.create_index(f"ix_{table}_organization_id", table, ["organization_id"])

    op.create_unique_constraint(
        "uq_users_id_organization", "users", ["id", "organization_id"]
    )
    op.drop_constraint("facilities_slug_key", "facilities", type_="unique")
    op.create_unique_constraint(
        "uq_facilities_id_organization", "facilities", ["id", "organization_id"]
    )
    op.create_unique_constraint(
        "uq_facilities_organization_slug", "facilities", ["organization_id", "slug"]
    )

    # Keep the composite constraints as the ownership guarantee, rather than
    # relying on application checks between the user, facility, and reservation.
    op.drop_constraint(
        "reservations_customer_id_fkey", "reservations", type_="foreignkey"
    )
    op.drop_constraint(
        "reservations_facility_id_fkey", "reservations", type_="foreignkey"
    )
    op.create_foreign_key(
        "fk_reservations_customer_organization",
        "reservations",
        "users",
        ["customer_id", "organization_id"],
        ["id", "organization_id"],
    )
    op.create_foreign_key(
        "fk_reservations_facility_organization",
        "reservations",
        "facilities",
        ["facility_id", "organization_id"],
        ["id", "organization_id"],
    )
    op.create_index(
        "ix_reservations_organization_start",
        "reservations",
        ["organization_id", "starts_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_reservations_organization_start", table_name="reservations")
    op.drop_constraint(
        "fk_reservations_facility_organization", "reservations", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_reservations_customer_organization", "reservations", type_="foreignkey"
    )
    op.create_foreign_key(
        "reservations_customer_id_fkey",
        "reservations",
        "users",
        ["customer_id"],
        ["id"],
    )
    op.create_foreign_key(
        "reservations_facility_id_fkey",
        "reservations",
        "facilities",
        ["facility_id"],
        ["id"],
    )
    op.drop_constraint("uq_facilities_organization_slug", "facilities", type_="unique")
    op.create_unique_constraint("facilities_slug_key", "facilities", ["slug"])
    op.drop_constraint("uq_facilities_id_organization", "facilities", type_="unique")
    op.drop_constraint("uq_users_id_organization", "users", type_="unique")

    for table in ("reservations", "facilities", "users"):
        op.drop_index(f"ix_{table}_organization_id", table_name=table)
        op.drop_constraint(f"fk_{table}_organization_id", table, type_="foreignkey")
        op.drop_column(table, "organization_id")

    op.drop_table("organizations")
