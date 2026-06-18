"""Extração e classificação de um lugar bruto do OSM.

Tira de um amontoado de tags as informações que importam (nome, contato,
endereço) e — o ponto mais valioso — descobre que TIPO de presença web o
negócio tem: nenhuma, só rede social, ou site próprio.

Detectar "só rede social" é importante para o nosso mercado: muitos negócios
informais têm só um Instagram/Facebook. Esses são os melhores leads — já
entenderam que precisam estar online, mas não têm um site de verdade.
"""

from __future__ import annotations
from urllib.parse import urlparse

from ...core.sectors import classify_sector
from ...models import RawPlace, WebsiteKind

# Domínios que NÃO são site próprio — são redes sociais ou agregadores.
_SOCIAL_DOMAINS = (
    "facebook.com", "fb.com", "instagram.com", "linktr.ee", "linktree",
    "wa.me", "whatsapp.com", "api.whatsapp.com", "t.me", "telegram",
    "tiktok.com", "twitter.com", "x.com", "bit.ly", "linkedin.com",
    "youtube.com", "ifood.com", "linkbio", "beacons.ai",
)

# Tags que podem conter um endereço de site.
_WEBSITE_TAGS = ("website", "contact:website", "url", "website:official")
# Tags de presença social (quando não há website real).
_SOCIAL_TAGS = (
    "contact:facebook", "facebook", "contact:instagram", "instagram",
    "contact:tiktok", "contact:whatsapp",
)
_PHONE_TAGS = ("contact:phone", "phone", "contact:mobile", "phone:mobile")
_EMAIL_TAGS = ("email", "contact:email")


def _first(tags: dict[str, str], chaves: tuple[str, ...]) -> str | None:
    for k in chaves:
        v = tags.get(k)
        if v:
            return v.strip()
    return None


def _is_social(url: str) -> bool:
    """True se a URL pertencer a uma rede social / agregador (não é site próprio).

    Usa netloc (host) em vez de simples substring para evitar falsos positivos:
    ex. "salaox.com.br" contém "x.com" como substring, mas NÃO é o Twitter/X.
    Fallback para substring em URLs malformadas (sem scheme).
    """
    try:
        netloc = urlparse(url).netloc.lower()
        if not netloc:
            raise ValueError("sem netloc")
        host = netloc.removeprefix("www.")
        return any(host == dom or host.endswith("." + dom) for dom in _SOCIAL_DOMAINS)
    except Exception:  # noqa: BLE001
        u = url.lower()
        return any(dom in u for dom in _SOCIAL_DOMAINS)


def detect_website(tags: dict[str, str]) -> tuple[str | None, WebsiteKind]:
    """Retorna (url_representativa, tipo_de_presenca_web)."""
    site = _first(tags, _WEBSITE_TAGS)
    if site:
        if _is_social(site):
            return site, WebsiteKind.REDE_SOCIAL
        return site, WebsiteKind.PROPRIO

    # Sem campo de website: há ao menos um handle social?
    social = _first(tags, _SOCIAL_TAGS)
    if social:
        return social, WebsiteKind.REDE_SOCIAL

    return None, WebsiteKind.NENHUM


def _address(tags: dict[str, str]) -> str | None:
    rua = tags.get("addr:street")
    num = tags.get("addr:housenumber")
    bairro = tags.get("addr:suburb") or tags.get("addr:neighbourhood")
    partes: list[str] = []
    if rua:
        partes.append(f"{rua}, {num}" if num else rua)
    if bairro:
        partes.append(bairro)
    return " - ".join(partes) if partes else None


def extract(raw: RawPlace) -> dict:
    """Transforma um RawPlace nos campos prontos de um negócio (sem score)."""
    tags = raw.tags
    setor = classify_sector(tags)
    website, kind = detect_website(tags)
    return {
        "osm_type": raw.osm_type,
        "osm_id": raw.osm_id,
        "nome": _first(tags, ("name", "brand", "operator")),
        "setor": setor.key,
        "setor_nome": setor.nome,
        "lat": raw.lat,
        "lon": raw.lon,
        "endereco": _address(tags),
        "telefone": _first(tags, _PHONE_TAGS),
        "email": _first(tags, _EMAIL_TAGS),
        "website": website,
        "website_kind": kind,
        "horario": tags.get("opening_hours"),
        "raw_tags": tags,
    }
