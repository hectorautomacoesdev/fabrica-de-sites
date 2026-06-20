"""Mapeamento CNAE -> setor do Scout (aproximado, por prefixo).

Alinhado aos setores de src/fabrica_sites/core/sectors.py:
  beleza · saude · alimentacao · turismo · fitness · automotivo ·
  servicos · profissional · educacao · comercio · outros

Regra: vence o PREFIXO MAIS LONGO que casar com o CNAE de 7 dígitos.
É uma aproximação para estimar oportunidade por setor — não é exaustivo.
Referência dos códigos: tabela Cnaes.zip da própria RFB (resultados/cnae_map.json).
"""

from __future__ import annotations

# prefixo do CNAE (7 dígitos) -> setor. Ordenado por especificidade na busca.
_REGRAS: dict[str, str] = {
    # Beleza e estética
    "9602": "beleza",           # cabeleireiros, manicure, estética
    # Saúde
    "86": "saude",              # atenção à saúde humana (clínicas, médicos, odonto, lab)
    "7500": "saude",            # veterinária
    "4771": "saude",            # farmácias / drogarias (comércio de prod. farmacêuticos)
    "4772": "saude",            # cosméticos e artigos médicos
    # Alimentação (food service + padaria)
    "561": "alimentacao",       # restaurantes, lanchonetes, bares
    "562": "alimentacao",       # catering, cantinas
    "4721": "alimentacao",      # padarias, prod. alimentícios varejo
    "1091": "alimentacao",      # fabricação de produtos de padaria
    # Turismo / hospedagem
    "5510": "turismo",          # hotéis, pousadas
    "5590": "turismo",          # outros alojamentos
    "7911": "turismo",          # agências de viagem
    "7912": "turismo",
    "7990": "turismo",
    # Fitness
    "9313": "fitness",          # academias
    "9311": "fitness",
    "9312": "fitness",
    "9319": "fitness",
    # Automotivo
    "451": "automotivo",        # comércio de veículos
    "452": "automotivo",        # manutenção e reparação de veículos
    "4530": "automotivo",       # peças e acessórios
    "4541": "automotivo",       # motocicletas
    "4542": "automotivo",
    "4543": "automotivo",
    # Educação
    "85": "educacao",           # educação (escolas, cursos)
    # Serviços profissionais
    "69": "profissional",       # jurídico, contábil
    "70": "profissional",       # consultoria em gestão
    "71": "profissional",       # arquitetura, engenharia, ensaios
    "7311": "profissional",     # agências de publicidade
    "7420": "profissional",     # fotografia
    "7490": "profissional",
    # Serviços pessoais / reparação / domésticos
    "9601": "servicos",         # lavanderias
    "9603": "servicos",         # funerárias
    "9529": "servicos",         # reparação de objetos pessoais/domésticos
    "9521": "servicos",         # reparação eletroeletrônicos
    "812": "servicos",          # limpeza
    "8230": "servicos",         # eventos
    # Comércio varejista (genérico) — perde para prefixos mais específicos acima
    "47": "comercio",
}

# pré-ordena por comprimento desc para casar o prefixo mais longo primeiro
_REGRAS_ORD = sorted(_REGRAS.items(), key=lambda kv: -len(kv[0]))


def cnae_para_setor(cnae: str) -> str:
    """Recebe um CNAE (string de 7 dígitos) e devolve o setor do Scout."""
    if not cnae:
        return "outros"
    cnae = cnae.strip().zfill(7)
    for prefixo, setor in _REGRAS_ORD:
        if cnae.startswith(prefixo):
            return setor
    return "outros"


# setores considerados "prioritários" para o piloto (mesma ideia do Scout)
SETORES_PRIORITARIOS = {"beleza", "saude", "alimentacao", "turismo", "fitness"}
