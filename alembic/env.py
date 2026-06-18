"""Configuração do Alembic para SQLModel.

A URL do banco é derivada de config.py (mesma usada pela aplicação),
então dev e migrações sempre apontam para o mesmo arquivo SQLite.
"""

import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context

# Adiciona src/ ao sys.path para importar fabrica_sites
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

# Importar models registra os metadados no SQLModel.metadata
from fabrica_sites.db.models import BusinessTable, RunTable  # noqa: F401, E402
from fabrica_sites import config as app_config  # noqa: E402

alembic_config = context.config

if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name)

# Aponta para os metadados das tabelas SQLModel (habilita autogenerate).
target_metadata = SQLModel.metadata

# Sobrescreve a URL do .ini com a URL real da aplicação.
alembic_config.set_main_option(
    "sqlalchemy.url", f"sqlite:///{app_config.DB_PATH}"
)


def run_migrations_offline() -> None:
    url = alembic_config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        alembic_config.get_section(alembic_config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # SQLite não suporta ALTER TABLE — usar batch mode
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
