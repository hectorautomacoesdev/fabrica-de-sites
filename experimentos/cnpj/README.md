# Sandbox — Fonte de dados CNPJ (Dados Abertos da RFB)

Ambiente **isolado** para estudar/prototipar o uso da base pública de CNPJ como nova fonte do
Scout. **Não toca em nada de `src/`** — venv próprio, dados gitignorados.

- 📄 **Leia primeiro:** [`RELATORIO.md`](RELATORIO.md) — o estudo completo (achados, A/B, ROI, arquitetura).
- ❓ **Decisões pendentes:** [`PERGUNTAS.md`](PERGUNTAS.md) — perguntas para o Hector.
- 🔬 Amostra real (anonimizada): [`resultados/amostra_guaruja.md`](resultados/amostra_guaruja.md).

## Conclusão em uma linha

A base de CNPJ é **gratuita** e resolve a fraqueza do OSM: de **~12% → ~90%** de contactabilidade
e de **513 → dezenas de milhares** de negócios em Guarujá. **Vale integrar** (como fonte
complementar ao OSM, via plugin `CnpjReceitaSource`).

## Estrutura

```
experimentos/cnpj/
├── README.md            ← este arquivo
├── RELATORIO.md         ← o estudo (entregável principal)
├── PERGUNTAS.md         ← perguntas para decidir junto
├── .gitignore           ← ignora dados/ e .venv/ (nunca versionar dados brutos)
├── scripts/
│   ├── 00_baixar.py     ← downloader WebDAV (stdlib, com retomada)
│   ├── 01_lookups.py    ← acha o código RF de Guarujá (6475) + mapa CNAE
│   ├── 02_benchmark.py  ← A/B/C: naive vs DuckDB vs Polars
│   ├── 03_analise.py    ← ROI: ativos, setores, cobertura de contato
│   ├── 04_validar.py    ← valida a extrapolação (compara 2 arquivos)
│   └── cnae_setor.py    ← mapa CNAE → setor do Scout (por prefixo)
├── dados/               ← zips/csvs baixados (GITIGNORADO)
└── resultados/          ← saídas (cnae_map.json, amostra, código de Guarujá)
```

## Como rodar

```powershell
# 1) criar o venv isolado e instalar deps
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install duckdb polars pyarrow

# 2) baixar lookups + 1 arquivo de estabelecimentos
.\.venv\Scripts\python.exe scripts\00_baixar.py --listar
.\.venv\Scripts\python.exe scripts\00_baixar.py Municipios.zip Cnaes.zip Estabelecimentos1.zip

# 3) rodar os experimentos na ordem
.\.venv\Scripts\python.exe scripts\01_lookups.py     # acha Guarujá = 6475
.\.venv\Scripts\python.exe scripts\02_benchmark.py   # A/B/C de performance
.\.venv\Scripts\python.exe scripts\03_analise.py     # ROI + amostra
.\.venv\Scripts\python.exe scripts\04_validar.py     # valida extrapolação (precisa Estabelecimentos5.zip)
```

## Resultados medidos (dump 2026-06, Guarujá/SP, código RF 6475)

- Download: **4,1 MB/s** (~20 min para os ~5 GB de Estabelecimentos).
- 1 arquivo (de 10): **7.414** estabelecimentos de Guarujá → **1.906 ativos**.
- Cobertura entre ativos: **88,9% telefone**, **80,8% e-mail**, **90,1% algum contato**.
- Extrapolado: **~20–24 mil ativos**, **~4,5–5,5 mil** em setores prioritários.
- Engine recomendada: **DuckDB** (lê latin-1 nativo; ~5× mais rápido que stdlib).
