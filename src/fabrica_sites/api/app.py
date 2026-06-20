"""Aplicação FastAPI — ponto de entrada da API REST.

Para rodar localmente:
    uvicorn fabrica_sites.api.app:app --reload --port 8001

Swagger disponível em: http://localhost:8001/docs
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import misc, runs, scout

app = FastAPI(
    title="Fábrica de Sites — API",
    description=(
        "API REST do sistema multiagente. "
        "Fase 1: Agente Scout — prospecta negócios locais sem site."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — permite o frontend Vite (localhost:5173) chamar a API em dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],  # frontend precisa ler o total p/ paginação
)

app.include_router(misc.router)
app.include_router(scout.router)
app.include_router(runs.router)
