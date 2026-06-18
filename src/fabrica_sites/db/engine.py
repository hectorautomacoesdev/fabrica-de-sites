"""Engine SQLite e fábrica de sessões.

Em desenvolvimento, `create_all` garante que as tabelas existam sem precisar
rodar `alembic upgrade head` manualmente. Para ambientes de produção ou CI,
use `alembic upgrade head` antes de subir a aplicação.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from .. import config

# Importar os models para registrar os metadados no SQLModel.metadata
from .models import BusinessTable, RunTable  # noqa: F401

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        config.ensure_dirs()
        _engine = create_engine(
            f"sqlite:///{config.DB_PATH}",
            connect_args={"check_same_thread": False},
        )
        # Habilita FK constraints no SQLite (desabilitado por padrão).
        @event.listens_for(_engine, "connect")
        def _set_sqlite_pragma(dbapi_conn, _connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        # Cria as tabelas se ainda não existirem (idempotente).
        SQLModel.metadata.create_all(_engine, checkfirst=True)
    return _engine


def get_session() -> Generator[Session, None, None]:
    """FastAPI Depends — yield de uma sessão por request."""
    with Session(get_engine()) as session:
        yield session
