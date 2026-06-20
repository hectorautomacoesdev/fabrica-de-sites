# Arquitetura & integração ao Scout

Como encaixar a fonte CNPJ no projeto **sem virar um monstro**: separar responsabilidades em
"serviços" com papéis claros, integrar ao Scout pelo padrão de plugins que já existe, e tratar o
ponto delicado — **deduplicar** o que vem de duas fontes. No fim, um resumo dos **projetos de
referência** que estudamos.

> **▣ Princípio** — começamos como um **monólito modular** (módulos separados no mesmo
> projeto), não como microsserviços de verdade. Separar em serviços distribuídos só quando
> houver **necessidade real** (volume, times, escala). Não pague a complexidade antes da hora.

## Por que separar o ETL da consulta

Há dois ritmos muito diferentes no problema:

- **ETL (pesado, raro):** baixar gigabytes e filtrar roda **uma vez por mês**, pode levar
  minutos, e não pode travar o resto.
- **Consulta (leve, frequente):** o Scout e a API leem os leads **o tempo todo**, e precisam
  ser **rápidos**.

A solução é **desacoplar** os dois por um **artefato local**: o ETL produz um arquivo enxuto
(`cnpj_guaruja.parquet`), e o Scout só **lê** esse arquivo. O trabalho pesado nunca entra no
caminho da consulta.

```text
┌─ SERVIÇO DE INGESTÃO (batch mensal) ──────────────────────────┐
│ baixar (httpx paralelo) → filtrar Guarujá (DuckDB) →          │
│ juntar nome (Empresas) → marcar ativos → exportar Parquet     │
└───────────────────────────────┬───────────────────────────────┘
                                 ▼  artefato local (pequeno)
                        cnpj_guaruja.parquet  (~24 mil ativos, com contato)
                                 ▼
┌─ SCOUT (consulta, sempre que roda) ───────────────────────────┐
│ CnpjReceitaSource ─┐                                           │
│ OverpassSource ────┼─▶ Dedup ─▶ Classifier ─▶ Scorer ─▶ ...   │
│ Serper (opcional) ─┘                                           │
└───────────────────────────────┬───────────────────────────────┘
                                 ▼
                          API (FastAPI) ─▶ Frontend (React)
```

> **ℹ "Serviços conversando"** — por enquanto, o "diálogo" entre ingestão e consulta é só um
> **arquivo** que um escreve e o outro lê. É a forma mais simples e robusta. Se um dia
> precisarmos de tempo real ou escala, esse arquivo vira um **banco** (Postgres) ou uma **fila
> + worker** — caminho já desenhado em [Escalando para a nuvem](escala-nuvem.md).

## Integração no Scout: um plugin, sem mexer no pipeline

O Scout já tem um padrão para fontes: a classe-base **`BusinessSource`** (ABC). Cada fonte nova
implementa esse contrato e **entra no pipeline sem alterar as etapas** (é o mesmo padrão de
`OverpassSource` e `SerperSource`). A fonte CNPJ vira só mais um plugin:

```python
class CnpjReceitaSource(BusinessSource):
    """Lê cnpj_guaruja.parquet e emite negócios (com telefone, e-mail, CNAE→setor)."""
    def fetch(self, cidade: str) -> list[RawPlace]:
        # lê o Parquet, mapeia cada linha para o formato do Scout
        ...
```

O mapeamento **CNAE → setor** já foi prototipado (`scripts/cnae_setor.py`), alinhado aos
setores do Scout. Classifier, Scorer e Insighter **não mudam** — recebem os negócios da nova
fonte como recebem os do OSM.

## O ponto delicado: deduplicação (CNPJ × OSM)

O mesmo restaurante pode aparecer **no OSM e no CNPJ**. Sem cuidado, ele vira **dois leads**. É
o trabalho central da integração. Estratégia, da chave mais forte para a mais fraca:

| Chave | Confiança | Observação |
|---|---|---|
| **CNPJ** | altíssima | ideal, mas o OSM raramente traz CNPJ |
| **Telefone normalizado** | alta | só dígitos, com DDD; bate os dois lados |
| **Nome + endereço** (Jaccard) | média | estende o dedup por similaridade que **já existe** no Scout |

A recomendação: combinar telefone (quando houver) com o **Jaccard de nome** que o Scout já usa
(limiar 0,45), tratando o CNPJ como chave forte quando presente. O OSM contribui o **sinal de
site**; o CNPJ contribui **contato + volume**; o dedup funde os dois num lead só.

## Arquitetura de API para manter a velocidade

A chave da velocidade já está no desenho: **o trabalho pesado é pré-computado** (batch mensal),
então a API só serve um conjunto **pequeno e indexado**. Boas práticas que se somam:

- **Paginação + filtros no banco** (já feito na API atual: `setor`, `score_min`, `org_tipo`…).
- **Assíncrono para tarefas longas:** se algum dia o scout rodar sob demanda via HTTP, usar
  **fila + worker** (não segurar a requisição) — ver [Escalando para a nuvem](escala-nuvem.md).
- **Cache de enriquecimento:** se buscarmos frescor de um CNPJ numa API externa (ex.: BrasilAPI),
  **cachear** o resultado (a base muda devagar) e respeitar *rate limits*.

Ou seja: a API fica rápida **porque** a arquitetura empurrou o custo para o batch offline. É o
mesmo princípio do gargalo da página de [ETL & ferramentas](cnpj-etl-ferramentas.md):
otimize tirando o trabalho pesado do caminho crítico.

## Projetos de referência (o que estudamos)

Não inventamos a roda: há projetos maduros que processam essa base. Resumo do que cada um
**trata, usa e resolve** — e o que aproveitamos de cada:

### `cuducos/minha-receita` — a referência "padrão-ouro"
- **O que é:** uma **API web** (em **Go**) para consultar dados de um CNPJ. 1,6 mil estrelas.
- **O que faz:** baixa os dados da RFB **+ um arquivo do Tesouro Nacional** (para mapear o
  código de município da RF ↔ **IBGE**), transforma e serve por HTTP (JSON por CNPJ).
- **O que aproveitamos:** a solução do **código RF ↔ IBGE** (a dor de cabeça da nossa coluna 21)
  e o desenho de "consulta por CNPJ".
- **Nota:** arquivado em jan/2026; migrou para `codeberg.org/cuducos/minha-receita`.

### `caiopizzol/cnpj-data-pipeline` — a rotina mais atual
- **O que é:** pipeline **ETL em Python 3.11+** que carrega a base em **PostgreSQL** (ou Parquet).
- **O que usa:** módulos `downloader` (**WebDAV/Nextcloud** — já no formato pós-jan/2026),
  `processor`, `database`, `parquet_writer`; **pandas/NumPy** em **lotes de 500 mil linhas**;
  *workers* paralelos.
- **O que resolve:** download no formato novo, processamento em lote (sem estourar RAM),
  estratégias de carga **`upsert`** (incremental) vs **`replace`** (recarga total), export
  Parquet (ZSTD).
- **O que aproveitamos:** **foi onde confirmei o mecanismo WebDAV novo**; ideias de batching,
  paralelismo e Parquet.

### `rictom/cnpj-sqlite` — o caminho simples
- **O que é:** script **Python** que converte a base para **SQLite** (~30 GB), em **1,5–2 h**.
- **O que usa:** `pandas` + `dask` + `sqlalchemy` + `wget`.
- **O que resolve:** quem quer a base inteira **localmente** num arquivo SQLite, sem subir
  Postgres. Atualizado em **março/2026** para o caminho novo.
- **O que aproveitamos:** referência de requisitos de disco/tempo e de SQLite como alvo simples.

> **Outras referências** — `aphonsoar/...` e `libercapital/...` (ETLs para banco relacional);
> APIs por-CNPJ para **enriquecer** (não descobrir): **BrasilAPI** (`/api/cnpj/v1/{cnpj}`),
> ReceitaWS, CNPJá. Documentação das ferramentas: **DuckDB** (<https://duckdb.org/docs/>),
> **Polars** (<https://docs.pola.rs/>).

## Em uma frase

Um **serviço de ingestão** mensal transforma gigabytes brutos num **arquivo enxuto**; o Scout o
lê como **mais uma fonte** (plugin), funde com o OSM por **dedup**, e a API serve tudo rápido —
porque o peso ficou no batch. Simples agora, pronto para escalar quando (e se) precisar.
