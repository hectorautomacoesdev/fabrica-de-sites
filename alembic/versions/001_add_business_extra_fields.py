"""Adiciona campos extras ao modelo Business.

Novos campos:
- telefone2, email2 — segundo telefone/e-mail para contato
- instagram, facebook, linkedin — redes sociais (separadas do website)
- resumo_manual — resumo editável pelo usuário (sobrescreve o auto-gerado)
- notas — anotações em JSON array [{id, texto, criado_em}]

Revision ID: 001
Revises: (initial)
Create Date: 2026-06-28
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = '001'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('businesses', sa.Column('telefone2', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('email2', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('instagram', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('facebook', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('linkedin', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('resumo_manual', sa.Text(), nullable=True))
    op.add_column('businesses', sa.Column('notas', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('businesses', 'notas')
    op.drop_column('businesses', 'resumo_manual')
    op.drop_column('businesses', 'linkedin')
    op.drop_column('businesses', 'facebook')
    op.drop_column('businesses', 'instagram')
    op.drop_column('businesses', 'email2')
    op.drop_column('businesses', 'telefone2')
