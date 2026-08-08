"""add bank_name to transactions

Revision ID: a1b2c3d4e5f6
Revises: b057f52a53b4
Create Date: 2026-07-29 17:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'b057f52a53b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'transactions',
        sa.Column('bank_name', sa.String(100), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('transactions', 'bank_name')
