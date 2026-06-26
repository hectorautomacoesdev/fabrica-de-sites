"""Resumo determinístico de um negócio — explica em 1–2 frases o que é e por
que é (ou não) um lead.

Sem custo e sem rede: monta o texto a partir do que o Scout já coletou
(setor, tags do OSM, situação de site, contatos, score). É o "determinístico
primeiro" do projeto — um futuro enricher (meta-description do site, Google
Places `editorial_summary`) pode SUBSTITUIR ou COMPLEMENTAR este texto sem
mexer em quem consome o campo ``resumo``.
"""

from __future__ import annotations

from ...models import Business, OrgTipo, SiteStatus, WebsiteKind
from .insighter import LEAD_QUENTE

# Tag OSM (chave, valor) → substantivo legível em PT-BR. Cobre os valores mais
# comuns dos setores do Scout; o que não estiver aqui cai no nome do setor.
_TIPOS: dict[tuple[str, str], str] = {
    # Alimentação
    ("amenity", "restaurant"): "Restaurante",
    ("amenity", "cafe"): "Cafeteria",
    ("amenity", "fast_food"): "Lanchonete",
    ("amenity", "bar"): "Bar",
    ("amenity", "pub"): "Pub",
    ("amenity", "ice_cream"): "Sorveteria",
    ("shop", "bakery"): "Padaria",
    ("shop", "confectionery"): "Confeitaria",
    ("shop", "pastry"): "Confeitaria",
    ("shop", "butcher"): "Açougue",
    ("shop", "greengrocer"): "Hortifrúti",
    ("shop", "seafood"): "Peixaria",
    ("shop", "deli"): "Empório",
    ("shop", "coffee"): "Loja de cafés",
    # Beleza & estética
    ("shop", "hairdresser"): "Salão de beleza",
    ("shop", "beauty"): "Salão de estética",
    ("shop", "cosmetics"): "Loja de cosméticos",
    ("shop", "perfumery"): "Perfumaria",
    ("shop", "nail_salon"): "Estúdio de unhas",
    ("shop", "tattoo"): "Estúdio de tatuagem",
    ("shop", "massage"): "Casa de massagem",
    # Saúde
    ("amenity", "clinic"): "Clínica",
    ("amenity", "doctors"): "Consultório médico",
    ("amenity", "dentist"): "Dentista",
    ("amenity", "veterinary"): "Clínica veterinária",
    ("amenity", "pharmacy"): "Farmácia",
    ("shop", "optician"): "Ótica",
    # Turismo & hospedagem
    ("tourism", "hotel"): "Hotel",
    ("tourism", "guest_house"): "Pousada",
    ("tourism", "hostel"): "Hostel",
    ("tourism", "motel"): "Motel",
    ("tourism", "apartment"): "Flat / apart",
    ("tourism", "chalet"): "Chalé",
    ("tourism", "resort"): "Resort",
    # Fitness
    ("leisure", "fitness_centre"): "Academia",
    ("leisure", "sports_centre"): "Centro esportivo",
    ("leisure", "dance"): "Escola de dança",
    ("shop", "sports"): "Loja de esportes",
    # Automotivo
    ("shop", "car"): "Loja de veículos",
    ("shop", "car_repair"): "Oficina mecânica",
    ("shop", "car_parts"): "Autopeças",
    ("shop", "tyres"): "Borracharia",
    ("shop", "motorcycle"): "Loja de motos",
    ("amenity", "car_wash"): "Lava-rápido",
    ("amenity", "car_rental"): "Locadora de veículos",
    # Serviços & educação & escritórios
    ("shop", "laundry"): "Lavanderia",
    ("shop", "dry_cleaning"): "Lavanderia",
    ("shop", "travel_agency"): "Agência de viagens",
    ("amenity", "language_school"): "Escola de idiomas",
    ("amenity", "driving_school"): "Autoescola",
    ("amenity", "music_school"): "Escola de música",
    ("office", "*"): "Escritório",
    # Comércio genérico
    ("shop", "clothes"): "Loja de roupas",
    ("shop", "shoes"): "Loja de calçados",
    ("shop", "supermarket"): "Supermercado",
    ("shop", "convenience"): "Mercearia",
    ("shop", "florist"): "Floricultura",
    ("shop", "jewelry"): "Joalheria",
    ("shop", "books"): "Livraria",
    ("shop", "pet"): "Pet shop",
}


def _tipo_legivel(b: Business) -> str:
    """Substantivo específico do negócio (ex.: "Padaria"), via tags do OSM.

    Cai no nome do setor quando a tag não está no mapa.
    """
    tags = b.raw_tags or {}
    for chave in ("amenity", "shop", "tourism", "leisure", "craft", "office", "healthcare"):
        valor = tags.get(chave)
        if valor is None:
            continue
        especifico = _TIPOS.get((chave, valor)) or _TIPOS.get((chave, "*"))
        if especifico:
            return especifico
    return b.setor_nome


def _situacao_site(b: Business) -> str:
    if b.site_status is SiteStatus.SEM_SITE:
        return "sem site nem rede social detectada"
    if b.site_status is SiteStatus.SO_REDE_SOCIAL:
        return "só com rede social, sem site próprio"
    if b.site_status is SiteStatus.COM_SITE:
        return "já com site próprio"
    return "com presença web indefinida"


def _canais_contato(b: Business) -> list[str]:
    canais: list[str] = []
    if b.telefone:
        canais.append("telefone")
    if b.email:
        canais.append("e-mail")
    if b.website_kind is WebsiteKind.REDE_SOCIAL and b.website:
        canais.append("rede social")
    return canais


def gerar_resumo(b: Business) -> str:
    """Monta um resumo curto e acionável do negócio.

    Se o OSM já traz uma ``description`` escrita à mão, ela vira a primeira
    frase (é melhor que qualquer texto gerado). Depois vem a leitura de
    oportunidade do Scout.
    """
    tags = b.raw_tags or {}
    tipo = _tipo_legivel(b)

    partes: list[str] = []

    # 1) Frase de identidade — usa a descrição do OSM se existir.
    descricao_osm = (tags.get("description") or "").strip()
    if descricao_osm:
        partes.append(descricao_osm.rstrip(".") + ".")
    else:
        cozinha = (tags.get("cuisine") or "").replace("_", " ").replace(";", ", ")
        if cozinha:
            partes.append(f"{tipo} ({cozinha}).")
        else:
            partes.append(f"{tipo}.")

    # 2) Leitura de oportunidade.
    if b.org_tipo is OrgTipo.PUBLICO:
        partes.append("Órgão público — fora do alvo da Fábrica.")
        return " ".join(partes)
    if b.org_tipo is OrgTipo.REDE:
        partes.append("Rede/franquia com site corporativo — fora do alvo.")
        return " ".join(partes)

    situacao = _situacao_site(b)
    canais = _canais_contato(b)
    contato_txt = " e ".join(canais) if canais else None

    if b.site_status is SiteStatus.COM_SITE:
        partes.append(f"{situacao.capitalize()} — candidato à auditoria de qualidade.")
        return " ".join(partes)

    quente = b.score >= LEAD_QUENTE and b.contactavel
    label = b.score_label.lower()

    if contato_txt:
        if quente:
            partes.append(
                f"Lead quente: {situacao}, com {contato_txt} — dá pra abordar já "
                f"(oportunidade {label})."
            )
        else:
            partes.append(
                f"{situacao.capitalize()}, com {contato_txt} — oportunidade {label}."
            )
    else:
        partes.append(
            f"{situacao.capitalize()}, mas sem contato no OSM — "
            f"oportunidade {label}; enriquecer contato antes de abordar."
        )

    return " ".join(partes)
