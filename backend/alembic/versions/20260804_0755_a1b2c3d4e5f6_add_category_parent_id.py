"""add category parent_id for subcategories

Revision ID: a1b2c3d4e5f6
Revises: 261e7542caed
Create Date: 2026-08-04 07:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "261e7542caed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("categories") as batch_op:
        batch_op.add_column(sa.Column("parent_id", sa.Integer(), nullable=True))
        batch_op.create_index("ix_categories_parent_id", ["parent_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_categories_parent_id",
            "categories",
            ["parent_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("categories") as batch_op:
        batch_op.drop_constraint("fk_categories_parent_id", type_="foreignkey")
        batch_op.drop_index("ix_categories_parent_id")
        batch_op.drop_column("parent_id")
