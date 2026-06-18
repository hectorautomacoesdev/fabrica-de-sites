"""Configurações centrais do projeto.

Tudo que é "ajustável" (cidade-alvo, pesos do score, endpoints) mora aqui,
para não ficar espalhado pelo código. Chaves de API são lidas do ambiente
(.env) e são TODAS opcionais na Fase 1.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Carrega .env da raiz do projeto (se existir) — não sobrescreve vars já definidas.
load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)

# --- Caminhos ---------------------------------------------------------------
# config.py está em src/fabrica_sites/ → a raiz do projeto é 2 níveis acima.
BASE_DIR: Path = Path(__file__).resolve().parents[2]
DATA_DIR: Path = BASE_DIR / "data"
DB_PATH: Path = DATA_DIR / "fabrica.db"
DEFAULT_REPORT_PATH: Path = DATA_DIR / "relatorio_scout.html"


def ensure_dirs() -> None:
    """Garante que a pasta de dados exista antes de gravar."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


# --- Cidade-alvo padrão -----------------------------------------------------
# No Brasil, o município corresponde a admin_level=8 no OpenStreetMap.
DEFAULT_CITY: str = os.getenv("CIDADE_ALVO", "Guarujá")
DEFAULT_ADMIN_LEVEL: int = 8

# Bounding box de fallback para Guarujá (sul, oeste, norte, leste).
# Usado só se a busca por nome de área falhar.
GUARUJA_BBOX: tuple[float, float, float, float] = (-24.10, -46.35, -23.88, -46.05)

# --- Overpass API (OpenStreetMap) -------------------------------------------
# Vários espelhos: tentamos em ordem se um estiver fora/lento.
OVERPASS_ENDPOINTS: list[str] = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
HTTP_TIMEOUT: float = 90.0
USER_AGENT: str = "FabricaSites/0.1 (prospeccao de negocios locais; contato via projeto)"

# --- Pesos do score de oportunidade (0–100) --------------------------------
# Documentado em docs/DECISOES.md. Soma de componentes, limitada a 100.
SCORE_WEIGHTS: dict[str, int] = {
    "base_sem_site": 60,        # não tem nenhum site
    "base_so_rede_social": 70,  # só tem Facebook/Instagram → melhor lead
    "base_com_site": 25,        # já tem site próprio → Auditor decide depois
    "tem_telefone": 20,         # dá para contatar
    "tem_horario": 5,           # sinal de negócio estabelecido
    "tem_endereco": 5,          # idem
    "setor_prioritario": 10,    # setor no foco inicial
}

# Faixas de rótulo a partir do score final.
SCORE_FAIXAS: list[tuple[int, str]] = [
    (80, "ALTÍSSIMA"),
    (65, "ALTA"),
    (45, "MÉDIA"),
    (0, "BAIXA"),
]

# --- DomainGuesser ----------------------------------------------------------
# Verificação de sites próprios não cadastrados (HTTP HEAD por nome de domínio).
# Timeout curto para não travar o pipeline; workers = threads paralelas.
DOMAIN_GUESS_TIMEOUT: float = float(os.getenv("DOMAIN_GUESS_TIMEOUT", "3.0"))
DOMAIN_GUESS_WORKERS: int = int(os.getenv("DOMAIN_GUESS_WORKERS", "15"))

# --- Chaves de API (todas opcionais na Fase 1) ------------------------------
SERPER_API_KEY: str | None = os.getenv("SERPER_API_KEY") or None
GOOGLE_MAPS_API_KEY: str | None = os.getenv("GOOGLE_MAPS_API_KEY") or None
GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY") or None
ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY") or None
