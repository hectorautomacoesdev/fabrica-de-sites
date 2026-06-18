"""Dependências FastAPI (Depends)."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from ..db.engine import get_session

SessionDep = Annotated[Session, Depends(get_session)]
