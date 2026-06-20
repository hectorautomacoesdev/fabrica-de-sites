# Download & atualização mensal

Baixar ~5 GB (Estabelecimentos) todo mês é o gargalo de entrada. Esta página estuda **como
acelerar o download** e **como lidar com a atualização mensal** (o que muda, o que repete).

> **▣ O que medimos** — com 1 conexão simples (curl), o download saiu a **4,1 MB/s**
> (325 MB em ~80s; os ~5 GB de Estabelecimentos em ~20 min). O servidor **suporta download
> segmentado** (responde `HTTP 206 Partial Content` a requisições com `Range`) — então dá para
> **acelerar com conexões paralelas**.

## Como um download "comum" funciona (e por que é lento)

Um `curl`/`wget` padrão abre **uma** conexão TCP e puxa o arquivo do começo ao fim. A
velocidade fica limitada por **uma** rota de rede até o servidor. Se o servidor não satura sua
banda numa conexão só (comum em servidores públicos com limite por conexão), você fica abaixo
do que sua internet aguenta. Foi o nosso caso: 4,1 MB/s numa conexão.

## Estratégia 1 — Download segmentado (várias conexões no mesmo arquivo)

A ideia: **partir o arquivo em pedaços** e baixar cada pedaço numa conexão separada, ao mesmo
tempo. Isso só é possível se o servidor aceitar **requisições parciais** (`Range`) — o nosso
aceita (confirmei com o `206`).

```text
arquivo de 325 MB
 ├─ conexão 1: bytes 0–81MB     ┐
 ├─ conexão 2: bytes 81–162MB   ├─ baixadas EM PARALELO → montadas no fim
 ├─ conexão 3: bytes 162–243MB  │
 └─ conexão 4: bytes 243–325MB  ┘
```

A ferramenta clássica para isso é o **`aria2c`**. Exemplo:

```bash
# -x: conexões por servidor; -s: nº de segmentos
aria2c -x 8 -s 8 \
  --http-user=YggdBLfdninEJX9 --http-passwd='' \
  "https://arquivos.receitafederal.gov.br/public.php/webdav/2026-06/Estabelecimentos1.zip"
```

Em cenários típicos, isso transforma "1,5 MB/s com 1 conexão" em "10–15 MB/s com 8–16
conexões" — **desde que** o servidor não limite. Alternativas equivalentes: **`axel`** (mais
simples) e **`wget2`** (sucessor do wget com paralelismo).

> **⛔ Boa prática (e cortesia)** — é um servidor **público da Receita**. Exagerar nas conexões
> (`-x 32`) pode ser visto como abuso e levar a *throttling* ou bloqueio. Use moderação
> (`-x 4` a `-x 8`) e não rode isso de hora em hora. "Rápido o suficiente" > "máximo possível".

## Estratégia 2 — Paralelismo entre arquivos (vários dos 10 ao mesmo tempo)

Como Estabelecimentos são **10 arquivos independentes**, dá para baixar **vários ao mesmo
tempo** — cada um na sua conexão. É o que o projeto `cnpj-data-pipeline` faz (4 *workers*
paralelos por padrão). Combina com a Estratégia 1, mas com a mesma ressalva: 3–4 arquivos
simultâneos já é um bom equilíbrio entre velocidade e educação com o servidor.

```python
# esqueleto: baixa 3 arquivos por vez (ThreadPool), reaproveitando o 00_baixar.py
from concurrent.futures import ThreadPoolExecutor
arquivos = [f"Estabelecimentos{i}.zip" for i in range(10)]
with ThreadPoolExecutor(max_workers=3) as ex:
    ex.map(lambda f: baixar("2026-06", f), arquivos)
```

## Estratégia 3 — Retomada (resume)

Baixar 5 GB e cair no 90% é frustrante. Com `Range`, dá para **continuar de onde parou**: o
cliente pede `Range: bytes=<já_baixado>-` e o servidor manda só o resto. O nosso `00_baixar.py`
já faz isso (verifica o tamanho local e retoma). No `aria2c`/`wget` é o comportamento padrão
(`-c`/`--continue`).

## Comparando as ferramentas

| Ferramenta | Conexões | Quando usar |
|---|---|---|
| `curl` / `wget` | 1 | simples, scripts, retomada manual |
| **`aria2c`** | **N (segmentado)** | **maximizar velocidade de 1 arquivo grande** |
| `axel` | N (segmentado) | alternativa leve ao aria2c |
| `httpx` async (Python) | N (entre arquivos) | integrar no nosso ETL em Python |

Para o nosso ETL, a recomendação pragmática: **`httpx`/threads baixando 3–4 dos 10 arquivos em
paralelo**, cada um com retomada. Simples, em Python (sem depender de binário externo), e já
deixa o download de ~20 min para ~5–8 min sem maltratar o servidor.

## Atualização mensal: o que muda, o que repete

> **▣ Ponto-chave** — cada publicação mensal é um **snapshot completo** — a **base inteira de
> novo**, não um "incremental" só com as diferenças. Se você baixar todo mês, **a maior parte
> dos dados será repetida** (a maioria das empresas não muda de um mês para o outro).

O que de fato **muda** mês a mês:

- **Novos CNPJs** (empresas recém-abertas) — ★ os melhores leads: acabaram de abrir, quase
  certamente **ainda não têm site**.
- **Mudança de situação** — empresas que **baixaram** (fecharam) ou foram reativadas.
- **Atualizações cadastrais** — endereço, telefone, e-mail, CNAE.

Três formas de lidar com isso:

| Abordagem | Como | Custo | Quando |
|---|---|---|---|
| **Recarga total** | baixa tudo e refiltra Guarujá | alto (banda) / simples (lógica) | é o que os projetos de referência fazem |
| **Só se mudou** | `PROPFIND` checa se há mês novo antes de baixar | baixo | evita rebaixar o mesmo mês |
| **Diff (delta)** | compara o filtrado deste mês com o do mês anterior | baixíssimo | achar **novos/alterados/baixados** |

**Recomendação para o nosso caso.** Como **só nos interessa Guarujá**, o resultado filtrado é
**pequeno** (~24 mil linhas). Então: baixar + filtrar uma vez por mês (o pesado), e **guardar o
histórico** do filtrado. Comparando mês a mês (um *diff* barato), conseguimos detectar
**negócios que acabaram de abrir** — leads quentíssimos — e marcar os que fecharam. É a melhor
relação custo/valor: o trabalho pesado roda mensal, e o *diff* sobre o resultado enxuto é
instantâneo.

```text
mês N-1: cnpj_guaruja_2026-05.parquet ─┐
                                        ├─ diff →  NOVOS (abriram)   → leads prioritários
mês N  : cnpj_guaruja_2026-06.parquet ─┘          BAIXADOS (fecharam) → remover
                                                  ALTERADOS (telefone/endereço) → atualizar
```

Com o download resolvido, falta **processar** os gigabytes com eficiência — o tema de
[ETL & ferramentas](cnpj-etl-ferramentas.md).
