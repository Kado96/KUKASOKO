"""initial_migration

Revision ID: 261e7542caed
Revises: 
Create Date: 2026-07-31 16:04:21.782839

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '261e7542caed'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # TEXT() and String() are identical in SQLite - no-op migration
    pass


def downgrade() -> None:
    pass
