# Plano — Agentes Benchmark + Auditor ("o site é bom ou ruim?")

> **O que esta página é:** o plano de trabalho dos próximos dois agentes da Fábrica de Sites,
> que juntos respondem _"este site é bom ou ruim?"_. Sintetiza a pesquisa feita em jun/2026
> (web + GitHub) em estruturas concretas, alternativas de arquitetura e próximos passos.
>
> **Leitura de apoio:** o [Dossiê de pesquisa do Auditor/Benchmark](auditor-benchmark-pesquisa.md)
> traz a pesquisa crua (ferramentas, projetos GitHub, papers, checklists por setor e fontes).
> As decisões desta página estão registradas como ADRs **D20** e **D21** em [Decisões](decisoes.md).

---

## 1. Para que servem esses dois agentes

Hoje o **Scout** já diz _se_ um negócio tem site (sem site / só rede social / site próprio). O que
ele **não** diz é _se o site é bom_. É aí que entram dois agentes que trabalham em par:

| Agente | Pergunta que responde | Natureza |
|--------|----------------------|----------|
| **Benchmark** | "O que um site **deveria** ter neste setor?" | Dados/configuração (checklists por setor) |
| **Auditor** | "O site **deste** negócio atende a isso? Que nota dou?" | Pipeline de checagens sobre o site real |

Em uma frase: o **Benchmark é a régua**, o **Auditor é a medição**. O Auditor visita o site,
roda checagens, compara com a régua do setor e devolve **nota 0–100 + lista de problemas/gaps**.
Essa nota e essa lista alimentam diretamente o discurso de venda (o futuro Prospector) e a
priorização de quem abordar.

> **Por que tratá-los juntos:** um sem o outro não fecha valor. Régua sem medição não pontua
> ninguém; medição sem régua não sabe o que cobrar. Mas eles têm **ciclos de vida diferentes**:
> a régua (Benchmark) é **dado versionado** que evolui devagar; o Auditor é **código** que roda
> sempre. Por isso são módulos separados (ver §5).

---

## 2. As três camadas de "site bom ou ruim"

A pesquisa convergiu num modelo de **três camadas, da mais barata para a mais cara**. A regra do
projeto — _determinístico primeiro, IA depois_ — cai como uma luva aqui.

```
                       custo↑   precisão "humana"↑
  Camada 1            Camada 2                 Camada 3
 ┌───────────────┐   ┌────────────────────┐   ┌─────────────────────────┐
 │ Heurísticas   │   │ Ferramentas        │   │ Avaliação de DESIGN     │
 │ próprias      │ → │ determinísticas    │ → │ por IA (visão)          │
 │ httpx + BS4   │   │ Lighthouse, axe,   │   │ screenshot → rubrica    │
 │               │   │ headers de seg.    │   │ JSON (Claude/GPT/Gemini)│
 ├───────────────┤   ├────────────────────┤   ├─────────────────────────┤
 │ ~0 ms, grátis │   │ segundos, grátis   │   │ chamada de API, custo   │
 │ offline       │   │ local (precisa     │   │ não-determinístico      │
 │ pega 70–80%   │   │ Node + Chromium)   │   │ pega "amador/datado"    │
 │ dos ruins     │   │ nota "de mercado"  │   │ que nada mais vê        │
 └───────────────┘   └────────────────────┘   └─────────────────────────┘
        v1 (começa aqui)      v1 (destino)              v2 (opcional)
```

1. **Heurísticas próprias (HTTP + HTML)** — `httpx` + `BeautifulSoup`. Detectam o óbvio: sem
   HTTPS, sem `viewport` (não responsivo), sem telefone/WhatsApp, sem `<title>`/meta description,
   site abandonado (ano no rodapé), tecnologia obsoleta. **Custo zero, milissegundos.**
2. **Ferramentas determinísticas de mercado** — Lighthouse (performance/SEO/a11y/boas práticas),
   axe-core/Pa11y (acessibilidade), checagem de cabeçalhos de segurança/SSL. Grátis e locais, mas
   pesam (precisam de Node + Chromium headless). Dão a **nota reconhecível** ("Lighthouse 34/100").
3. **Avaliação de design por IA** — screenshot (desktop + mobile) → modelo de visão devolve uma
   **rubrica estruturada** (profissionalismo, modernidade, confiança, mobile...). É a única camada
   que percebe "parece de 2010" e a **única que custa dinheiro**. Plugável e desligada por padrão.

---

## 3. Estruturas possíveis (alternativas de arquitetura)

Três arquiteturas, com prós/contras. (Detalhe completo na §8 do
[dossiê](auditor-benchmark-pesquisa.md).)

### Alternativa A — Python puro, sem Node
Só `httpx` + `BeautifulSoup` + Playwright (Python) + checagens próprias de SSL/headers/SEO/checklist.
Sem Lighthouse, sem `npm`.
- **Prós:** zero dependência Node; um só venv; rápido; trivial de empacotar; 100% offline/grátis;
  ótimo para varrer **muitos** sites.
- **Contras:** reinventa parte do Lighthouse; sem nota de performance "de mercado"; a11y fraca.
- **Quando:** **v1 de triagem em massa** — "este site é claramente ruim?".

### Alternativa B — Híbrido: Python orquestra + Lighthouse/axe via subprocess ✅ (recomendada)
Núcleo da Alt. A **+** Lighthouse e axe-core/Pa11y chamados por `subprocess` (saída JSON), só nos
sites que passam pela triagem barata.
- **Prós:** nota **reconhecida pelo mercado** (ótima no pitch); reaproveita ferramentas maduras;
  a11y séria via axe-core; ainda 100% grátis/local.
- **Contras:** precisa de Node + Chromium; dois mundos (Python + Node); mais lento por site.
- **Quando:** **destino da v1** — triagem barata em todos, Lighthouse/axe só nos candidatos.

### Alternativa C — Híbrido + Visão IA (v2)
Alt. B **+** camada de design por IA (rubrica estruturada) e, opcionalmente, a PageSpeed Insights
API para Core Web Vitals de campo.
- **Prós:** captura "amador/datado/sem confiança"; gera o **discurso de venda** pronto; nota muito
  mais fiel.
- **Contras:** **custo de API**; não-determinística (variância); exige cache e foco em leads quentes.
- **Quando:** **v2** — ligada só para quem vai virar proposta.

### Comparação

| | Alt. A (Python puro) | Alt. B (Híbrido) ✅ | Alt. C (Híbrido + IA) |
|---|---|---|---|
| Custo | Zero | Zero | API (visão) + cota PSI |
| Determinístico | Total | Total | Parcial |
| Nota "de mercado" | Não | Sim (Lighthouse) | Sim + percepção |
| Escala (muitos sites) | Excelente | Boa (com triagem) | Limitada (cara) |
| Esforço | Baixo | Médio | Médio-alto |
| Fase | v1 inicial | v1 final | v2 |

> **Veredito:** **começar pela Alt. A** (entrega valor em dias, zero infra) e ter a **Alt. B como
> destino da v1**. A visão da **Alt. C** entra na v2, atrás de uma interface plugável desligada por
> padrão. Mantém-se a filosofia do projeto: grátis primeiro, IA onde agrega.

---

## 4. Pipeline conceitual do Auditor

Comum às três alternativas — o que muda é _quais_ etapas estão ligadas.

```
 entrada: 1 negócio do Scout (com site próprio) + setor
    │
    ▼
 [1] Fetch leve (httpx) ......... status, tempo, headers, HTML, robots/sitemap, SSL
    │
    ▼
 [2] Heurísticas (BeautifulSoup)  título/meta, viewport, contato, JSON-LD, ano, etc.   ← Camada 1
    │        │
    │        └── triagem barata: "claramente ruim"? grava nota parcial e segue ou para
    ▼
 [3] Render + screenshot (Playwright) ... desktop + mobile; detecta site "JS-only"
    │
    ▼
 [4] Ferramentas (subprocess) ... Lighthouse JSON · axe/Pa11y · security headers       ← Camada 2
    │
    ▼
 [5] Checklist por setor ........ cobertura dos itens esperados (Benchmark)
    │
    ▼
 [6] (opcional) Visão IA ........ screenshot → rubrica JSON                              ← Camada 3
    │
    ▼
 [7] Scorer ..................... combina sinais → NOTA 0–100 + lista de gaps + relatório
```

O **Benchmark** alimenta os passos **[5]** (itens esperados do setor) e **[7]** (pesos por setor).

---

## 5. Estrutura de código proposta (plugável, no padrão do projeto)

Seguindo as convenções já firmadas (ABCs plugáveis como em `sources/`/`enrichers/`, determinístico
primeiro, service layer compartilhado), uma proposta de layout:

```
src/fabrica_sites/agents/
├── benchmark/
│   ├── data/                     # ← o Benchmark é DADO versionado, não código
│   │   ├── base.yaml             # itens comuns a todo negócio local
│   │   ├── alimentacao.yaml      # restaurante/bar/padaria: cardápio, delivery...
│   │   ├── beleza.yaml           # salão/barbearia: agendamento, portfólio...
│   │   ├── saude.yaml            # clínica/odonto: especialidades, convênios...
│   │   ├── turismo.yaml          # hotel/pousada: motor de reservas, fotos...
│   │   └── fitness.yaml          # academia: planos, modalidades, horários...
│   └── benchmark.py              # carrega o YAML do setor → checklist pontuável
└── auditor/
    ├── fetch.py                  # httpx: status, tempo, headers, SSL, robots/sitemap
    ├── heuristics.py             # BeautifulSoup: SEO, viewport, contato, JSON-LD, ano...
    ├── screenshot.py             # Playwright: render + print desktop/mobile
    ├── tools/                    # adaptadores p/ ferramentas externas (subprocess)
    │   ├── base.py               # ABC: AuditTool.run(url) -> dict
    │   ├── lighthouse.py         # subprocess lighthouse --output=json
    │   └── a11y.py               # axe-core via Playwright OU pa11y via subprocess
    ├── vision/                   # camada 3, plugável e DESLIGADA por padrão
    │   ├── base.py               # ABC: VisionScorer.score(screenshot, setor) -> dict
    │   ├── disabled.py           # no-op (default v1): devolve None
    │   └── claude.py             # implementação com Claude visão (v2)
    ├── scorer.py                 # combina todos os sinais → nota 0–100 + gaps
    ├── reporter.py               # relatório HTML por site (e material de pitch)
    └── auditor.py                # orquestra o pipeline (passos 1–7)
```

> **Princípios herdados do Scout:** (1) **tudo plugável** — novas ferramentas implementam a ABC em
> `tools/base.py`; novos avaliadores de visão, a ABC em `vision/base.py`. (2) **Determinístico
> primeiro** — `heuristics.py` e `tools/` não usam LLM; só `vision/claude.py` usa. (3) **Uma fonte
> da verdade** — CLI e API chamarão o mesmo `auditor_service` (a criar), como já é com o Scout.

### Por que o Benchmark é dado (YAML), não código
Cada item do checklist é uma linha: um **rótulo**, um **peso** e um **sinal detectável**
(regex/seletor/heurística, ou uma pergunta para a IA quando regex não basta). Guardar como YAML
versionado deixa o Hector **editar a régua sem programar**, e permite versionar/auditar mudanças de
critério. Esboço de um item:

```yaml
# beleza.yaml (trecho)
setor: beleza
herda: base
itens:
  - id: agendamento_online
    rotulo: "Agendamento online"
    peso: 3
    sinal:
      tipo: texto_ou_link        # heurística determinística
      padroes: ["agendar", "agende", "booksy", "simplybook"]
  - id: portfolio
    rotulo: "Portfólio / galeria de trabalhos"
    peso: 2
    sinal:
      tipo: ia                   # cai para a camada de visão/texto quando ligada
      pergunta: "O site mostra fotos de trabalhos (antes/depois, cortes)?"
```

---

## 6. Como a nota 0–100 se forma

Os "website graders" do mercado (HubSpot, Web.dev, Observatory) convergem em ~5 dimensões. Adotamos
essas e somamos **duas que nos diferenciam**:

1. Performance / velocidade  •  2. Mobile / responsivo  •  3. SEO técnico  •
4. Segurança / HTTPS  •  5. Acessibilidade  •  **6. Conteúdo de negócio por setor** (Benchmark) •
**7. Qualidade visual / percepção** (camada de IA — v2).

> **Regra de composição (proposta):** cada dimensão produz 0–100; a **nota final** é a média
> ponderada, com **pesos que variam por setor** (vêm do Benchmark). Itens "matadores" (site fora do
> ar, sem HTTPS, sem `viewport`) aplicam penalidade forte. Na **v1** a dimensão 7 fica de fora (ou
> aproximada por heurísticas leves); na **v2** entra a nota de visão. O resultado nunca é só um
> número: vem com a **lista de gaps** ("sem WhatsApp", "Lighthouse 30", "design ~2012") — é isso que
> vira argumento de venda.

A nota será **explicável**, no mesmo espírito do `score` do Scout (que já guarda `score_motivos`).

---

## 7. Reaproveitamento (não reinventar a roda)

Da pesquisa, o que dá para copiar/reusar — tudo grátis e open source:

- **web-check (Lissy93, MIT)** — praticamente um "Auditor de infra/segurança" pronto: SSL, DNS,
  headers, tecnologia, **screenshot**. Ótima referência de lógica de checagens.
- **site-audit-seo** e **OSAT/seo-audits-toolkit** (este em Python) — referência de _quais campos
  coletar_ por página.
- **Lighthouse** (Apache-2.0) — espinha dorsal determinística (via subprocess).
- **axe-core** (MPL-2.0) / **Pa11y** (LGPL) — acessibilidade séria.
- **Base de fingerprints do Wappalyzer** (open source) — detectar "é um Wix antigo / WordPress"
  para o pitch.

> **Dúvida em aberto registrada:** confirmar a licença exata do OSAT e dos forks `python-Wappalyzer`
> antes de adotar como dependência (alguns podem ser GPL/incompatíveis com uso fechado).

---

## 8. Plano em fases (sugerido)

Mantendo o estilo do projeto — começar grátis, evoluir em fases, testar de verdade:

- **Fase 2 — Benchmark (régua).** Escrever os YAMLs base + 5 setores prioritários (alimentação,
  beleza, saúde, turismo, fitness). Sem código de IA. Entregável: régua versionada + um pequeno
  carregador (`benchmark.py`) com testes.
- **Fase 3a — Auditor v1 (Alt. A, Python puro).** `fetch` + `heuristics` + `scorer` + checklist do
  Benchmark, gerando nota 0–100 + gaps + relatório HTML. 100% grátis/offline. Rodar em alguns sites
  reais de Guarujá e validar contra julgamento humano (teste A/B de critérios).
- **Fase 3b — Auditor v1 final (Alt. B).** Acrescentar `screenshot` (Playwright) + Lighthouse/axe
  via subprocess nos candidatos. Nota "de mercado" no pitch. Decidir o venv (provável 3.12, junto
  com o resto das fases 2+; ver [Decisões](decisoes.md) D3).
- **Fase 3c — Auditor v2 (Alt. C).** Plugar `vision/claude.py` (rubrica JSON, desktop+mobile),
  desligado por padrão, ligado só para leads quentes. Avaliar PSI API para CWV de campo.

> **Dependência do frontend:** o painel de leads já foi preparado para receber a nota e o resumo do
> Auditor — ver o bloco "resumo da empresa" e os campos opcionais no painel
> ([visão 360 do lead](frontend.md)). Quando o Auditor existir, a nota do site entra ali sem
> retrabalho de UI.

---

## 9. Decisões tomadas e dúvidas resolvidas nesta sessão

Como o Hector pediu, registro aqui o "tive uma dúvida, decidi X, por quê":

- **Dúvida:** começar pelo Auditor com Lighthouse (nota de mercado) ou por heurísticas próprias?
  **Decisão:** heurísticas próprias primeiro (Alt. A), Lighthouse depois (Alt. B). **Por quê:**
  entrega valor em dias sem infra Node/Chromium, escala para muitos sites e segue "determinístico
  primeiro". Lighthouse vira reforço de pitch, não pré-requisito. → ADR **D20**.
- **Dúvida:** Benchmark como código ou como dados? **Decisão:** dados versionados (YAML/JSON).
  **Por quê:** o Hector edita a régua sem programar; versionável e auditável; o código só interpreta.
  → ADR **D21**.
- **Dúvida:** colocar a avaliação visual por IA já na v1? **Decisão:** não — deixar plugável e
  desligada (`VisionScorer` → `disabled` por padrão), ligar na v2 só para leads quentes. **Por quê:**
  é a única camada paga e não-determinística; o projeto começa grátis e só paga quando o ganho é claro.
- **Dúvida:** Benchmark e Auditor são um agente ou dois? **Decisão:** dois módulos separados que
  trabalham em par. **Por quê:** ciclos de vida diferentes (régua = dado lento; auditor = código que
  roda sempre).
- **Dúvida (em aberto):** licença de OSAT e `python-Wappalyzer`. **Encaminhamento:** verificar antes
  de adotar; não bloqueia a v1 (que não depende deles).

---

## 10. Próximos passos imediatos

1. Validar este plano com o Hector (especialmente a ordem das fases e o escopo da v1).
2. Escrever os YAMLs do Benchmark (base + 5 setores) — é o trabalho que **não precisa de código**.
3. Montar o esqueleto `agents/auditor/` (ABCs + `fetch` + `heuristics`) com testes, ainda em Python
   puro (Alt. A), e rodar contra 5–10 sites reais de Guarujá para calibrar pesos.

> **Status:** planejamento concluído (jun/2026). Implementação ainda **não** começou — esta página é
> a base acordada para a Fase 2/3. Ver também o [Roadmap](roadmap.md).
