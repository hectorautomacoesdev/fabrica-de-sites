# Arquitetura

## Visão geral — 5 agentes em pipeline

```
[1] Scout  ──►  [2] Benchmark  ──►  [3] Auditor  ──►  [4] Criador  ──►  [5] Prospector
 mapeia          define o que é      audita sites      gera o site       contata o dono
 negócios        "site bom"          existentes        e publica         (WhatsApp/e-mail)
 sem site        por setor
```

Cada agente entrega um artefato consumido pelo próximo. O fio condutor é o
banco SQLite (`data/fabrica.db`): o Scout grava negócios; os demais agentes
vão lendo/enriquecendo esses registros.

| # | Agente | Entrada | Saída | Stack prevista | Fase |
|---|--------|---------|-------|----------------|------|
| 1 | **Scout** | nome da cidade | negócios + score de oportunidade + relatório | httpx + OSM (sem LLM) | **1 ✅** |
| 2 | **Benchmark** | setor | diretrizes de "site bom" | LLM + busca web | 2 |
| 3 | **Auditor** | sites existentes | nota de qualidade + gaps | Playwright + LLM | 3 |
| 4 | **Criador** | negócio + diretrizes | site publicado (URL) | LangGraph + Claude + Next.js | 4 |
| 5 | **Prospector** | negócio + site demo | contato enviado + resposta | OpenClaw (WhatsApp) | 5 |

## Princípios de design

1. **Determinístico primeiro, IA depois.** Tudo que dá para resolver com
   regras (classificar setor, pontuar oportunidade) é feito sem LLM: é grátis,
   rápido, testável e previsível. O LLM entra só onde agrega de verdade
   (gerar diretrizes, avaliar design, escrever código, redigir abordagem).
2. **Tudo plugável.** Trocar a fonte de dados ou o LLM não pode exigir
   reescrever o pipeline. Por isso a interface `BusinessSource` (ver abaixo).
3. **Começar grátis.** Fase 1 custa zero. Pagamos só quando o valor estiver
   comprovado e o gargalo for claro.
4. **Construir por fases**, um agente de cada vez, do simples ao complexo.

## Arquitetura interna do Agente Scout (Fase 1)

```
                 ┌─────────────────────────────────────────────┐
   cidade ──────►│  run_scout()  (scout.py — orquestrador)      │
                 └─────────────────────────────────────────────┘
                      │            │             │            │
                      ▼            ▼             ▼            ▼
              ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐
              │  Source    │ │ Classifier│ │  Scorer  │ │ (ordena) │
              │ (Overpass) │ │ setor +   │ │ score 0- │ │  por     │
              │ RawPlace[] │ │ contato + │ │ 100 +    │ │  score   │
              │            │ │ tipo web  │ │ motivos  │ │          │
              └────────────┘ └───────────┘ └──────────┘ └──────────┘
                                                              │
                      ┌───────────────────┬───────────────────┤
                      ▼                   ▼                   ▼
                ┌──────────┐        ┌───────────┐       ┌──────────┐
                │   db.py  │        │ insighter │──────►│ reporter │
                │ (SQLite) │        │ (agrega + │       │  (HTML)  │
                └──────────┘        │ insights) │       └──────────┘
                                    └───────────┘
```

### Módulos
- **`config.py`** — tudo ajustável: cidade, endpoints, pesos do score.
- **`models.py`** — `RawPlace` (cru do OSM) e `Business` (classificado/pontuado).
- **`core/sectors.py`** — taxonomia de setores + regras tag→setor.
- **`agents/scout/sources/`** — fontes plugáveis (`base.BusinessSource` + `overpass.OverpassSource`).
- **`agents/scout/classifier.py`** — extrai nome/contato/endereço e **detecta o tipo de presença web** (nenhum / só rede social / site próprio).
- **`agents/scout/scorer.py`** — calcula o score com motivos explicáveis.
- **`agents/scout/insighter.py`** — agrega KPIs, ranking de setores e gera insights (hoje por template; LLM no futuro).
- **`agents/scout/reporter.py`** + `templates/report.html.j2` — dashboard HTML.
- **`db.py`** — persistência SQLite.
- **`cli.py`** — comandos `fabrica scout run|setores|stats`.

### O ponto de extensão mais importante: `BusinessSource`
O Scout não sabe de onde vêm os negócios. Hoje usamos a Overpass (OSM, grátis).
Amanhã, para enriquecer telefone/avaliações, basta implementar a mesma
interface com Serper.dev ou Google Places — **sem tocar** em classifier, scorer,
insighter ou reporter.

```python
class BusinessSource(ABC):
    name: str
    def fetch(self, cidade, admin_level=8, limit=None) -> Iterable[RawPlace]: ...
```
