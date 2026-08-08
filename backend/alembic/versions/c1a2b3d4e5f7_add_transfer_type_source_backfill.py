"""add_transfer_type_source_and_backfill

Revision ID: c1a2b3d4e5f7
Revises: 3709cda12d1e
Create Date: 2026-07-30

Safely adds source, transfer_type, is_transfer columns with nullable defaults,
then backfills existing rows to safe values so analytics never see nulls.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1a2b3d4e5f7'
down_revision: Union[str, None] = '3709cda12d1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Check which columns already exist ─────────────────────────────────
    inspector = sa.inspect(conn)
    existing = {c["name"] for c in inspector.get_columns("transactions")}

    # ── 2. Add source column if missing (nullable so existing rows don't fail) ─
    if "source" not in existing:
        op.add_column(
            "transactions",
            sa.Column("source", sa.String(length=20), nullable=True),
        )

    # ── 3. Add transfer_type column if missing ────────────────────────────────
    if "transfer_type" not in existing:
        op.add_column(
            "transactions",
            sa.Column("transfer_type", sa.String(length=30), nullable=True),
        )

    # ── 4. Add is_transfer boolean column if missing ──────────────────────────
    if "is_transfer" not in existing:
        op.add_column(
            "transactions",
            sa.Column("is_transfer", sa.Boolean(), nullable=True),
        )

    # ── 5. Backfill existing rows with safe defaults ──────────────────────────
    #    source = "STATEMENT"   (all existing rows came from PDF uploads)
    #    transfer_type = "none" (treat as regular transactions until re-classified)
    #    is_transfer = False
    op.execute(
        "UPDATE transactions SET source = 'STATEMENT' WHERE source IS NULL"
    )
    op.execute(
        "UPDATE transactions SET transfer_type = 'none' WHERE transfer_type IS NULL"
    )
    op.execute(
        "UPDATE transactions SET is_transfer = FALSE WHERE is_transfer IS NULL"
    )


def downgrade() -> None:
    # Remove only the columns added by this migration
    # (source/is_transfer may have been added by prior migration; leave them)
    inspector = sa.inspect(op.get_bind())
    existing = {c["name"] for c in inspector.get_columns("transactions")}

    if "transfer_type" in existing:
        op.drop_column("transactions", "transfer_type")
