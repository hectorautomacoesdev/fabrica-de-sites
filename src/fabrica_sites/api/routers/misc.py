"""Endpoints utilitários — healthcheck e setores."""

from __future__ import annotations

from fastapi import APIRouter

from ...core.sectors import all_sectors

router = APIRouter(tags=["Misc"])


@router.get("/healthz")
def health() -> dict:
    """Verifica que a API está no ar."""
    return {"status": "ok"}


@router.get("/api/sectors")
def list_sectors() -> list[dict]:
    """Lista a taxonomia de setores usada pelo Scout."""
    return [
        {"key": s.key, "nome": s.nome, "emoji": s.emoji, "prioritario": s.prioritario}
        for s in all_sectors()
    ]
