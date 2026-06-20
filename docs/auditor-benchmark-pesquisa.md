# Dossiê de Pesquisa — Agentes Benchmark + Auditor (Fábrica de Sites)

> Pesquisa técnica para planejar dois agentes do projeto "Fábrica de Sites":
> **Benchmark** (define o que é um "site bom" por setor) e **Auditor** (visita o site, roda
> checagens, tira screenshot, compara com o Benchmark e dá nota 0–100 + lista de problemas).
> Foco: determinístico-primeiro, começar de graça, Python ≥3.11, tudo plugável.
>
> Data da pesquisa: 2026-06-20. Números de estrelas do GitHub são **aproximados** (variam dia a dia).

---

## 1. Panorama (resumo executivo)

A boa notícia: praticamente **tudo o que o Auditor precisa para a v1 já existe, é grátis e roda
offline/local**. A questão "este site é bom ou ruim?" se decompõe em três camadas, da mais barata
para a mais cara:

1. **Heurísticas próprias (HTTP + HTML)** — feitas com `httpx` + `BeautifulSoup`, custo ~zero,
   milissegundos por site, sem dependência externa. Pegam 70–80% dos "sites ruins óbvios" (sem
   HTTPS, sem viewport/responsivo, sem telefone/WhatsApp, sem título/meta description, site
   abandonado, tecnologia obsoleta). **É aqui que a v1 deve começar.**

2. **Ferramentas determinísticas padrão de mercado** — Lighthouse (performance/SEO/a11y/best
   practices), axe-core/Pa11y (acessibilidade), checagem de cabeçalhos de segurança/SSL, detecção
   de tecnologia. Quase todas são Node.js/CLI, integráveis via subprocess com saída JSON. Grátis e
   locais. Pesam mais (precisam de um browser Chromium headless via Playwright/Puppeteer), então
   entram numa segunda etapa do pipeline.

3. **Avaliação de design por IA com visão** — tirar screenshot (desktop + mobile) e pedir a um
   modelo multimodal (Claude/GPT-4o/Gemini) uma **rubrica estruturada** (JSON) de profissionalismo,
   modernidade, confiança, hierarquia visual, mobile. É a única camada que custa dinheiro/API e a
   única que captura o "parece amador/antigo" que nenhuma ferramenta determinística vê. Deve ser
   **opcional e plugável**, ligada só quando o ganho compensa (ex.: leads quentes).

O **Benchmark** é majoritariamente um problema de dados/configuração, não de código: um conjunto de
**checklists por setor** (restaurante, salão, clínica, hotel, academia...), cada item pontuável e
mapeável a um sinal que o Auditor consegue detectar (presença de "cardápio", botão de reserva,
WhatsApp, etc.). Recomenda-se guardá-lo como **YAML/JSON versionado** (determinístico, editável sem
código), e só usar LLM para *detectar* a presença de um item quando regex/seletor não bastar.

Recomendação central (detalhada na seção 8): **v1 100% determinística e grátis** (heurísticas
próprias + Lighthouse via subprocess + checagem de cabeçalhos), produzindo nota 0–100 ponderada por
setor; **v2 acrescenta a camada de visão por IA** como plugin opcional para refinar a nota de
"qualidade/percepção" e gerar o discurso de venda.

---

## 2. Ferramentas determinísticas (tabela)

| Ferramenta | Mede o quê | Grátis? | Roda local/offline? | Linguagem | Integração com Python |
|---|---|---|---|---|---|
| **Google Lighthouse** | Performance, SEO, Acessibilidade, Best Practices (e PWA), nota 0–100 por categoria | Sim (Apache-2.0) | Sim (precisa de Chromium headless) | Node.js / JS | `subprocess` → `lighthouse <url> --output=json --quiet --chrome-flags="--headless"`; ler o JSON |
| **Lighthouse CI (`@lhci/cli`)** | Mesmas categorias do Lighthouse, voltado a CI/orquestração e histórico/regressão | Sim (Apache-2.0) | Sim | Node.js | `subprocess`; útil para rodar em lote e armazenar resultados |
| **PageSpeed Insights API** | Lighthouse "as a service" + Core Web Vitals (LCP/INP/CLS) com dados de campo (CrUX) | Sim (cota grátis ~25k req/dia, sem cartão; precisa de API key) | **Não** (é nuvem do Google) | API HTTP | `requests`/`httpx` → `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...&key=...` |
| **web-vitals** (lib JS do Google) | Core Web Vitals reais no browser (LCP, INP, CLS, TTFB, FCP) | Sim (Apache-2.0) | Sim (roda no browser) | JS | Injetar via Playwright e coletar; mais relevante para RUM do que para auditoria pontual |
| **axe-core** (Deque) | Acessibilidade (WCAG): regras automatizadas; é o motor por trás de Lighthouse a11y, DevTools, etc. | Sim (MPL-2.0) | Sim | JS | Injetar `axe.min.js` numa página via Playwright (`page.evaluate`) e ler o JSON de violações |
| **Pa11y** | Acessibilidade via CLI; usa HTML CodeSniffer (padrão) ou axe-core (`--runner axe`) | Sim (LGPL-3.0) | Sim (Chromium headless) | Node.js | `subprocess` → `pa11y --reporter json <url>` |
| **pa11y-ci** | Pa11y para vários URLs em lote/CI | Sim (LGPL-3.0) | Sim | Node.js | `subprocess`; ler JSON agregado |
| **WAVE (WebAIM)** | Acessibilidade visual/relatório; tem API paga | Parcial (API é paga) | Não (serviço web) | Serviço/API | `requests` à API paga; **menos atraente** que axe/Pa11y por não ser grátis/local |
| **Mozilla HTTP Observatory** | Cabeçalhos de segurança HTTP (CSP, HSTS, X-Frame-Options...) → nota A+..F | Sim (open source, MPL) | Sim (tem CLI/lib própria) ou via API | Python (motor) | Tem pacote Python (`httpobs`) e/ou API; ou replicar regras com `httpx` lendo response headers |
| **testssl.sh** | TLS/SSL: protocolos, cifras, validade do certificado, falhas conhecidas | Sim (GPLv2) | Sim (script bash) | Bash/OpenSSL | `subprocess` → `testssl.sh --jsonfile out.json <host>`; em Windows roda via WSL/Git Bash |
| **Checagem de cabeçalhos "à mão"** | HTTPS, HSTS, CSP, X-Content-Type-Options, X-Frame-Options, redirect http→https | Sim | Sim | — | `httpx`/`requests` lendo `response.headers` e `response.url` (zero dependência) |
| **Wappalyzer (fingerprints)** | Detecção de tecnologia/CMS/frameworks/analytics | Cliente fechou em 2023; **base de fingerprints continua open source** | Sim (com a base) | JSON + libs | Usar a base de fingerprints num matcher Python, ou porta como `python-Wappalyzer` |
| **WhatWeb** | Detecção de tecnologia (1800+ plugins) | Sim (GPL) | Sim | Ruby | `subprocess` → `whatweb --log-json=out.json <url>` |
| **BuiltWith** | Detecção de tecnologia/stack | API paga (free limitado) | Não | API | `requests`; **não recomendado** por ser pago |
| **Yellow Lab Tools** | Performance + **qualidade de front-end** (peso de JS/CSS, complexidade do DOM, requests) | Sim (open source) | Sim (tem Docker) | Node.js | `subprocess`/HTTP ao serviço local; bom para "site pesado/mal feito" |
| **sitespeed.io** | Performance com browser real, Core Web Vitals, waterfall/HAR, vídeo de carregamento | Sim (MIT) | Sim | Node.js | `subprocess`; resultados em JSON/HTML; mais robusto, mais pesado |

**Notas práticas para o nosso caso:**
- A maior parte é **Node.js/CLI**. O padrão de integração é: instalar via `npm`, chamar por
  `subprocess` com saída `--output json` e parsear. Não há "lib Python nativa" para Lighthouse.
- **PSI API** é a forma de obter resultados Lighthouse **sem instalar Chromium** (Google roda), mas
  é nuvem e tem cota — bom para baixo volume; ruim para varrer milhares de sites do Scout.
- **testssl.sh** em Windows exige WSL/Git Bash; alternativa pura-Python é só ler o certificado via
  `ssl`/`cryptography` para validade/emissor, sem o teste profundo de cifras.

---

## 3. Projetos GitHub (avaliação de qualidade de site)

> ★ = estimativa aproximada (junho/2026). Verifique a página do repo para o número exato.

- **GoogleChrome/lighthouse** — <https://github.com/GoogleChrome/lighthouse> — ★ ~30.4k — Apache-2.0 — JS.
  Auditoria automatizada (performance, a11y, best practices, SEO). Saída JSON/HTML, roda headless via CLI.
  **Serve pra nós?** Sim — é a espinha dorsal determinística do Auditor (chamado por subprocess).

- **GoogleChrome/lighthouse-ci** — <https://github.com/GoogleChrome/lighthouse-ci> — ★ ~6.5k — Apache-2.0 — JS.
  Orquestra Lighthouse em CI, histórico e prevenção de regressão; servidor próprio opcional.
  **Serve pra nós?** Em parte — útil se quisermos histórico/lote; para 1 site pontual, o Lighthouse cru basta.

- **harlan-zw/unlighthouse** — <https://github.com/harlan-zw/unlighthouse> — ★ ~4.7k — MIT — JS.
  Roda Lighthouse em **todas as páginas** do site em paralelo (descobre URLs por sitemap/robots/links),
  UI moderna, amostragem inteligente. **Serve pra nós?** Sim, se quisermos auditar o site inteiro e não só a home;
  ótimo para sites multi-página. Para v1 (avaliar só a home) é overkill.

- **sitespeedio/sitespeed.io** — <https://github.com/sitespeedio/sitespeed.io> — ★ ~5.0k — MIT — JS.
  Performance com browser real, Core Web Vitals, waterfall, vídeo de carregamento; sem cadastro/serviço externo.
  **Serve pra nós?** Talvez na v2 — mais completo que Lighthouse em diagnóstico de perf, porém mais pesado.

- **Lissy93/web-check** (sundowndev é fork/mirror; o ativo é Lissy93) — <https://github.com/Lissy93/web-check> — ★ ~34k — MIT — TypeScript.
  Dashboard OSINT all-in-one: IP, SSL, DNS, headers, localização, cookies, redirects, stack de tecnologia,
  headers de segurança, TLS, HSTS, detecção de malware/phishing, **screenshot** e métricas de performance.
  **Serve pra nós?** Muito — é praticamente um "Auditor de infra/segurança" pronto e self-hostable; dá para
  reaproveitar a lógica de várias checagens (headers, SSL, tech, screenshot) mesmo sem usar a UI.

- **pa11y/pa11y** — <https://github.com/pa11y/pa11y> — ★ ~4.5k — LGPL-3.0 — JS.
  Teste de acessibilidade via CLI/Node; runner padrão HTML CodeSniffer, ou axe-core com `--runner axe`.
  **Serve pra nós?** Sim — caminho mais simples para um número de acessibilidade via subprocess + JSON.

- **dequelabs/axe-core** — <https://github.com/dequelabs/axe-core> — ★ ~6.5k — MPL-2.0 — JS.
  Motor de regras de acessibilidade (WCAG), embutível em qualquer página. **Serve pra nós?** Sim — injetar
  via Playwright dá controle fino e evita instalar Pa11y; é o "padrão da indústria" de a11y.

- **viasite/site-audit-seo** — <https://github.com/viasite/site-audit-seo> — ★ ~290 — MIT — JS.
  Crawler + Lighthouse por página; detecta SSL/mixed content, meta tags, dados estruturados, text ratio,
  tamanho do DOM; saída console/JSON/CSV/XLSX. **Serve pra nós?** Boa referência de **quais campos coletar**
  por página; podemos copiar a lista de checagens mesmo reimplementando em Python.

- **StanGirard/seo-audits-toolkit (OSAT)** — <https://github.com/StanGirard/seo-audits-toolkit> — ★ ~800 — Python (57%).
  App web que junta auditoria de SEO + segurança: Lighthouse, extração de metadados (headers, links, imagens,
  sitemap), auditoria de security headers, keywords e rank no Google. **Serve pra nós?** Sim como referência —
  é **um dos poucos em Python** e mostra como orquestrar Lighthouse + checagens de SEO/segurança no nosso stack.

- **YellowLabTools/YellowLabTools** — <https://github.com/YellowLabTools/YellowLabTools> — ★ ~1.5k — JS.
  Performance + qualidade de front-end (peso/execução de JS, complexidade de CSS, tamanho do DOM); tem Docker.
  **Serve pra nós?** Útil na v2 para detectar "site mal construído/pesado" que Lighthouse não detalha tanto.

- **python-Wappalyzer** (ports comunitários) — vários forks em <https://github.com/topics/wappalyzer> — Python.
  Usa a base de fingerprints (open source) do Wappalyzer para detectar tecnologias. **Serve pra nós?** Sim —
  forma pura-Python de detectar CMS/builder (Wix, WordPress, etc.), útil para o pitch ("seu site é um Wix antigo").

> **Busca no GitHub recomendada para continuar:** tópicos `site-audit`, `seo-audit`, `web-performance`,
> `accessibility`, `seo-analysis`; e queries `lighthouse python`, `website grader`, `web vitals python`.

---

## 4. Critérios usados por "website graders" comerciais

Resumo dos critérios que essas ferramentas usam para dar nota — útil para desenhar nosso ponderador.

**HubSpot Website Grader** (nota 0–100, é o mais conhecido). Quatro eixos:
- **Performance** — velocidade da página, tamanho da página, otimização (compressão, render-blocking, etc.).
- **Mobile** — responsividade, viewport configurado, fonte legível, tap targets (alvos de toque grandes o bastante).
- **SEO** — meta description presente, headings, permissão de indexação (robots/noindex), sitemap acessível,
  link text descritivo, conteúdo.
- **Security** — HTTPS/SSL presente e safe browsing.

**Padrão Lighthouse** (base de muitos graders) — quatro categorias com nota 0–100 cada:
Performance, Accessibility, Best Practices, SEO. É o "vocabulário comum" do mercado; adotar essas
categorias facilita comunicar a nota ao dono do negócio.

**Mozilla Observatory** — nota A+..F focada em **cabeçalhos de segurança** (CSP, HSTS, X-Frame-Options,
X-Content-Type-Options, referrer policy, cookies seguros). Bom modelo de "checklist pontuável → letra".

**Outros (Seobility, Dareboost/DebugBear, Web.dev/Measure)** — seguem a mesma família de critérios:
performance + SEO técnico (meta/headings/canonical/sitemap/robots/dados estruturados) + acessibilidade +
boas práticas/segurança. Web.dev/Measure é basicamente Lighthouse com UI.

**Conclusão para o ponderador do Auditor:** convergem em ~5 dimensões — (1) Performance/velocidade,
(2) Mobile/responsivo, (3) SEO técnico, (4) Segurança/HTTPS, (5) Acessibilidade. Nosso diferencial:
acrescentar (6) **Conteúdo de negócio por setor** (tem cardápio? agendamento? WhatsApp?) e
(7) **Qualidade visual/percepção** (camada de IA). São essas duas últimas que vendem o serviço.

---

## 5. Heurísticas determinísticas baratas (checklist acionável)

Tudo abaixo é detectável com `httpx`/`requests` + `BeautifulSoup` (e, quando precisar de render JS,
Playwright). Custo ~zero, sem API. Sugerido como **núcleo da v1**. Cada item vira um sinal booleano/
numérico pontuável.

**Disponibilidade e transporte**
- [ ] Site responde (HTTP 200) e em tempo razoável (medir `response.elapsed`; alerta se > 2–3 s).
- [ ] **HTTPS** funcionando; redireciona `http://` → `https://`.
- [ ] Certificado SSL válido e não expirado (ler via `ssl`/`cryptography`).
- [ ] Sem mixed content óbvio (recursos `http://` numa página `https://`).

**SEO técnico básico (no HTML)**
- [ ] `<title>` presente, não vazio, tamanho razoável (~10–60 chars).
- [ ] `<meta name="description">` presente e não vazia.
- [ ] Exatamente um `<h1>` (ou pelo menos um).
- [ ] `robots.txt` existe e não bloqueia tudo; `<meta name="robots">` não está `noindex`.
- [ ] `sitemap.xml` existe (ou referenciado no robots).
- [ ] `<link rel="canonical">` presente.
- [ ] **Open Graph** (`og:title`, `og:description`, `og:image`) — importante para compartilhamento.
- [ ] **Dados estruturados** schema.org (JSON-LD `<script type="application/ld+json">`), idealmente
      `LocalBusiness`/`Restaurant`/`Dentist` etc. (forte sinal de site bem feito e de local SEO).
- [ ] `<html lang="pt-BR">` definido.

**Mobile / responsivo**
- [ ] `<meta name="viewport" content="width=device-width...">` presente (sinal nº1 de responsivo).
- [ ] Sem `<table>` usada para layout; sem Flash/`<applet>`/`<object>` legados (tecnologia obsoleta).
- [ ] Sem largura fixa absurda no CSS inline (heurística fraca, opcional).

**Identidade e confiança visual leve**
- [ ] **Favicon** presente.
- [ ] Logo/imagem no topo (presença de `<img>` no header).
- [ ] HTTPS + sem avisos de navegador (cadeado).

**Conteúdo de negócio (o que vende!)**
- [ ] **Telefone** detectável (regex de telefone BR; link `tel:`).
- [ ] **WhatsApp** (link `wa.me`/`api.whatsapp.com` ou texto "WhatsApp").
- [ ] **Endereço** / localização (texto com CEP, "Rua/Av.", ou embed de Google Maps).
- [ ] **E-mail** de contato (`mailto:` ou regex).
- [ ] **Redes sociais** (links Instagram/Facebook).
- [ ] **Horário de funcionamento** (regex "seg a sex", "horário", "aberto").
- [ ] Botão/CTA claro (texto "Agendar", "Reservar", "Peça já", "Fale conosco").

**Sinais de site abandonado / amador**
- [ ] **Ano no rodapé** desatualizado (regex `© 20\d\d`; se < ano atual − 1, sinal de abandono).
- [ ] Página muito pequena/vazia (poucos bytes / pouco texto) → "site fantasma".
- [ ] Página muito pesada (HTML enorme, dezenas de scripts) → site mal construído.
- [ ] **Links quebrados** (amostra de links internos → checar status; muitos 404 = abandono).
- [ ] Construtor "datado" detectável (ex.: HTML gerado por ferramentas antigas, FrontPage, etc.).
- [ ] Tecnologia obsoleta (Flash, jQuery muito antigo, ausência total de CSS responsivo).

> **Pontuação sugerida:** agrupar em 5–7 dimensões, cada item com peso, normalizar para 0–100.
> Itens "matadores" (sem HTTPS, sem viewport, site fora do ar) podem ter penalidade alta. Pesos
> variam por setor (ver seção 7) — ex.: para restaurante, "tem cardápio" pesa muito; para clínica,
> "tem agendamento/convênios".

---

## 6. Avaliação de design por IA / visão (abordagens + rubrica/prompt)

**Por que entra:** nenhuma checagem determinística percebe "parece de 2008", "amador", "passa
desconfiança". Modelos de visão (Claude, GPT-4o, Gemini) avaliam o **screenshot** de forma holística.
A literatura (Sketch2Code, Design2Code, "MLLM as a UI Judge", DesignProbe, UXBench) mostra que MLLMs
conseguem pontuar razoavelmente dimensões como **clareza, hierarquia visual, confiança, intuitividade**
(erro ~0,5 ponto em escala Likert), mas erram detalhes finos e movimento/animação. Implicações práticas:

- **Escalas curtas (1–5) são mais confiáveis** que 1–100 para o julgamento bruto da IA; converta
  depois para 0–100. Dê **rubrica explícita** (o que é 1, o que é 5) para reduzir variância.
- **Comparação par-a-par** (este site vs. referência do setor) tende a ser mais consistente que nota
  absoluta — útil quando o Benchmark tiver sites-referência por setor.
- **Sempre exigir saída JSON estruturada** (rubrica fixa) para o resultado ser somável/auditável.
- Tirar **2 screenshots**: desktop e mobile (Playwright com viewports diferentes). Mobile é onde os
  sites ruins mais quebram.
- Pedir **evidências/justificativa curta por critério** (ajuda no pitch de venda e reduz alucinação).

### Dimensões recomendadas para a rubrica visual
1. **Profissionalismo / credibilidade** (parece confiável vs. amador/golpe?)
2. **Modernidade** (design atual vs. datado — ano percebido)
3. **Hierarquia visual & legibilidade** (foco claro, contraste, tipografia, espaçamento)
4. **Identidade de marca** (logo, paleta coerente, fotos de qualidade vs. genéricas/pixeladas)
5. **Mobile / responsividade aparente** (no screenshot mobile)
6. **Clareza de CTA & proposta de valor** (sei o que é o negócio e o que fazer em 5 s?)
7. **Densidade/poluição** (limpo vs. carregado/desorganizado)

### Exemplo de prompt (rubrica estruturada, PT-BR)

```
Você é um avaliador sênior de design web. Avalie o site no screenshot abaixo
(setor: {setor}). Seja crítico e objetivo, do ponto de vista de um cliente local
decidindo se confia neste negócio.

Para cada critério, dê nota inteira de 1 a 5 (1=péssimo, 3=aceitável, 5=excelente)
e uma justificativa de no máximo 1 frase apontando evidência visual.

Critérios:
- profissionalismo
- modernidade
- hierarquia_legibilidade
- identidade_marca
- mobile_aparente
- clareza_cta
- limpeza_organizacao

Responda APENAS com JSON válido neste formato:
{
  "criterios": {
    "profissionalismo": {"nota": <1-5>, "evidencia": "<texto>"},
    ...
  },
  "ano_percebido": "<estimativa de quão atual o design parece, ex: '~2012'>",
  "veredito": "<bom|mediano|ruim>",
  "principais_problemas": ["<até 3 problemas mais graves>"],
  "nota_visual_0a100": <média ponderada convertida para 0-100>
}
```

> **Custo/plug:** essa camada é a única paga. Mantê-la atrás de uma interface plugável (um
> `VisionScorer` com implementações: `ClaudeVision`, `OpenAIVision`, `Disabled`). Na v1 fica
> desligada (a nota visual vem só de heurísticas leves); na v2 liga-se para leads priorizados.
> Modelos "menores/baratos" com visão (ex.: tiers Haiku/4o-mini/Flash) costumam bastar para
> triagem; reservar o modelo forte para os casos que vão virar proposta.

---

## 7. Benchmark por setor (checklists pontuáveis)

Estrutura sugerida: cada setor = lista de **itens esperados**, cada item com **peso** e um **sinal
detectável** (regex/seletor/heurística, ou pergunta para a IA quando não der para regex). Itens comuns
a todos (HTTPS, responsivo, contato, mapa, redes sociais, velocidade) ficam num bloco "base"; abaixo
listo só o **específico de cada setor**. Guardar como YAML/JSON versionado.

### Base (todo negócio local)
HTTPS · responsivo (viewport) · telefone clicável · WhatsApp · endereço + Google Maps · horário de
funcionamento · e-mail/contato · Instagram/Facebook · favicon + logo · título + meta description ·
Open Graph · JSON-LD `LocalBusiness` · carrega < 3 s · CTA claro · fotos próprias (não stock genérico).

### Restaurante / lanchonete / bar
- [ ] **Cardápio na própria página** (não PDF), idealmente com fotos e preços — *peso alto*
- [ ] **Delivery / pedido online** (iFood, Goomer, link próprio) — *peso alto*
- [ ] **Reserva de mesa** (quando aplicável)
- [ ] Horário por dia da semana
- [ ] Localização + Google Maps + estacionamento
- [ ] Galeria de fotos (ambiente + pratos reais)
- [ ] JSON-LD `Restaurant`/`Menu`
- [ ] Telefone/WhatsApp para pedidos

### Salão de beleza / barbearia / estética
- [ ] **Agendamento online** (próprio ou link tipo Booksy/SimplyBook) — *peso alto*
- [ ] **Lista de serviços com preços** (organizada por categoria) — *peso alto*
- [ ] **Portfólio / galeria** (antes-depois, trabalhos) — *peso alto*
- [ ] WhatsApp para agendar (muito usado no setor)
- [ ] Equipe/profissionais
- [ ] Avaliações/depoimentos
- [ ] Localização + horário

### Clínica médica / odontológica / consultório
- [ ] **Especialidades / serviços** detalhados — *peso alto*
- [ ] **Agendamento online** ou WhatsApp de marcação — *peso alto*
- [ ] **Convênios aceitos** — *peso alto*
- [ ] Equipe (médicos/dentistas, CRM/CRO, credibilidade)
- [ ] Endereço + mapa + acessibilidade do local
- [ ] Horário de atendimento
- [ ] Confiança/segurança (LGPD, dados do paciente) — sinal de seriedade
- [ ] JSON-LD `MedicalBusiness`/`Dentist`

### Hotel / pousada
- [ ] **Motor de reservas / disponibilidade** (próprio ou booking engine) — *peso alto*
- [ ] **Galeria de fotos de qualidade** (quartos, áreas comuns) — *peso alto*
- [ ] **Lista de quartos com fotos, descrição e preço** — *peso alto*
- [ ] Comodidades (wi-fi, café, piscina, estacionamento, pet...)
- [ ] Localização + mapa + "como chegar" + atrações próximas
- [ ] Avaliações (TripAdvisor/Google/Booking)
- [ ] Multi-idioma (turismo) — diferencial
- [ ] Política de cancelamento / check-in-out

### Academia / estúdio fitness
- [ ] **Planos e preços** (mensal/trimestral/anual) — *peso alto*
- [ ] **Modalidades / aulas oferecidas** — *peso alto*
- [ ] **Grade de horários das aulas** — *peso alto*
- [ ] Matrícula/experimental online ou WhatsApp
- [ ] Estrutura/fotos (equipamentos, espaço)
- [ ] Localização + horário de funcionamento
- [ ] Avaliações/resultados de alunos

> **Como o Auditor usa isto:** carrega o checklist do setor do negócio (vindo do Scout), tenta
> detectar cada item por regex/seletor/heurística; itens "incertos" podem ir para a IA de visão/texto.
> A **nota final por setor** = nota base ponderada + cobertura do checklist específico + nota visual.

---

## 8. Recomendação de arquitetura (determinístico-primeiro)

Princípios fixos do projeto: **determinístico-primeiro**, **plugável**, **começar de graça**, Python
≥3.11, venv 3.12 para frameworks de agente (CrewAI/LangGraph), **Playwright** para visitar sites.

### Pipeline conceitual (comum às três alternativas)
1. **Fetch leve** (`httpx`): status, tempo, headers, HTML cru, robots/sitemap, SSL. → heurísticas (seção 5).
2. **Render + screenshot** (Playwright/Chromium headless): desktop + mobile; detecta JS-only e tira print.
3. **Ferramentas determinísticas** (subprocess): Lighthouse (JSON), axe-core/Pa11y (a11y), security headers.
4. **Checklist por setor** (seção 7): cobertura de itens esperados.
5. **(Opcional) Visão IA** (seção 6): nota de design a partir do screenshot.
6. **Scorer**: combina sinais → **nota 0–100** + lista de problemas/gaps → relatório (e pitch de venda).

O **Benchmark** alimenta os passos 4 e 6 (pesos por setor + sites-referência). Guardar como
**YAML/JSON versionado**; código apenas interpreta.

---

#### Alternativa A — "Tudo em Python puro, sem Node" (a mais barata e simples)
Só `httpx` + `BeautifulSoup` + Playwright (Python) + checagens próprias de SSL/headers/SEO/checklist.
Sem Lighthouse, sem npm.
- **Prós:** zero dependência Node; um único venv; rápido; trivial de empacotar; 100% offline/grátis;
  controle total da pontuação; ótimo para varrer **muitos** sites do Scout.
- **Contras:** reinventa parte do que Lighthouse já faz; sem nota de performance "padrão de mercado"
  reconhecível; acessibilidade fica fraca (sem axe-core, a não ser injetando o JS via Playwright).
- **Quando:** ideal para a **v1 de triagem em massa** ("este site é claramente ruim?").

#### Alternativa B — "Híbrido: Python orquestra + Lighthouse/axe via subprocess" (recomendada)
Núcleo Python (Alt. A) **+** Lighthouse e axe-core/Pa11y chamados por subprocess com saída JSON, só
nos sites que passam pela triagem barata.
- **Prós:** nota de performance/SEO/a11y **reconhecida pelo mercado** (bom no pitch: "Lighthouse deu
  34/100"); reaproveita ferramentas maduras; acessibilidade séria via axe-core; ainda 100% grátis/local.
- **Contras:** precisa de Node + Chromium instalados; dois mundos (Python + Node); mais lento/pesado por
  site (não dá para rodar Lighthouse em milhares de sites instantaneamente).
- **Quando:** **v1 final** — rodar a triagem barata (Alt. A) em todos, e Lighthouse/axe só nos candidatos
  reais. Melhor custo-benefício e o que recomendo.

#### Alternativa C — "Híbrido + Visão IA" (a mais completa, v2)
Alternativa B **+** camada de design por IA (Claude/GPT-4o/Gemini visão) com rubrica estruturada, e
opcionalmente PSI API para Core Web Vitals de campo.
- **Prós:** captura "amador/datado/sem confiança" que nenhuma ferramenta vê; gera o **discurso de venda**
  pronto ("seu site parece de 2010, sem WhatsApp e nota Lighthouse 30"); nota de qualidade muito mais fiel.
- **Contras:** **custo de API** (visão) e cota/nuvem (PSI); não-determinístico (variância entre execuções);
  precisa de cache e de limitar a leads priorizados.
- **Quando:** **v2** — ligar a visão só para os negócios que vão virar proposta, mantendo-a como plugin
  desligável.

### Veredito
Adotar a **Alternativa B como destino da v1** e começar pela **Alternativa A** (entrega valor em dias,
zero infra). Plugar a **visão da Alternativa C** na v2, atrás de uma interface (`VisionScorer`) desligada
por padrão. Manter **Benchmark como dados (YAML/JSON) versionados**, não código. Reaproveitar a lógica de
checagens do **web-check (Lissy93)** e a lista de campos do **site-audit-seo**/**OSAT** como referência.

| | Alt. A (Python puro) | Alt. B (Híbrido) ✅ | Alt. C (Híbrido + IA) |
|---|---|---|---|
| Custo | Zero | Zero | API (visão) + cota PSI |
| Determinístico | Total | Total | Parcial |
| Nota "de mercado" | Não | Sim (Lighthouse) | Sim + percepção |
| Escala (muitos sites) | Excelente | Boa (com triagem) | Limitada (cara) |
| Esforço | Baixo | Médio | Médio-alto |
| Fase | v1 inicial | v1 final | v2 |

---

## 9. Fontes

**Ferramentas determinísticas**
- Lighthouse CI (docs): <https://googlechrome.github.io/lighthouse-ci/>
- Lighthouse (repo): <https://github.com/GoogleChrome/lighthouse>
- Lighthouse CI (repo): <https://github.com/GoogleChrome/lighthouse-ci>
- Performance monitoring with Lighthouse CI (web.dev): <https://web.dev/articles/lighthouse-ci>
- PageSpeed Insights API (exemplo Python, Unlighthouse): <https://unlighthouse.dev/learn-lighthouse/pagespeed-insights-api/python-example>
- PSI API (DebugBear): <https://www.debugbear.com/blog/pagespeed-insights-api>
- PSI API com Python (Daniel Heredia): <https://www.danielherediamejias.com/pagespeed-insights-api-with-python/>
- Acessibilidade Pa11y & axe-core (Ramotion): <https://www.ramotion.com/blog/practical-accessibility-testing-with-pa11y-and-axe-core/>
- Ferramentas open-source de a11y (QED42): <https://www.qed42.com/insights/4-opensource-accessibility-audit-tools-you-must-know>
- pa11y-ci + axe (CivicActions): <https://accessibility.civicactions.com/posts/automated-accessibility-testing-leveraging-github-actions-and-pa11y-ci-with-axe>
- Mozilla Observatory (TheSSLStore): <https://www.thesslstore.com/blog/mozilla-releases-observatory/>
- Guia de ferramentas de segurança open source (Medium/Ewan Mak): <https://medium.com/@tentenco/website-security-scanning-tools-a-practical-guide-to-15-free-and-open-source-options-b9f2f93408fe>
- WhatWeb & Wappalyzer (HackerTarget): <https://hackertarget.com/whatweb-scan/>
- Wappalyzer / BuiltWith (Pasquale Pillitteri): <https://pasqualepillitteri.it/en/news/2424/how-to-detect-website-tech-stack-wappalyzer-builtwith>
- Yellow Lab Tools: <https://yellowlab.tools/> · repo: <https://github.com/YellowLabTools/YellowLabTools>

**Projetos GitHub**
- web-check (Lissy93): <https://github.com/Lissy93/web-check>
- unlighthouse: <https://github.com/harlan-zw/unlighthouse> · docs: <https://unlighthouse.dev/>
- sitespeed.io: <https://github.com/sitespeedio/sitespeed.io>
- site-audit-seo (viasite): <https://github.com/viasite/site-audit-seo>
- seo-audits-toolkit / OSAT (StanGirard): <https://github.com/StanGirard/seo-audits-toolkit>
- pa11y: <https://github.com/pa11y/pa11y>
- Tópico GitHub site-audit: <https://github.com/topics/site-audit>
- Tópico GitHub seo-analysis: <https://github.com/topics/seo-analysis>

**Graders comerciais**
- HubSpot Website Grader (ProperExpression): <https://www.properexpression.com/growth-marketing-blog/hubspot-website-grader>
- HubSpot Website Grader (SyncMatters): <https://syncmatters.com/hubspot-website-grader>
- HubSpot Website Grader (RedPandas): <https://www.redpandas.com.au/blog/how-to-use-hubspots-website-grader-to-improve-your-seo/>
- Mozilla Observatory (Kau-Boys): <https://kau-boys.com/2937/web-server/checking-your-domain-security-with-mozilla-observatory>

**Avaliação de design por IA / visão (papers)**
- Sketch2Code (arXiv): <https://arxiv.org/html/2410.16232v1>
- Design2Code (ACL): <https://aclanthology.org/2025.naacl-long.199.pdf>
- MLLM as a UI Judge (arXiv): <https://arxiv.org/pdf/2510.08783>
- DesignProbe (arXiv): <https://arxiv.org/pdf/2404.14801>
- Reasoning for Mobile UX with MLLMs / UXBench (arXiv): <https://arxiv.org/html/2606.13192v1>
- LLMs em UI/UX, revisão sistemática (arXiv): <https://arxiv.org/pdf/2507.04469>

**Benchmarks por setor**
- Restaurante (Homebase): <https://www.joinhomebase.com/blog/restaurant-website>
- Restaurante (Chowly): <https://chowly.com/resources/blogs/restaurant-website-design-7-elements-of-a-high-converting-restaurant-website/>
- Restaurante best practices (ChowNow): <https://get.chownow.com/blog/restaurant-website-best-practices-and-examples/>
- Salão de beleza (Vezra): <https://vezra.co.uk/blog/beauty-salon-website-guide-2026>
- Salão de beleza, design (Ronkot): <https://www.ronkot.com/beauty-salon-website-design/>
- Clínica/odonto, agendamento (ProSites): <https://blog.prosites.com/online-booking-system/>
- Sites odontológicos (Delmain): <https://delmain.co/blog/best-dental-websites/>
- Hotel booking engine (Hotelogix): <https://blog.hotelogix.com/13-features-every-hotel-web-booking-engine-must-have/>
- Hotel booking engine (HotelMinder): <https://www.hotelminder.com/most-important-features-and-functionalities-of-a-hotel-booking-engine>
- Features de pequenos negócios (Lumin): <https://luminagency.com/essential-website-features-for-small-business/>
- Checklist pequenos negócios (Megaphone): <https://megaphonedesigns.com/the-essential-website-checklist-for-small-business-owners-in-2025/>
