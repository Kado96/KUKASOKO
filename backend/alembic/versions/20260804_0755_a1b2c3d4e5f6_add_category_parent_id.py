"""add category parent_id for subcategories

Revision ID: a1b2c3d4e5f6
Revises: 261e7542caed
Create Date: 2026-08-04 07:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "261e7542caed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    """Vérifie si une colonne existe déjà dans la table (compatible SQLite + PostgreSQL)."""
    bind = op.get_bind()
    insp = sa_inspect(bind)
    return any(c["name"] == column for c in insp.get_columns(table))


def _index_exists(table: str, index_name: str) -> bool:
    """Vérifie si un index existe déjà."""
    bind = op.get_bind()
    insp = sa_inspect(bind)
    return any(idx["name"] == index_name for idx in insp.get_indexes(table))


def upgrade() -> None:
    # Vérifie si parent_id existe déjà (cas d'une BD déjà migrée manuellement)
    if _column_exists("categories", "parent_id"):
        return  # Rien à faire, la colonne est déjà là

    with op.batch_alter_table("categories") as batch_op:
        batch_op.add_column(sa.Column("parent_id", sa.Integer(), nullable=True))
        if not _index_exists("categories", "ix_categories_parent_id"):
            batch_op.create_index("ix_categories_parent_id", ["parent_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_categories_parent_id",
            "categories",
            ["parent_id"],
            ["id"],
        )


def downgrade() -> None:
    if not _column_exists("categories", "parent_id"):
        return  # Rien à défaire

    with op.batch_alter_table("categories") as batch_op:
        batch_op.drop_constraint("fk_categories_parent_id", type_="foreignkey")
        if _index_exists("categories", "ix_categories_parent_id"):
            batch_op.drop_index("ix_categories_parent_id")
        batch_op.drop_column("parent_id")
