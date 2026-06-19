"""add_org_tipo

Revision ID: a1b2c3d4e5f6
Revises: 620b7b3bfb9b
Create Date: 2026-06-19

Adiciona coluna org_tipo à tabela businesses.
Valores possíveis: independente | publico | rede
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "620b7b3bfb9b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column(
            "org_tipo",
            sa.String(),
            nullable=False,
            server_default="independente",
        ),
    )


def downgrade() -> None:
    op.drop_column("businesses", "org_tipo")
