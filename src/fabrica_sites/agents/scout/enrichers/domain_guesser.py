"""Enriquecedor: detecta sites próprios não cadastrados no OSM.

PROBLEMA QUE RESOLVE
--------------------
O OpenStreetMap tem baixa cobertura de URLs: muitos negócios têm site mas não
o cadastraram na plataforma. Exemplo real dado pelo usuário: o "Hotel Ilhas da
Grécia" em Guarujá tem site em hotelilhasdagrecia.com.br, mas aparece no OSM
como SEM_SITE porque o campo não foi preenchido.

ESTRATÉGIA
----------
Para cada negócio classificado como SEM_SITE com nome disponível:

  1. Gerar candidatos de domínio a partir do nome:
       "Hotel Ilhas da Grécia"
         → hotelilhasdagrecia.com.br  (slug completo)
         → hotel-ilhas-da-grecia.com.br  (com hifens)
         → hotelilhasgrecia.com.br  (sem artigos/preposições)
         → ... (e variantes com .com)

  2. Para cada candidato, fazer um HTTP HEAD (sem baixar o corpo do site)
     com timeout curto (padrão: 3 s). HEAD é ~10x mais rápido que GET.

  3. Se qualquer candidato responder com HTTP < 400: o site existe.
     Atualiza website, website_kind = PROPRIO, recalcula o score.
     (O score cai: o negócio já tem site → não é mais oportunidade primária.
      Mas o dado fica correto e o Auditor poderá avaliar a qualidade.)

  4. Todos os negócios são verificados EM PARALELO via ThreadPoolExecutor,
     com semáforo de concorrência configurável (padrão: 15 threads).

LIMITAÇÕES
----------
- Cobertura parcial: só acha nomes "previsíveis" como slug. Um site em
  "ilhasda grecia-hotel.com.br" não seria detectado.
- Falsos negativos: site fora do ar temporariamente aparece como inexistente.
- Falsos positivos: domínio parked (só página em branco) passaria no teste.
  Filtramos parcialmente: se redirecionar para página genérica de registrar
  domínio, o HEAD ainda responde 200. Isso é raro e aceitável para fase 1.
- Sem cache entre execuções: o mesmo negócio é re-verificado em cada rodada.
"""

from __future__ import annotations

import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx

from .... import config
from ....models import Business, SiteStatus, WebsiteKind
from .. import scorer as scorer_module
from .base import BusinessEnricher

# Palavras que nunca entram em um domínio de empresa no Brasil
_STOP_PT = frozenset(
    "de da do das dos e a o as os em no na nos nas para pro pra com "
    "por um uma uns umas se é ao aos".split()
)

# Nomes que são SOMENTE palavras de categoria genérica — o domínio correspondente
# provavelmente não é o negócio específico (ex.: "pousada.com" é um portal de
# pousadas, não a pousada X em Guarujá).
_CATEGORIAS_GENERICAS = frozenset({
    "pousada", "hotel", "motel", "hostel", "albergue",
    "restaurante", "lanchonete", "cafeteria", "bar", "pub",
    "padaria", "confeitaria", "sorveteria",
    "farmacia", "drogaria", "drogaria",
    "supermercado", "mercadinho", "mercado", "mercearia", "emporio", "quitanda",
    "academia", "salao", "barbearia", "clinica", "dentista",
    "estetica", "spa", "manicure",
    "bicicletaria", "camelodromo", "camelódromo", "lanhouse",
    "shopping", "boutique", "butique",
    "oficina", "mecanico", "borracharia",
    "hortifruti", "acougue",
})

# User-agent para as requisições HTTP do guesser
_UA = config.USER_AGENT


# ---------------------------------------------------------------------------
# Geração de candidatos
# ---------------------------------------------------------------------------

def _ascii_slug(text: str) -> str:
    """Texto → slug ASCII: sem acentos, sem especiais, sem espaços, minúsculas."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9\s]", "", text)
    return re.sub(r"\s+", "", text).lower()


def _slug_hifen(text: str) -> str:
    """Como _ascii_slug mas preserva espaços como hifens."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9\s]", "", text)
    return re.sub(r"\s+", "-", text.strip()).lower()


def _sem_stop(nome: str) -> str:
    """Remove artigos/preposições do nome antes de slugificar."""
    palavras = [p for p in nome.lower().split() if p not in _STOP_PT]
    return " ".join(palavras)


def _palavras_significativas(nome: str) -> list[str]:
    """Palavras do nome que não são artigos/preposições nem triviais."""
    return [p for p in nome.lower().split() if p not in _STOP_PT and len(p) > 2]


def _nome_vale_tentar(nome: str) -> bool:
    """Heurística: este nome é específico o suficiente para tentar domínio?

    Filtra nomes que são apenas palavras de categoria genérica, pois o domínio
    correspondente provavelmente é um portal genérico, não o negócio local.

    Exemplos:
      "Pousada"       → False (slug="pousada" é categoria genérica)
      "Lan House"     → False (slug="lanhouse" é categoria genérica)
      "Pousada Caiçara" → True (2 palavras significativas)
      "McDonald's"    → True (1 palavra, 9 chars, marca única)
      "Hotel Ilhas da Grécia" → True (3 palavras significativas)
    """
    if not nome:
        return False
    slug_completo = _ascii_slug(nome)
    if slug_completo in _CATEGORIAS_GENERICAS:
        return False
    palavras = _palavras_significativas(nome)
    if not palavras:
        return False
    if len(palavras) >= 2:
        return True
    # 1 palavra significativa: só tenta se for longa o suficiente para ser marca
    return len(palavras[0]) >= 8 and palavras[0] not in _CATEGORIAS_GENERICAS


def gerar_candidatos(nome: str) -> list[str]:
    """Gera lista de domínios candidatos para o nome de um negócio.

    Exemplos para "Hotel Ilhas da Grécia":
      - hotelilhasdagrecia.com.br
      - hotel-ilhas-da-grecia.com.br
      - hotelilhasgrecia.com.br   (sem "da")
      - hotelilhasdagrecia.com
    """
    if not nome or not nome.strip():
        return []

    slug_full = _ascii_slug(nome)
    slug_hyp = _slug_hifen(nome)
    slug_clean = _ascii_slug(_sem_stop(nome))

    vistos: set[str] = set()
    candidatos: list[str] = []

    for base in [slug_full, slug_hyp, slug_clean]:
        if not base or base in vistos:
            continue
        vistos.add(base)
        candidatos.append(f"{base}.com.br")
        candidatos.append(f"{base}.com")

    return candidatos[:8]  # teto razoável por negócio


# ---------------------------------------------------------------------------
# Verificação HTTP
# ---------------------------------------------------------------------------

def _checar_dominio(dominio: str, timeout: float) -> bool:
    """HEAD request; True se responder com status < 400."""
    headers = {"User-Agent": _UA}
    for scheme in ("https", "http"):
        try:
            resp = httpx.head(
                f"{scheme}://{dominio}",
                headers=headers,
                follow_redirects=True,
                timeout=timeout,
            )
            if resp.status_code < 400:
                return True
        except Exception:  # noqa: BLE001
            continue
    return False


def _encontrar_site(nome: str, timeout: float) -> str | None:
    """Tenta cada candidato em ordem; retorna a primeira URL que responder."""
    for dominio in gerar_candidatos(nome):
        if _checar_dominio(dominio, timeout):
            return f"https://{dominio}"
    return None


# ---------------------------------------------------------------------------
# Enriquecedor
# ---------------------------------------------------------------------------

def _rescore(b: Business, novo_website: str) -> Business:
    """Cria nova instância de Business com site descoberto e score recalculado."""
    campos = {
        "website_kind": WebsiteKind.PROPRIO,
        "setor": b.setor,
        "telefone": b.telefone,
        "email": b.email,
        "horario": b.horario,
        "endereco": b.endereco,
    }
    nova_aval = scorer_module.score(campos)
    return b.model_copy(update={
        "website": novo_website,
        "website_kind": WebsiteKind.PROPRIO,
        **nova_aval,
    })


class DomainGuesser(BusinessEnricher):
    """Verifica se negócios SEM_SITE têm site via tentativa de domínio.

    Parâmetros
    ----------
    timeout:
        Segundos de espera por domínio candidato (padrão: 3 s).
    workers:
        Threads simultâneas. Com 15 workers e ~300 negócios, o enriquecimento
        leva ~20–60 s dependendo da latência de rede.
    """

    name = "DomainGuesser"

    def __init__(
        self,
        timeout: float | None = None,
        workers: int | None = None,
    ) -> None:
        self.timeout = timeout or config.DOMAIN_GUESS_TIMEOUT
        self.workers = workers or config.DOMAIN_GUESS_WORKERS

    def enrich(
        self,
        businesses: list[Business],
        cidade: str,  # noqa: ARG002
    ) -> list[Business]:
        # Apenas negócios SEM_SITE com nome específico o suficiente.
        # Nomes genéricos ("Pousada", "Bar") são excluídos para evitar falsos
        # positivos — o domínio genérico existe mas não é o negócio local.
        alvos: dict[int, Business] = {
            i: b
            for i, b in enumerate(businesses)
            if b.site_status is SiteStatus.SEM_SITE
            and b.nome
            and _nome_vale_tentar(b.nome)
        }

        if not alvos:
            return businesses

        encontrados: dict[int, str] = {}

        with ThreadPoolExecutor(max_workers=self.workers) as pool:
            futures = {
                pool.submit(_encontrar_site, b.nome, self.timeout): i
                for i, b in alvos.items()
            }
            for future in as_completed(futures):
                idx = futures[future]
                resultado = future.result()
                if resultado:
                    encontrados[idx] = resultado

        if not encontrados:
            return businesses

        result = list(businesses)
        for idx, url in encontrados.items():
            result[idx] = _rescore(result[idx], url)

        return result

    @property
    def stats(self) -> dict:
        """Para logging: metadados do enriquecedor."""
        return {"timeout": self.timeout, "workers": self.workers}
