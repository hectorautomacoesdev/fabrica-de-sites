# Fábrica de Sites — Sistema Multiagente

Sistema que **encontra negócios locais sem site (ou com site fraco)**, **gera sites** sob medida e **oferece aos donos**. Mercado-alvo inicial: Guarujá, SP.

> **Status:** Fase 1.5 (Base Sólida) **concluída** — o Scout virou um **app full-stack local**:
> CLI + API (FastAPI) + banco (SQLModel/SQLite) + painel React. Próxima: Agente Benchmark.
>
> 📚 **Documentação completa:** <https://hectorautomacoesdev.github.io/fabrica-de-sites/>
> · ▶️ Para rodar, veja [**Como rodar**](#como-rodar) abaixo.

## Como rodar

Há **duas formas de usar o Scout** — e elas são **independentes**:

### 1. Relatório rápido (CLI) — não precisa de servidor

Gera um **arquivo HTML estático** e abre no navegador. Grátis, sem chave de API, sem subir nada.

```powershell
.\.venv\Scripts\Activate.ps1      # ativa o ambiente (uma vez por terminal)
pip install -e .                  # instala o projeto (só na primeira vez)

fabrica scout run --cidade "Guarujá" --abrir
```

O `--abrir` abre o relatório (`file://…/relatorio_scout.html`) direto no navegador. É uma **"foto"** dos dados — não dá pra filtrar ao vivo. Outros comandos: `fabrica scout setores`, `fabrica scout stats`, `fabrica --help`.

### 2. App completo (painel web interativo) — precisa da API + frontend

O painel React **conversa ao vivo com a API**. São **dois processos**: a **API** (FastAPI, porta `8001`) e o **frontend** (Vite, porta `5173`). O front fala com a API por um proxy (`/api → :8001`).

**Jeito fácil (um comando sobe os dois):**

```powershell
.\start.ps1
```

O script instala o que faltar, abre a API e o frontend em janelas separadas e abre o navegador em <http://localhost:5173> sozinho. Para parar: feche as duas janelas.

**Jeito manual (dois terminais):**

```powershell
# Terminal 1 — API (backend).  Swagger em http://localhost:8001/docs
.\.venv\Scripts\uvicorn.exe fabrica_sites.api.app:app --reload --port 8001

# Terminal 2 — frontend (produto).  Abre em http://localhost:5173
cd frontend; npm install; npm run dev
```

> ⚠️ Se o app web disser **"suba a API"**, é porque o backend (porta `8001`) não está no ar. Rode o `start.ps1` ou o Terminal 1 acima.

### Qual a diferença?

| | `fabrica scout run --abrir` | App web (`localhost:5173`) |
|---|---|---|
| O que abre | Arquivo HTML estático (`file://`) | Site interativo ao vivo |
| Precisa da API (`:8001`)? | ❌ Não | ✅ Sim |
| Precisa do frontend (`:5173`)? | ❌ Não | ✅ Sim |
| Dá pra filtrar/rodar buscas na tela? | Não (é uma "foto") | Sim |
| Custo | Grátis | Grátis (roda local) |

Os dois usam **o mesmo motor** (`scout_service`) por baixo — muda só a "embalagem". A saída fica em `data/`: `fabrica.db` (banco SQLite) e `relatorio_scout.html` (relatório do modo CLI).

## Os 5 agentes

| # | Agente | Papel | Fase |
|---|--------|-------|------|
| 1 | **Scout** | Mapeia negócios da cidade, detecta quem não tem site, ranqueia oportunidade por setor | **1 (atual)** |
| 2 | **Benchmark** | Define diretrizes de "site bom" por setor | 2 |
| 3 | **Auditor** | Visita os sites existentes e pontua a qualidade | 3 |
| 4 | **Criador** | Gera o site e publica | 4 |
| 5 | **Prospector** | Entra em contato com o dono (WhatsApp/e-mail) | 5 |

## Documentação

📚 **Site publicado:** <https://hectorautomacoesdev.github.io/fabrica-de-sites/> — arquitetura, decisões técnicas (ADRs), bibliotecas, código e testes.

A doc tem **fonte única**: o conteúdo em Markdown vive na pasta [`docs/`](docs/) e é lido por dois renderizadores — o site **MkDocs** (acima) e um app **React** rico (`docs-app/`). Edita-se num lugar só e os dois atualizam. Detalhe em [Documentação de fonte única](docs/fonte-unica.md).

**Publicação automática (CI/CD).** A cada `git push` na `main`, o **GitHub Actions** ([`.github/workflows/docs.yml`](.github/workflows/docs.yml)) republica o site MkDocs no GitHub Pages **e** builda o app React — sem deploy manual.

**Rodar a documentação React localmente:**

```powershell
cd docs-app
npm install      # uma vez
npm run dev      # abre em http://localhost:5173
```

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
