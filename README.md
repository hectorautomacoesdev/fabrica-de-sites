# Fábrica de Sites — Sistema Multiagente

Sistema que **encontra negócios locais sem site (ou com site fraco)**, **gera sites** sob medida e **oferece aos donos**. Mercado-alvo inicial: Guarujá, SP.

> **Status:** Fase 1 em construção — o **Agente Scout** (prospecção/contexto). Veja [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Os 5 agentes

| # | Agente | Papel | Fase |
|---|--------|-------|------|
| 1 | **Scout** | Mapeia negócios da cidade, detecta quem não tem site, ranqueia oportunidade por setor | **1 (atual)** |
| 2 | **Benchmark** | Define diretrizes de "site bom" por setor | 2 |
| 3 | **Auditor** | Visita os sites existentes e pontua a qualidade | 3 |
| 4 | **Criador** | Gera o site e publica | 4 |
| 5 | **Prospector** | Entra em contato com o dono (WhatsApp/e-mail) | 5 |

Arquitetura completa em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md). Decisões técnicas e o porquê em [`docs/DECISOES.md`](docs/DECISOES.md).

## Como rodar (Fase 1 — Scout)

Não precisa de **nenhuma chave de API**. Usa dados públicos e gratuitos do OpenStreetMap.

```powershell
# 1. Ativar o ambiente virtual (já criado em .venv)
.\.venv\Scripts\Activate.ps1

# 2. Instalar o projeto em modo editável (uma vez)
pip install -e .

# 3. Rodar o Scout para Guarujá
fabrica scout run --cidade "Guarujá" --abrir

# Outros comandos úteis
fabrica scout setores      # lista a taxonomia de setores
fabrica scout stats        # estatísticas da última execução
fabrica --help
```

A saída é gravada em `data/`:
- `fabrica.db` — banco SQLite com todos os negócios encontrados
- `relatorio_scout.html` — dashboard navegável (mapa, gráficos, tabela filtrável, insights)

## Estrutura

```
src/fabrica_sites/
├── config.py            # configurações centrais (cidade, pesos do score, etc.)
├── models.py            # modelos de dados (Pydantic)
├── db.py                # persistência em SQLite
├── cli.py               # interface de linha de comando
├── core/
│   └── sectors.py       # taxonomia de setores + mapeamento de tags do OSM
└── agents/
    └── scout/
        ├── sources/     # fontes de dados plugáveis (Overpass agora; Serper/Places depois)
        ├── classifier.py
        ├── scorer.py    # cálculo do score de oportunidade
        ├── insighter.py # insights (template agora; LLM depois)
        ├── reporter.py  # gera o relatório HTML
        └── scout.py     # orquestra o pipeline
```

## Princípios do projeto

1. **Começar grátis.** Fase 1 não gasta um centavo. Custo entra só quando comprovar valor.
2. **Construir por fases**, do simples ao complexo, um agente de cada vez.
3. **Tudo plugável.** Trocar fonte de dados ou LLM não deve exigir reescrever o pipeline.
4. **Determinístico primeiro, IA depois.** O que dá pra fazer sem LLM, fazemos sem LLM.
