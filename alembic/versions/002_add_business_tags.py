"""Adiciona coluna de tags manuais ao modelo Business.

Revision ID: 002
Revises: 001
Create Date: 2026-06-28
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('businesses', sa.Column('tags', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('businesses', 'tags')
