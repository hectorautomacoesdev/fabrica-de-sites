# Dossiê — BI, dashboards e visualização de dados

Pesquisa (jun/2026) para embasar a refatoração do painel do Scout em algo mais **analítico e
interativo** — um "cockpit" que ajude o Hector a **descobrir oportunidades**, não só listar
negócios. Este documento reúne as referências e os princípios; a proposta concreta está no
[Plano — Refatoração do frontend (BI)](plano-refatoracao-frontend-bi.md).

> **Por que isso importa para o nosso caso.** Hoje o painel mostra KPIs + uma tabela. Funciona,
> mas é "estático". O objetivo é responder perguntas de negócio com um olhar: *onde* estão as
> melhores oportunidades, *quais setores* estão mais carentes de site, *quanto* do mercado dá pra
> contatar, e *como* isso evolui a cada execução.

## 1. Princípios de design de dashboards de BI

Consenso entre as fontes (DataCamp, RIB Software, TechTarget, Yellowfin, Metabase):

- **Regra dos 5 segundos.** A mensagem principal do painel tem de ser captada em ~5 s. Se exige
  estudo, o layout falhou.
- **"Layer cake" (bolo de camadas).** Topo: **3–7 KPIs executivos** (com status verde/vermelho).
  Meio: métricas por dimensão, com filtros. Fundo: detalhe granular (tabela, drill-down).
- **Hierarquia visual = prioridade de decisão.** O que decide ação fica **grande e no topo**; o
  que é apoio fica menor e abaixo. Não enterrar uma métrica crítica numa linha de tabela.
- **Design por exceção.** Destacar o que foge do esperado (ex.: setor com altíssima carência),
  não dar o mesmo peso a tudo.
- **Menos é mais.** Poucos KPIs que **preveem** desempenho + alguns "helper". Evitar poluir com
  dezenas de indicadores atrasados (*lagging*).

> Estudos citados (RIB, UK Data Services) falam em **+87% de velocidade de decisão** e **−65% de
> tempo até o insight** com bons dashboards. Número de marketing, mas a direção é real: layout
> guia atenção.

## 2. Métricas acionáveis vs. métricas de vaidade

Distinção central (AgencyAnalytics, Userpilot, ClicData):

- **Vaidade:** boa de mostrar, ruim de agir (ex.: "total de negócios mapeados" sozinho).
- **Acionável:** liga a um objetivo e sugere a **próxima ação** (ex.: "142 leads quentes
  contactáveis no setor alimentação" → ligar para eles hoje).

> "Se o relatório abre com seguidores, o time otimiza seguidores. Se abre com conversão e CAC,
> otimiza o negócio." Aplicado a nós: o painel deve **abrir com leads quentes e carência por
> setor**, não com o total bruto.

Vaidade não é inútil — serve de **contexto/saúde**. A regra: vaidade como pano de fundo,
acionável para decidir.

## 3. Escolha de gráfico por intenção

Guia consolidado (Atlassian, Inforiver, NetSuite, TGM):

| Quero mostrar… | Gráfico | Observação |
|---|---|---|
| Comparar categorias (setores, status) | **Barra** (horizontal se rótulos longos) | O "cavalo de batalha"; quase sempre a escolha mais limpa |
| Evolução no tempo (execuções) | **Linha / área** | Tendência de leads quentes por rodada |
| Processo linear com perdas | **Funil** | Prospecção: mapeado → sem site → contactável → quente |
| Parte de um todo (poucas fatias) | **Rosca/pizza** | Só com 2–4 categorias; senão, barra |
| Distribuição de um valor | **Histograma** | Distribuição dos scores 0–100 |
| Concentração geográfica | **Mapa** (marcadores/heat) | Onde estão as oportunidades — ver §5 |
| Duas dimensões + tamanho | **Dispersão/bolha** | Setor × score médio × volume |

> **Cuidado com o funil:** ótimo para processo linear, ruim para comparar categorias. Onde um
> funil e uma barra empatam, a barra costuma ser mais legível.

## 4. Interatividade — os três níveis

De estático a exploratório (Databricks, ThoughtSpot, GoodData, Luzmo):

1. **Tooltips/hover** — detalhe sob demanda sem poluir (o valor exato, o nome do negócio).
2. **Drill-down** — do resumo ao detalhe no mesmo gráfico (clicar no setor → ver os negócios).
3. **Cross-filtering (filtro cruzado)** — clicar num pedaço de um gráfico **refiltra todos os
   outros** (e a tabela e o mapa). É descrito como **o recurso de maior valor**: transforma o
   painel de "coleção de blocos" em "uma história coerente", com zero treinamento do usuário.

> Empresas com dashboards interativos têm **+28%** de chance de achar insights no tempo certo
> (ThoughtSpot). Para nós, cross-filter é o coração do "descobrir insights de verdade" que o
> Hector pediu.

## 5. Visualização geográfica

Nossos dados têm **lat/lon** por negócio — um ativo subaproveitado. Um mapa responde de imediato
"onde focar a prospecção".

- **Marcadores por ponto**, coloridos por score/status (vermelho = lead quente). Bom para volume
  moderado (centenas de pontos), que é o nosso caso.
- **Choropleth** (áreas pintadas por intensidade) — para densidade por bairro/região; exige
  polígonos (GeoJSON) dos bairros.
- **Heatmap** — mancha de calor de concentração.
- **Lib:** **Leaflet + react-leaflet**, open-source, com **tiles grátis do OpenStreetMap** (sem
  chave/cartão) — perfeitamente alinhado à filosofia "começar grátis / OSM" do projeto. GeoJSON é
  nativo; `onEachFeature`/`style` controlam hover e cor.

## 6. Bibliotecas de gráfico para React

Comparativo (PkgPulse, Kyle Gill, DEV, Querio) com foco na **nossa stack (React 19 + Tailwind +
shadcn)**:

| Lib | Tamanho | Encaixe | Veredito |
|---|---|---|---|
| **shadcn Charts** (Recharts por baixo) | ~150 kB (Recharts) | **Nativo** — mesma filosofia "copia o código, você é dono"; tematiza por CSS vars (`--chart-1..5`) | **Recomendado.** Já estamos no shadcn; zero novo sistema de design |
| **Tremor** | ~200 kB | Componentes de dashboard prontos, estética shadcn | Bom, mas **redundante** com shadcn Charts; também é Recharts por baixo |
| **Nivo** | até 500 kB | 30+ tipos, SVG/Canvas/HTML | Poderoso, porém pesado; útil só se precisarmos de gráficos exóticos |
| **visx** | ~15 kB (modular) | Primitivos D3+React | Máximo controle, **muito código** (50–100 linhas por gráfico) |
| **Leaflet / react-leaflet** | ~150 kB | Mapas | **Recomendado** para o mapa (grátis, OSM) |

> **shadcn Charts não "embrulha" o Recharts** — você combina `ChartContainer`,
> `ChartTooltip(Content)`, `ChartLegend(Content)` e `ChartConfig` com os elementos nativos do
> Recharts (`Bar`, `Line`, `Area`, `XAxis`…). Sem abstração trancada: quando o Recharts atualiza,
> você segue o upgrade oficial. Cores por `var(--color-chave)`.

## 7. Trade-offs honestos

- **Peso do bundle.** Recharts (~150 kB) + Leaflet (~150 kB) crescem o pacote. Mitigação:
  **code-splitting** (carregar gráficos/mapa só na visão que os usa, via `React.lazy`).
- **Complexidade.** Cross-filtering exige um estado de filtro compartilhado entre os blocos —
  mais arquitetura. Vale, mas é a parte mais "cara"; dá pra entregar por fases.
- **Dados ainda rasos.** Algumas métricas clássicas de BI (CAC, CPL, conversão) **não se aplicam**
  ainda — não há gasto de mídia nem funil de venda fechado. Nosso BI é de **descoberta de
  mercado** (distribuições, carência, geografia), evoluindo para funil de prospecção conforme os
  agentes Prospector/Auditor entrarem.

## Fontes

**Design de dashboards:** DataCamp — [Effective Dashboard Design](https://www.datacamp.com/tutorial/dashboard-design-tutorial) ·
RIB Software — [BI Dashboard Design Principles](https://www.rib-software.com/en/blogs/bi-dashboard-design-principles-best-practices) ·
TechTarget — [10 Dashboard Design Principles](https://www.techtarget.com/searchbusinessanalytics/tip/Good-dashboard-design-8-tips-and-best-practices-for-BI-teams) ·
Yellowfin — [Dashboard Design 2025](https://www.yellowfinbi.com/blog/dashboard-design-5-essential-tips-and-considerations) ·
Metabase — [BI dashboard best practices](https://www.metabase.com/learn/metabase-basics/querying-and-dashboards/dashboards/bi-dashboard-best-practices)

**Métricas acionáveis vs. vaidade:** AgencyAnalytics — [Vanity Metrics](https://agencyanalytics.com/blog/vanity-metrics) ·
Userpilot — [Vanity vs Actionable](https://userpilot.com/blog/vanity-metrics-vs-actionable-metrics-saas/) ·
ClicData — [Vanity vs Actionable in Marketing](https://www.clicdata.com/blog/vanity-vs-actionable-metrics-marketing/)

**Escolha de gráficos / funil:** Atlassian — [Essential Chart Types](https://www.atlassian.com/data/charts/essential-chart-types-for-data-visualization) ·
Atlassian — [Funnel Chart Guide](https://www.atlassian.com/data/charts/funnel-chart-complete-guide) ·
Inforiver — [Funnel charts: how and when](https://inforiver.com/insights/funnel-charts-how-and-when-to-use-them/)

**Interatividade:** Databricks — [Next-Level Interactivity](https://www.databricks.com/blog/next-level-interactivity-aibi-dashboards) ·
ThoughtSpot — [Interactive Dashboards](https://www.thoughtspot.com/data-trends/dashboard/interactive-dashboard) ·
DataBrain — [Interactive Dashboard Design](https://www.usedatabrain.com/blog/interactive-dashboard)

**Lead generation / KPIs:** Salesmotion — [Lead Generation KPIs](https://salesmotion.io/blog/lead-generation-key-performance-indicators) ·
AgencyAnalytics — [Lead Generation KPIs 2025](https://agencyanalytics.com/blog/lead-generation-kpis) ·
Klipfolio — [Lead Generation Dashboard](https://www.klipfolio.com/resources/dashboard-examples/marketing/lead-generation-dashboard)

**Mapas:** Leaflet — [Interactive Choropleth](https://leafletjs.com/examples/choropleth/) ·
[react-leaflet](https://react-leaflet.js.org/)

**Bibliotecas de gráfico:** shadcn/ui — [Charts](https://ui.shadcn.com/charts) ·
PkgPulse — [Recharts vs Tremor vs Nivo (2026)](https://www.pkgpulse.com/guides/recharts-v3-vs-tremor-vs-nivo-react-charting-2026) ·
Kyle Gill — [My Take on React Chart Libraries](https://www.kylegill.com/essays/react-chart-libraries/)
