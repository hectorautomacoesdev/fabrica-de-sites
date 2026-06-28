"""Taxonomia de subsetores do Scout.

Dado o setor de nível 1 (ex.: "alimentacao") e os raw_tags originais do OSM,
retorna um rótulo de subsetor mais granular (ex.: "Pizzaria", "Dentista").

Tudo determinístico, grátis e derivado de dados que já estão no banco
(coluna ``raw_tags`` da tabela ``businesses``). Sem LLM, sem custo adicional.

Regras de prioridade por setor:
- alimentacao : amenity específico > cuisine > shop de alimentos > fallback
- saude       : amenity específico > healthcare:speciality > fallback
- beleza      : shop específico > outros
- comercio    : shop específico > fallback
- turismo     : tourism específico > fallback
- automotivo  : shop/amenity específico > fallback
- servicos    : craft > shop específico > fallback
- profissional: office específico > fallback
- educacao    : amenity específico > fallback
- fitness     : leisure específico > fallback
- outros      : → "Outros"
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Alimentação
# ---------------------------------------------------------------------------

_CUISINE_MAP: dict[str, str] = {
    "pizza": "Pizzaria",
    "sushi": "Japonês & Sushi",
    "japanese": "Japonês & Sushi",
    "burger": "Hamburgueria",
    "barbecue": "Churrascaria",
    "churrascaria": "Churrascaria",
    "seafood": "Frutos do Mar",
    "fish": "Frutos do Mar",
    "fish_and_chips": "Frutos do Mar",
    "italian": "Italiano",
    "chinese": "Chinês",
    "arabic": "Árabe",
    "lebanese": "Árabe",
    "sandwich": "Sanduíches",
    "hot_dog": "Sanduíches",
    "steak_house": "Churrascaria",
    "regional": "Culinária Regional",
    "brazilian": "Culinária Regional",
    "vegetarian": "Vegetariano/Vegano",
    "vegan": "Vegetariano/Vegano",
    "ice_cream": "Sorveteria",
    "coffee_shop": "Cafeteria",
    "acai": "Açaí",
    "juice": "Sucos & Vitaminas",
    "fruta": "Sucos & Vitaminas",
    "pastelaria": "Pastelaria",
    "pastel": "Pastelaria",
}

def _sub_alimentacao(tags: dict[str, str]) -> str:
    amenity = tags.get("amenity", "")
    shop = tags.get("shop", "")
    cuisine = tags.get("cuisine", "").lower().split(";")[0].strip()

    # Prioridade 1: tipo de estabelecimento específico
    if amenity == "fast_food":
        cuis = _CUISINE_MAP.get(cuisine)
        return cuis if cuis else "Lanchonete"
    if amenity == "cafe":
        cuis = _CUISINE_MAP.get(cuisine)
        return cuis if cuis in ("Sorveteria", "Açaí", "Sucos & Vitaminas") else "Cafeteria"
    if amenity in ("bar", "pub", "biergarten"):
        return "Bar & Boteco"
    if amenity == "ice_cream":
        return "Sorveteria"
    if amenity == "food_court":
        return "Praça de Alimentação"

    # Prioridade 2: shop de alimentos
    if shop == "bakery":
        return "Padaria"
    if shop in ("confectionery", "pastry"):
        return "Confeitaria & Doces"
    if shop == "butcher":
        return "Açougue"
    if shop in ("greengrocer", "fruit"):
        return "Hortifrúti"
    if shop in ("seafood", "fish"):
        return "Frutos do Mar"
    if shop == "coffee":
        return "Cafeteria"
    if shop == "deli":
        return "Delicatessen"

    # Prioridade 3: cuisine do restaurante
    if cuisine:
        mapeado = _CUISINE_MAP.get(cuisine)
        if mapeado:
            return mapeado

    # Prioridade 4: é restaurante genérico
    if amenity == "restaurant":
        return "Restaurante"

    return "Alimentação (outros)"


# ---------------------------------------------------------------------------
# Saúde & Clínicas
# ---------------------------------------------------------------------------

_HEALTHCARE_SPECIALTY: dict[str, str] = {
    "general": "Clínico Geral",
    "general_practice": "Clínico Geral",
    "cardiology": "Cardiologia",
    "dermatology": "Dermatologia",
    "gynaecology": "Ginecologia & Obstetrícia",
    "gynecology": "Ginecologia & Obstetrícia",
    "obstetrics": "Ginecologia & Obstetrícia",
    "paediatrics": "Pediatria",
    "pediatrics": "Pediatria",
    "orthopaedics": "Ortopedia",
    "orthopedics": "Ortopedia",
    "neurology": "Neurologia",
    "ophthalmology": "Oftalmologia",
    "urology": "Urologia",
    "psychiatry": "Psiquiatria",
    "psychology": "Psicologia",
    "physiotherapy": "Fisioterapia",
    "nutrition": "Nutrição",
    "speech_therapy": "Fonoaudiologia",
    "acupuncture": "Acupuntura",
}

def _sub_saude(tags: dict[str, str]) -> str:
    amenity = tags.get("amenity", "")
    healthcare = tags.get("healthcare", "")
    shop = tags.get("shop", "")
    speciality = tags.get("healthcare:speciality", tags.get("healthcare:specialty", ""))

    if amenity == "pharmacy" or shop == "pharmacy":
        return "Farmácia"
    if amenity == "dentist":
        return "Dentista"
    if amenity == "veterinary":
        return "Veterinária"
    if shop == "optician":
        return "Ótica"
    if shop in ("hearing_aids", "medical_supply"):
        return "Equipamentos Médicos"

    # Clínica vs consultório
    if amenity == "clinic" or healthcare == "clinic":
        spec = _HEALTHCARE_SPECIALTY.get(speciality.lower(), "")
        return f"Clínica de {spec}" if spec else "Clínica"

    # Consultório médico — tentar identificar especialidade
    if amenity in ("doctors", "hospital") or healthcare == "doctor":
        spec = _HEALTHCARE_SPECIALTY.get(speciality.lower(), "")
        return f"{spec}" if spec else "Consultório Médico"

    if healthcare:
        return "Saúde (outros)"

    return "Saúde (outros)"


# ---------------------------------------------------------------------------
# Beleza & Estética
# ---------------------------------------------------------------------------

def _sub_beleza(tags: dict[str, str]) -> str:
    shop = tags.get("shop", "")
    leisure = tags.get("leisure", "")
    amenity = tags.get("amenity", "")
    beauty = tags.get("beauty", "")

    if shop == "hairdresser":
        # Verificar se é barbearia pelo nome ou tag adicional
        nome = tags.get("name", "").lower()
        if any(k in nome for k in ("barber", "barbearia", "barba")):
            return "Barbearia"
        return "Salão de Cabelo"
    if shop == "beauty" or beauty:
        return "Estética & Spa"
    if shop in ("cosmetics", "perfumery"):
        return "Cosméticos & Perfumes"
    if shop == "hairdresser_supply":
        return "Distribuidora de Beleza"
    if shop == "nail_salon":
        return "Manicure & Nail Art"
    if shop == "tattoo":
        return "Tatuagem & Piercing"
    if shop == "massage":
        return "Massagem"
    if leisure == "spa" or amenity == "spa":
        return "Spa"
    return "Beleza (outros)"


# ---------------------------------------------------------------------------
# Comércio & Lojas
# ---------------------------------------------------------------------------

_SHOP_MAP: dict[str, str] = {
    "clothes": "Roupas & Moda",
    "fashion": "Roupas & Moda",
    "shoes": "Calçados",
    "bag": "Bolsas & Acessórios",
    "jewelry": "Joias & Acessórios",
    "accessories": "Bolsas & Acessórios",
    "supermarket": "Supermercado",
    "convenience": "Mercearia & Conveniência",
    "grocery": "Mercearia & Conveniência",
    "electronics": "Eletro & Tecnologia",
    "computer": "Eletro & Tecnologia",
    "mobile_phone": "Eletro & Tecnologia",
    "furniture": "Móveis & Decoração",
    "interior_decoration": "Móveis & Decoração",
    "home": "Móveis & Decoração",
    "hardware": "Material de Construção",
    "doityourself": "Material de Construção",
    "building_materials": "Material de Construção",
    "flooring": "Material de Construção",
    "paint": "Material de Construção",
    "books": "Livraria & Papelaria",
    "stationery": "Livraria & Papelaria",
    "newsagent": "Livraria & Papelaria",
    "toys": "Brinquedos",
    "baby_goods": "Artigos Infantis",
    "pet": "Pet Shop",
    "garden": "Jardinagem & Flores",
    "florist": "Jardinagem & Flores",
    "gift": "Presentes & Decoração",
    "sports": "Artigos Esportivos",
    "bicycle": "Bikes & Acessórios",
    "photo": "Foto & Vídeo",
    "optician": "Ótica",
    "music": "Instrumentos Musicais",
    "alcohol": "Adega & Bebidas",
    "beverages": "Adega & Bebidas",
    "tobacco": "Tabacaria",
    "cleaning": "Limpeza & Higiene",
    "variety_store": "Loja de Variedades",
    "second_hand": "Brechó",
}

def _sub_comercio(tags: dict[str, str]) -> str:
    shop = tags.get("shop", "")
    mapeado = _SHOP_MAP.get(shop)
    return mapeado if mapeado else "Comércio (outros)"


# ---------------------------------------------------------------------------
# Turismo & Hospedagem
# ---------------------------------------------------------------------------

def _sub_turismo(tags: dict[str, str]) -> str:
    tourism = tags.get("tourism", "")
    mapping = {
        "hotel": "Hotel",
        "guest_house": "Pousada",
        "hostel": "Hostel",
        "motel": "Motel",
        "apartment": "Apartamento de Temporada",
        "chalet": "Chalet",
        "resort": "Resort",
        "camp_site": "Camping",
        "caravan_site": "Camping",
    }
    return mapping.get(tourism, "Hospedagem (outros)")


# ---------------------------------------------------------------------------
# Automotivo
# ---------------------------------------------------------------------------

def _sub_automotivo(tags: dict[str, str]) -> str:
    shop = tags.get("shop", "")
    amenity = tags.get("amenity", "")
    mapping = {
        "car_repair": "Oficina Mecânica",
        "car": "Concessionária & Revendedora",
        "car_parts": "Peças & Acessórios",
        "tyres": "Pneus",
        "car_wash": "Lava-Rápido",
        "motorcycle": "Motos",
        "motorcycle_repair": "Motos",
    }
    result = mapping.get(shop)
    if result:
        return result
    if amenity in ("car_wash", "car_rental"):
        return "Lava-Rápido" if amenity == "car_wash" else "Locadora de Veículos"
    return "Automotivo (outros)"


# ---------------------------------------------------------------------------
# Serviços & Reparos
# ---------------------------------------------------------------------------

_CRAFT_MAP: dict[str, str] = {
    "electrician": "Elétrica",
    "plumber": "Hidráulica & Encanamento",
    "carpenter": "Marcenaria",
    "joiner": "Marcenaria",
    "painter": "Pintura",
    "roofer": "Telhados",
    "glazier": "Vidraçaria",
    "welder": "Serralheria & Solda",
    "blacksmith": "Serralheria & Solda",
    "hvac": "Ar-Condicionado & Refrigeração",
    "refrigeration_mechanic": "Ar-Condicionado & Refrigeração",
    "electronics_repair": "Conserto de Eletrônicos",
    "shoemaker": "Sapateiro & Reparos",
    "tailor": "Alfaiataria & Costura",
    "dressmaker": "Alfaiataria & Costura",
    "photographer": "Fotografia & Filmagem",
    "printer": "Gráfica & Impressão",
    "locksmith": "Chaveiro",
    "key_cutter": "Chaveiro",
}

def _sub_servicos(tags: dict[str, str]) -> str:
    craft = tags.get("craft", "")
    shop = tags.get("shop", "")
    mapeado = _CRAFT_MAP.get(craft)
    if mapeado:
        return mapeado
    shop_mapping = {
        "laundry": "Lavanderia",
        "dry_cleaning": "Lavanderia",
        "locksmith": "Chaveiro",
        "travel_agency": "Agência de Viagens",
        "funeral_directors": "Serviços Funerários",
    }
    return shop_mapping.get(shop, "Serviços (outros)")


# ---------------------------------------------------------------------------
# Escritórios & Profissionais
# ---------------------------------------------------------------------------

_OFFICE_MAP: dict[str, str] = {
    "lawyer": "Advocacia & Jurídico",
    "notary": "Cartório & Notariado",
    "accountant": "Contabilidade",
    "tax_advisor": "Contabilidade",
    "financial": "Finanças & Investimentos",
    "insurance": "Seguros",
    "estate_agent": "Imobiliária",
    "company": "Empresa / Escritório",
    "it": "TI & Tecnologia",
    "consulting": "Consultoria",
    "advertising_agency": "Publicidade & Marketing",
    "marketing": "Publicidade & Marketing",
    "architect": "Arquitetura & Engenharia",
    "engineer": "Arquitetura & Engenharia",
    "educational_institution": "Educação",
    "government": "Setor Público",
    "ngo": "ONG / Associação",
    "association": "ONG / Associação",
    "travel_agent": "Agência de Viagens",
    "therapist": "Saúde & Bem-estar",
    "religion": "Religioso",
    "quango": "Órgão Público",
    "political_party": "Político",
    "research": "Pesquisa & Inovação",
}

def _sub_profissional(tags: dict[str, str]) -> str:
    office = tags.get("office", "")
    mapeado = _OFFICE_MAP.get(office)
    return mapeado if mapeado else "Escritório (outros)"


# ---------------------------------------------------------------------------
# Educação & Cursos
# ---------------------------------------------------------------------------

def _sub_educacao(tags: dict[str, str]) -> str:
    amenity = tags.get("amenity", "")
    mapping = {
        "language_school": "Escola de Idiomas",
        "driving_school": "Auto Escola",
        "music_school": "Escola de Música",
        "prep_school": "Curso Preparatório",
        "college": "Faculdade & Ensino Superior",
        "university": "Faculdade & Ensino Superior",
        "school": "Escola",
        "kindergarten": "Creche & Pré-Escola",
    }
    return mapping.get(amenity, "Educação (outros)")


# ---------------------------------------------------------------------------
# Fitness & Esporte
# ---------------------------------------------------------------------------

def _sub_fitness(tags: dict[str, str]) -> str:
    leisure = tags.get("leisure", "")
    shop = tags.get("shop", "")
    mapping = {
        "fitness_centre": "Academia de Ginástica",
        "sports_centre": "Centro Esportivo",
        "dance": "Dança & Artes Marciais",
        "swimming_pool": "Piscina",
        "stadium": "Estádio",
    }
    result = mapping.get(leisure)
    if result:
        return result
    if shop == "sports":
        return "Artigos Esportivos"
    return "Fitness (outros)"


# ---------------------------------------------------------------------------
# Dispatcher principal
# ---------------------------------------------------------------------------

_DISPATCHERS = {
    "alimentacao": _sub_alimentacao,
    "saude": _sub_saude,
    "beleza": _sub_beleza,
    "comercio": _sub_comercio,
    "turismo": _sub_turismo,
    "automotivo": _sub_automotivo,
    "servicos": _sub_servicos,
    "profissional": _sub_profissional,
    "educacao": _sub_educacao,
    "fitness": _sub_fitness,
}


def classificar_subsetor(setor: str, raw_tags: dict[str, str]) -> str:
    """Classifica um negócio no subsetor mais específico possível.

    Usa as ``raw_tags`` do OSM (sempre presentes no banco) para derivar
    granularidade além do setor de nível 1. Retorna "Outros" como fallback.
    """
    fn = _DISPATCHERS.get(setor)
    if fn is None:
        return "Outros"
    return fn(raw_tags)
