"""initial_schema

Revision ID: 620b7b3bfb9b
Revises:
Create Date: 2026-06-17

Cria as tabelas iniciais do Scout (runs + businesses).
Em bancos já existentes (criados antes do Alembic), rode:
    alembic stamp head
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "620b7b3bfb9b"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("cidade", sa.String(), nullable=False),
        sa.Column("admin_level", sa.Integer(), nullable=False),
        sa.Column("fonte", sa.String(), nullable=False),
        sa.Column("gerado_em", sa.DateTime(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
    )
    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("run_id", sa.Integer(), sa.ForeignKey("runs.id"), nullable=False, index=True),
        sa.Column("osm_type", sa.String(), nullable=True),
        sa.Column("osm_id", sa.Integer(), nullable=True),
        sa.Column("nome", sa.String(), nullable=True),
        sa.Column("setor", sa.String(), nullable=False, server_default="outros"),
        sa.Column("setor_nome", sa.String(), nullable=False, server_default="Outros"),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lon", sa.Float(), nullable=True),
        sa.Column("endereco", sa.String(), nullable=True),
        sa.Column("telefone", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("website", sa.String(), nullable=True),
        sa.Column("website_kind", sa.String(), nullable=False, server_default="nenhum"),
        sa.Column("horario", sa.String(), nullable=True),
        sa.Column("site_status", sa.String(), nullable=False, server_default="DESCONHECIDO"),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_label", sa.String(), nullable=False, server_default="BAIXA"),
        sa.Column("contactavel", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("score_motivos", sa.String(), nullable=False, server_default="[]"),
        sa.Column("raw_tags", sa.String(), nullable=False, server_default="{}"),
    )
    op.create_index("ix_businesses_run_id", "businesses", ["run_id"])


def downgrade() -> None:
    op.drop_index("ix_businesses_run_id", table_name="businesses")
    op.drop_table("businesses")
    op.drop_table("runs")
