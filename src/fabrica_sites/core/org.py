"""Classificação do tipo de organização de um negócio.

Responde: este lugar é um negócio independente, um órgão público ou uma rede/franquia?
O tipo determina se o negócio é um lead válido para a Fábrica de Sites — órgãos públicos
e redes/franquias já têm sites corporativos e não são nosso mercado.

Fontes primárias (OSM tags):
- ``brand:wikidata``          → presença = rede/franquia global
- ``operator:type``           → "government" / "public" = órgão público
- ``government=*``            → qualquer valor = órgão público
- ``name`` / ``operator``     → regex de termos conhecidos como fallback

Os sinais OSM são os mais confiáveis; o regex é last-resort para casos não marcados.
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Tags OSM que indicam órgão público
# ---------------------------------------------------------------------------
_OP_TYPE_PUBLICO = {"government", "public", "municipal", "state", "federal", "ngo"}

# Amenidades que são estruturalmente públicas, independente de tags de operador
_AMENITY_PUBLICO = {
    "police", "fire_station", "townhall", "courthouse", "prison",
    "post_office", "embassy", "ranger_station", "register_office",
}

# Palavras-chave em name/operator que indicam entidade pública (lower-case)
_KW_PUBLICO = re.compile(
    r"\b("
    r"prefeitura|secretaria|minist[eé]rio|governo|"
    r"upa\b|upas\b|ubs\b|ups\b|"
    r"cras\b|creas\b|inss\b|detran\b|poupatempo|"
    r"denatran|receita federal|tce\b|mp\b|tribunal|"
    r"hospital municipal|hospital estadual|hospital p[uú]blico|"
    r"posto de sa[uú]de|unidade b[aá]sica|centro de sa[uú]de|"
    r"creche municipal|escola municipal|escola estadual|"
    r"câmara|senado|assembl[eé]ia"
    r")",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Tags OSM que indicam rede/franquia
# ---------------------------------------------------------------------------
# brand:wikidata é o indicador canônico do OSM para marcas globais/nacionais
_CHAIN_NAME_RE = re.compile(
    r"\b("
    r"mcdonald.?s?|burger king|bob.?s\b|subway|kfc|pizza hut|domino.?s|"
    r"drogasil|droga raia|ultrafarma|pague menos|panvel|"
    r"casas bahia|magazine luiza|ponto frio|americanas|extra\b|"
    r"carrefour|assai|atacad[aã]o|havan|"
    r"centauro|decathlon|netshoes|"
    r"c&a\b|renner|riachuelo|marisa\b|"
    r"o botic[aá]rio|nat[uú]ra\b|avon\b|o\.b\.|"
    r"nubank|bradesco|ita[uú]|santander|caixa econ[oô]mica|banco do brasil|"
    r"lojas cem|leroy merlin|leroy\b|telhanorte|c\&c\b|"
    r"petz\b|cobasi\b|"
    r"starbucks|outback|ragazzo|gi[oó]ia\b"
    r")",
    re.IGNORECASE,
)


def classify_org(tags: dict[str, str]) -> str:
    """Retorna ``'publico'``, ``'rede'`` ou ``'independente'``."""

    # --- 1. Órgão público via tags estruturais --------------------------------
    if tags.get("operator:type", "").lower() in _OP_TYPE_PUBLICO:
        return "publico"
    if tags.get("government"):
        return "publico"
    if tags.get("amenity") in _AMENITY_PUBLICO:
        return "publico"

    # Saúde pública explicitamente marcada
    if tags.get("healthcare:speciality") or tags.get("health_facility:type"):
        op_type = tags.get("operator:type", "").lower()
        if op_type in _OP_TYPE_PUBLICO:
            return "publico"

    # --- 2. Órgão público via nome/operador (regex fallback) -----------------
    name_blob = " ".join(filter(None, [tags.get("name"), tags.get("operator")]))
    if name_blob and _KW_PUBLICO.search(name_blob):
        return "publico"

    # --- 3. Rede/franquia via wikidata (sinal canônico) ----------------------
    if tags.get("brand:wikidata"):
        return "rede"

    # --- 4. Rede/franquia via nome conhecido (regex fallback) ----------------
    brand_blob = " ".join(filter(None, [tags.get("name"), tags.get("brand")]))
    if brand_blob and _CHAIN_NAME_RE.search(brand_blob):
        return "rede"

    return "independente"
