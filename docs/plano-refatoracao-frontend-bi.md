# Plano — Refatoração do frontend (BI & interatividade)

Proposta para transformar o painel do Scout de uma página "lista + KPIs" num **cockpit de
inteligência de mercado**: indicadores acionáveis, gráficos, mapa e exploração interativa
(filtro cruzado) para o Hector **descobrir oportunidades**. Embasamento e referências no
[Dossiê — BI e visualização de dados](bi-frontend-pesquisa.md).

> **Princípio guia (do dossiê):** abrir com o que gera ação (leads quentes, carência por setor,
> geografia), regra dos 5 segundos, *layer cake* (KPIs → gráficos com filtro → detalhe), e
> **cross-filtering** como motor de exploração.

## 1. O que os nossos dados já permitem mostrar

Inventário dos campos que o Scout já produz por negócio — a matéria-prima do BI:

| Campo | Vira… |
|---|---|
| `setor` / `setor_nome` | Distribuição e carência **por setor** |
| `site_status` (sem site / só social / tem site) | Funil e composição da carência |
| `score` / `score_label` | Distribuição de oportunidade; ranking |
| `score_motivos` | "Por que" de cada oportunidade (já no drawer) |
| `org_tipo` (independente/rede/público) | Filtrar ruído (franquia/órgão público) |
| `contactavel` / `telefone` / `email` | Quanto do mercado dá pra **abordar** |
| `lat` / `lon` | **Mapa** de concentração de oportunidades |
| `website` / `website_kind` | Quem só tem rede social (lead mais quente) |
| `ScoutRun` (cidade, fonte, total, `gerado_em`) | **Tendência** entre execuções |

## 2. Indicadores que importam (acionáveis)

Reordenar para o que sugere ação — não o total bruto. Cada KPI com um **gatilho de ação**:

| Indicador | Por que importa / que ação gera |
|---|---|
| **Leads quentes contactáveis** | A fila de trabalho de hoje — ligar/mandar WhatsApp |
| **% de contactabilidade** | Saúde da base; se baixa, acionar nova fonte (CNPJ/Serper) |
| **Setor com maior carência** | Onde concentrar esforço/criar template de site por nicho |
| **"Só rede social"** (count) | O lead mais fácil de converter (já entendeu que precisa estar on-line) |
| **Oportunidade média (score)** | Termômetro geral da rodada |
| **Variação vs. execução anterior** | Está crescendo a base de leads quentes? (Lead Velocity) |

> Total de negócios e "tem site" viram **contexto** (saúde), não a manchete.

## 3. O funil de prospecção

Nosso processo é um funil natural — visualizável como **funnel chart** (ou barras decrescentes):

```text
Negócios mapeados        ████████████████████  513
  └─ Sem site próprio    █████████████          342   (66%)
       └─ Contactáveis   █████████              242   (47%)
            └─ Leads quentes  █████             145   (28%)
                 └─ [futuro] Contatados / Responderam / Fecharam
```

As três últimas etapas crescem quando o **Prospector** (fase 5) entrar — o funil já nasce pronto
para receber "contatado → respondeu → fechou".

## 4. Layout proposto (layer cake)

```text
┌─────────────────────────────────────────────────────────────┐
│  [Execução ▼]                                  [+ Nova coleta]│
├─────────────────────────────────────────────────────────────┤
│  KPIs acionáveis (cards):                                     │
│  [Leads quentes] [% contactável] [Setor + carente] [Δ rodada] │
├──────────────────────────────┬──────────────────────────────┤
│  Funil de prospecção         │  Carência por setor (barras)  │
│  (clicável → filtra tudo)    │  (clicável → filtra tudo)     │
├──────────────────────────────┴──────────────────────────────┤
│  Mapa das oportunidades (marcadores por score) [clicável]    │
├─────────────────────────────────────────────────────────────┤
│  Tabela de leads (já filtrada pelos cliques) → drawer 360    │
└─────────────────────────────────────────────────────────────┘
```

**Cross-filtering** é a estrela: clicar numa barra de setor, num degrau do funil ou numa região
do mapa **refiltra os outros blocos + a tabela**. O drawer 360 do lead (já feito) é o nível mais
profundo do "drill-down".

## 5. Mapa das oportunidades

`lat`/`lon` viram um mapa **react-leaflet** com tiles grátis do OSM. Marcadores coloridos por
`score_label` (vermelho = altíssima). Hover mostra nome + status; clique abre o drawer. Cluster de
marcadores quando houver muitos pontos. Responde de imediato: **"onde está o ouro?"**

## 6. "Resumo do local" (feature pedida pelo Hector)

Dois níveis, ambos previstos:

- **Resumo da cidade/mercado** (topo da visão geral): um parágrafo gerado dos próprios números —
  *"Guarujá: 513 negócios; 66% sem site; setor mais carente: alimentação (X leads quentes); 47%
  contactáveis."* Determinístico, grátis, já dá pra fazer com os dados atuais.
- **Resumo por negócio** (no drawer, já com placeholder): chega com o enriquecimento/**Auditor** —
  o que é o local, presença on-line, pontos fracos do site. Liga com o [Plano do
  Auditor/Benchmark](plano-auditor-benchmark.md).

## 7. Mais páginas? Proposta de navegação

Sim, vale separar — mas **leve**. Em vez de uma página rolável gigante, **abas/visões** sobre os
mesmos dados (sem recarregar):

- **Visão geral** — KPIs + funil + carência por setor + resumo da cidade.
- **Mapa** — exploração geográfica.
- **Leads** — a tabela + filtros + drawer (o que já temos, turbinado).
- **Execuções** — comparar rodadas no tempo (tendência de leads quentes).

Implementação: abas do shadcn (`Tabs`) ou rotas com `react-router` (o `docs-app` já usa). Começar
com **Tabs** (mais simples) e migrar para rotas se crescer.

## 8. Stack técnica

- **shadcn Charts (Recharts)** para barras/funil/linha/rosca/histograma — encaixe nativo na stack
  (mesma filosofia de "código copiado"; tematiza por CSS vars). Adicionar tokens `--chart-1..5` no
  `index.css`, mapeados à paleta.
- **react-leaflet + Leaflet** para o mapa (grátis, OSM).
- **Estado de filtro compartilhado** (um contexto/estado no topo) para o cross-filtering — a peça
  de arquitetura nova.
- **Code-splitting** (`React.lazy`) para mapa e gráficos só carregarem na visão que os usa —
  segura o peso do bundle.
- **API:** a maioria dos agregados dá pra calcular no front a partir da lista já carregada; se
  ficar pesado, criar endpoints de agregação (`/runs/{id}/por-setor`, `/por-status`) — barato no
  SQLModel.

## 9. Alternativas de escopo

| Alt. | O que é | Esforço | Quando escolher |
|---|---|---|---|
| **A — Enriquecer a página única** | Adiciona 2–3 gráficos + resumo da cidade na página atual; sem mapa, sem cross-filter | Baixo | Quer ganho rápido e visível |
| **B — Multi-visão + mapa (recomendada)** | Abas (Visão geral / Mapa / Leads / Execuções), gráficos, mapa, resumo; cross-filter só na Visão geral | Médio | Equilíbrio: vira "BI de verdade" sem reescrever tudo |
| **C — Cockpit completo** | Tudo da B + cross-filter em todas as visões + endpoints de agregação + comparação avançada de rodadas | Alto | Quando a base/uso justificar |

**Recomendação:** **B**, construída em fases (começa parecendo a A e cresce). Entrega valor cedo e
não vira um buraco sem fundo.

## 10. Plano em fases

- **Fase A — Indicadores acionáveis + resumo da cidade.** Reordenar KPIs (manchete = leads
  quentes/carência), adicionar o "resumo do local" determinístico, tokens de chart. *(sem libs
  novas além do Recharts)*
- **Fase B — Gráficos.** Funil de prospecção + carência por setor + distribuição de score, com
  shadcn Charts. Drill-down (clicar → filtra a tabela).
- **Fase C — Mapa.** react-leaflet com marcadores por score; clique → drawer.
- **Fase D — Navegação por abas + cross-filtering.** Visões separadas e o estado de filtro
  compartilhado (o "motor de exploração").
- **Fase E — Execuções no tempo.** Comparar rodadas (linha de leads quentes), Lead Velocity.

Cada fase: build + lint verdes, visual revisado por você, commit próprio.

## 11. Decisões a confirmar com o Hector

1. **Escopo:** vamos de **B (recomendada)**, ou começar pela **A** e ver?
2. **Navegação:** **abas** (mais simples) ou **rotas** (`react-router`) desde já?
3. **Mapa:** entra agora (Fase C) ou depois? (É o item de maior "uau", mas adiciona ~150 kB.)
4. **Agregação:** calcular no front (rápido de começar) e só criar endpoints se pesar — ok?
5. **Resumo do local:** começar pelo **determinístico de cidade** agora e deixar o **por-negócio**
   para o Auditor — concorda?
