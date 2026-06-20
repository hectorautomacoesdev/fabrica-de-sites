# ETL, Big Data & ferramentas (DuckDB, Polars, Rust/Zig)

Esta página é o "estudo de manipulação de dados" do projeto: **o que é ETL**, **por que dados
grandes exigem técnicas diferentes**, **quais ferramentas usamos** (e por quê), o que o
**benchmark** mostrou, e se vale a pena recorrer a **Rust/Zig** para ganhar velocidade.

> **▣ Resumo** — para filtrar ~17 GB de CSV não dá para "carregar tudo na memória". Usamos
> técnicas de **processamento em fluxo** e ferramentas **colunares e vetorizadas**. A campeã
> para o nosso caso é o **DuckDB** (lê latin-1 nativo, é rápido e usa pouca RAM); **Polars** é
> ótimo também, mas tropeça no encoding; **Python puro** (stdlib) é o plano B portável.

## O que é ETL

**ETL** = **E**xtract, **T**ransform, **L**oad — as três fases de mover dados de uma fonte
bruta para um formato útil:

```text
EXTRACT (extrair)        TRANSFORM (transformar)              LOAD (carregar)
baixar os .zip da RFB ─▶ descompactar, decodificar latin-1, ─▶ gravar num formato
                         filtrar Guarujá, mapear CNAE→setor,    consultável (Parquet,
                         juntar nome (Empresas), normalizar     DuckDB, ou o SQLite
                         telefone, marcar ativos                do Scout)
```

> **"Os projetos de referência já fazem ETL?"** — Sim. `cnpj-data-pipeline`, `cnpj-sqlite` e
> `minha-receita` **são** pipelines ETL: extraem da RFB, transformam e carregam num banco
> (Postgres/SQLite). A diferença é que eles carregam o **Brasil inteiro** (~60 mi). Nós faremos
> um **ETL enxuto**: extrair tudo, mas **transformar/carregar só Guarujá ativo** (~24 mil) —
> muito menor e mais rápido. Os perfis deles estão em [Arquitetura](cnpj-arquitetura.md).

## Por que "dados grandes" mudam o jogo

O instinto é `pandas.read_csv("arquivo.csv")`. Com 1 GB funciona; com os **~17 GB**
descompactados do CNPJ, isso **estoura a RAM** e trava a máquina. Big data pede outra postura.
Conceitos que importam:

- **Processamento em fluxo (*streaming* / *out-of-core*).** Em vez de carregar tudo na memória,
  ler **em pedaços** (linha a linha ou blocos), processar e descartar. A RAM usada fica
  pequena e constante, independente do tamanho do arquivo.
- **Formato colunar (Parquet).** CSV guarda **por linha**; Parquet guarda **por coluna**. Isso
  comprime muito melhor e permite ler **só as colunas necessárias** — se eu quero `município` e
  `telefone`, não toco nas outras 28.
- **Empurrar o filtro para baixo (*predicate/projection pushdown*).** Aplicar `município=6475`
  e selecionar poucas colunas **durante a leitura**, não depois — assim o motor nem materializa
  o que será descartado.
- **Avaliação preguiçosa (*lazy*).** Você descreve a consulta inteira; o motor **planeja e
  otimiza** antes de executar, tocando o mínimo de dados uma única vez.
- **Vetorização + multinúcleo.** Processar **blocos** de linhas de uma vez, usando instruções
  SIMD da CPU e **vários núcleos** — é o que dá velocidade "de C" a uma chamada de uma linha.

DuckDB e Polars implementam **tudo isso** por baixo. É por isso que ganham do `pandas` clássico
(que carrega tudo na memória) e do Python puro (uma linha por vez, um núcleo só).

## As ferramentas

### DuckDB — o "SQLite analítico" (nossa escolha)

**O que é:** um banco de dados **analítico embarcado** (OLAP), escrito em **C++**. "Embarcado"
= roda dentro do seu processo, sem servidor (igual ao SQLite, mas voltado a **análise**:
colunar, vetorizado, multinúcleo). Você fala **SQL**.

**O que resolve para nós:** lê CSV gigante direto, com **pushdown**, **streaming** e — crucial —
**`encoding='latin-1'` nativo**. Pouca RAM, muito rápido.

**Como usamos** (filtrar Guarujá com SQL, lendo latin-1 sem converter nada):

```python
import duckdb
con = duckdb.connect()
n = con.execute("""
    SELECT count(*) FROM read_csv(
        'estab1.csv', delim=';', header=false, quote='"',
        encoding='latin-1', all_varchar=true, names=[...30 nomes...])
    WHERE municipio = '6475'
""").fetchone()[0]
```

**Funções/conceitos principais:** `read_csv(...)` (lê CSV com opções), `COPY ... TO 'x.parquet'`
(exporta para Parquet), `read_parquet(...)`, e SQL normal (`WHERE`, `JOIN`, `GROUP BY`). Doc:
<https://duckdb.org/docs/>.

### Polars — DataFrame em Rust

**O que é:** uma biblioteca de **DataFrame** (tabelas, como o pandas) escrita em **Rust**, com
API em Python. Tem dois modos: **eager** (executa na hora) e **lazy** (`scan_csv` → planeja e
otimiza). Usa o formato **Apache Arrow** (colunar) por baixo.

**O que resolve:** processamento vetorizado, multinúcleo, *lazy* com pushdown — desempenho de
ponta com ergonomia de DataFrame.

**O tropeço no nosso caso:** Polars **só lê UTF-8**. Como o CNPJ é **latin-1**, é preciso
**transcodificar** o arquivo antes (passo extra, mais I/O). Por isso, aqui, preferimos DuckDB.

```python
import polars as pl
lf = pl.scan_csv("estab1_utf8.csv", separator=";", has_header=False, new_columns=[...])
n = lf.filter(pl.col("municipio") == "6475").select(pl.len()).collect().item()
```

Doc: <https://docs.pola.rs/>.

### pandas — o clássico (e seu limite)

`pandas` é o canivete da análise de dados em Python, mas, por padrão, **carrega tudo na
memória**. Por isso os projetos que o usam (ex.: `cnpj-sqlite`) processam **em lotes** (ex.:
500 mil linhas por vez) para não estourar a RAM, e levam **1,5–2 h** no Brasil inteiro. Para o
nosso filtro enxuto, DuckDB faz o mesmo trabalho em segundos.

## O que o benchmark mostrou (A/B/C)

Tarefa: filtrar Guarujá em 1 arquivo (1 GB de CSV, 4,75 mi de linhas). Os três métodos deram o
**mesmo resultado** (7.414 — corretude OK):

| Método | Tempo da busca | Extra | Dependências | Veredito |
|---|---|---|---|---|
| **Python puro** (`csv`, lê do zip) | 28,6s | 0 | **nenhuma** | portável, simples, mais lento |
| **DuckDB** | **5,6s** | +5s extração | duckdb | **vencedor** (latin-1 nativo) |
| **Polars** | 4,9s | +3,5s transcode +5s | polars | rápido, mas precisa UTF-8 |

Interpretação: DuckDB e Polars são ~5× mais rápidos que o Python puro na **busca**. Mas o
Python puro **não precisa extrair nem converter** e tem **zero dependências** — ótimo plano B.
Como o CNPJ é latin-1, o DuckDB leva a melhor (lê direto; o Polars exige um passo a mais).

## Onde estão os gargalos (bottlenecks)

Medindo de ponta a ponta, o tempo **não** está na CPU da busca (segundos), e sim em:

1. **Download** (~20 min numa conexão) → resolvido com paralelismo (ver [Download](cnpj-download.md)).
2. **Descompressão + I/O de disco** (ler/escrever ~1 GB por arquivo).
3. **Encoding** (decodificar latin-1).

Ou seja: **o gargalo é I/O, não CPU**. Isso tem uma consequência importante para a próxima
seção.

## Vale a pena usar Rust ou Zig para acelerar?

Resposta curta e honesta: **não para o nosso problema** — e por um motivo elegante.

- **Você já "usa Rust" sem escrever Rust.** O motor do **Polars é Rust**; o do **DuckDB é
  C++**. Quando você chama essas ferramentas do Python, o trabalho pesado **já roda em código
  nativo** (sem o GIL do Python, com SIMD e múltiplos núcleos). Você tem a velocidade de
  Rust/C++ com a ergonomia de Python.
- **O gargalo é I/O, não CPU.** Reescrever a filtragem num parser artesanal em Rust ou Zig
  pouparia segundos de CPU — enquanto o download leva minutos. Otimizar a parte que **não** é o
  gargalo é o caso clássico de **otimização prematura**.
- **Custo × ganho.** DuckDB/Polars já estão perto do limite do hardware. Um parser próprio em
  Rust/Zig daria ganho **marginal** ao custo de **muito** tempo de desenvolvimento e
  manutenção, e perderia recursos prontos (pushdown, Parquet, SQL).

**Quando Rust/Zig fariam sentido** (para registro, não agora): construir uma **biblioteca/ferramenta
reutilizável de alto desempenho** (foi assim que o próprio Polars nasceu); ambientes de
**recursos ultra-restritos**; ou um **formato exótico** que DuckDB/Polars não saibam ler. Nada
disso é "filtrar um CSV por município".

> **ℹ Princípio** — *"Faça funcionar, depois meça, só então otimize — e otimize o gargalo
> certo."* Aqui, a stack vencedora é **Python orquestrando DuckDB** (e `httpx` para o
> download). Rápido onde precisa, simples onde dá.

## A stack recomendada para o ETL real

```text
Python (cola)
 ├── httpx / threads      → download paralelo dos .zip (resolve o gargalo de I/O)
 ├── DuckDB               → filtra Guarujá + junta Empresas + exporta Parquet (latin-1 nativo)
 └── (stdlib csv)         → plano B sem dependências, se não quisermos DuckDB
Saída: cnpj_guaruja.parquet  (pequeno, rápido de ler pelo Scout)
```

Como esse ETL conversa com o Scout — em módulos separados, "serviços" com papéis distintos —
é o tema de [Arquitetura & integração](cnpj-arquitetura.md).
