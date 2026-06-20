# CNPJ — a ideia, o experimento e os resultados

Esta seção documenta um estudo que pode mudar o patamar do projeto: usar a **base pública de
CNPJ da Receita Federal** como nova fonte do Agente Scout. Aqui está **a ideia**, **o que foi
feito**, **como foi validado** e **o que descobrimos** — de forma didática, para servir de
base de conhecimento e de estudo.

> **❝ A ideia em uma frase** — o OpenStreetMap nos diz *quem tem site*; o CNPJ nos diz *quem
> existe e como falar com ele* (telefone, e-mail, endereço, ramo). Juntando os dois, ganhamos
> **volume** e **contato** — exatamente o que faltava para prospectar de verdade.

## Por que CNPJ? O problema que ele resolve

O Scout hoje encontra negócios pelo **OpenStreetMap (OSM)**. Funciona, é grátis, mas tem uma
fraqueza dura: **pouca gente cadastra telefone no OSM**. Na nossa execução de Guarujá, só
~12,5% dos negócios tinham telefone. Sem contato, não há prospecção.

A Receita Federal publica, como **dados abertos** (gratuitos), o cadastro de **todos os CNPJs
do Brasil** — com **endereço, telefone, e-mail e ramo de atividade (CNAE)**. É a peça que
faltava. As duas fontes são **complementares**:

| | OpenStreetMap | **CNPJ (Receita)** |
|---|---|---|
| Diz se tem **site**? | ✅ sim (tag `website`) | ❌ não |
| Dá **telefone/e-mail**? | raramente (~12%) | **quase sempre (~90%)** |
| **Volume** em Guarujá | ~513 | **dezenas de milhares** |
| Localização/mapa | ✅ ótima | aproximada (endereço) |
| Custo | grátis | **grátis** |

Ou seja: **CNPJ não substitui o OSM** — ele entra ao lado, somando contato e volume, enquanto
o OSM (mais o DomainGuesser/Serper) continua sendo quem detecta *se o negócio já tem site*.

## O fluxo que estamos desenhando

```text
                 ┌──────────────────────────────┐
 RECEITA (mensal)│ baixa → filtra Guarujá → junta│   arquivo local pequeno
   dados abertos │ nome → guarda (DuckDB/Parquet)│──▶ (~24 mil ativos, com contato)
                 └──────────────────────────────┘            │
                                                             ▼
 SCOUT  ─ OverpassSource (OSM: sinal de site) ─┐    CnpjReceitaSource (lê o arquivo local)
                                               ├──▶ Dedup (telefone/nome/CNPJ)
         DomainGuesser/Serper (acha site) ─────┘            │
                                                             ▼
                                       Classifier → Scorer → Insighter → API → Frontend
```

A parte pesada (baixar e filtrar gigabytes) roda **uma vez por mês, à parte**. O Scout só
**lê** um arquivo local já enxuto. Isso é o embrião de uma arquitetura de **serviços
separados** — detalhada em [Arquitetura & integração](cnpj-arquitetura.md).

## O que foi feito (o experimento)

Para não arriscar o que já funciona, tudo foi feito num **sandbox isolado** em
`experimentos/cnpj/` — pasta separada, ambiente Python próprio, **nada** do código de produção
(`src/`) foi tocado. Os passos, cada um virou um script reproduzível:

| Script | O que faz |
|---|---|
| `00_baixar.py` | Baixa os arquivos da Receita (WebDAV), com retomada |
| `01_lookups.py` | Descobre o código de Guarujá e valida o formato dos CSVs |
| `02_benchmark.py` | Compara 3 formas de processar 1 GB de CSV (A/B/C) |
| `03_analise.py` | Mede o ROI: ativos, setores, cobertura de contato |
| `04_validar.py` | Confirma que a extrapolação é confiável |

Os detalhes técnicos de cada etapa estão nas páginas seguintes:
[a base de dados](cnpj-dados-abertos.md), [download e atualização](cnpj-download.md) e
[ETL & ferramentas](cnpj-etl-ferramentas.md).

## Resultados medidos (dump de junho/2026, Guarujá/SP)

A partir de **1 dos 10 arquivos** de estabelecimentos:

| Métrica | OSM (hoje) | **CNPJ (1 arquivo)** | **CNPJ (extrapolado p/ Guarujá)** |
|---|---|---|---|
| Negócios totais | 513 | 7.414 | **~75.000–95.000** |
| Ativos | — | 1.906 | **~20.000–24.000** |
| Ativos em setores prioritários | — | 439 | **~4.500–5.500** |
| **% com telefone** | ~12,5% | **88,9%** | ~89% |
| **% com e-mail** | baixíssima | **80,8%** | ~81% |

A leitura honesta: o salto de contactabilidade (de ~12% para ~90%) é o ganho que **destrava a
prospecção**. O número exato de Guarujá depende de rodar o filtro nos 10 arquivos; a faixa
acima é uma estimativa **validada** (ver abaixo).

> **▣ Ressalva honesta** — são dados de **cadastro**: alguns telefones estarão desatualizados
> e parte dos contatos é do **contador** (vimos e-mails `@…contabilidade`). Ainda assim, é
> incomparavelmente melhor que a ausência de contato no OSM. A prova final será a varredura de
> qualidade real na hora de abordar.

## Como garanti que nada quebrou (validação com Git)

Como o pedido era **não mexer no que funciona**, usei o **Git** para provar isolamento. Vale
entender, porque é uma boa prática geral:

- **Branch (ramo):** criei um ramo dedicado para o experimento
  (`git checkout -b experimento/fonte-cnpj`). Um *branch* é uma linha de trabalho paralela: o
  que faço nele não afeta a `main` nem outros ramos até eu juntar (merge).
- **Working tree (área de trabalho):** os arquivos na pasta. O Git distingue arquivos
  **rastreados** (que ele versiona) de **não rastreados** (novos, que ele ainda ignora do
  controle).
- **`git status`:** mostra o que mudou. No fim, ele listava **apenas** `experimentos/` como
  não rastreado — ou seja, **nenhum arquivo de `src/` apareceu como modificado**. Essa é a
  prova de que o código de produção ficou intacto.
- **`.gitignore`:** um arquivo que lista o que **nunca** deve ser versionado. Coloquei os
  dados brutos (gigabytes) e o ambiente lá — num repositório **público**, jamais subir dados
  pesados ou pessoais. Confirmei com `git status --ignored` que os `.zip` estavam ignorados.

```bash
# o que eu rodei, em essência:
git checkout -b experimento/fonte-cnpj   # ramo isolado p/ o experimento
# ... trabalho só dentro de experimentos/cnpj/ ...
git status --short                       # -> só "experimentos/" aparece (src/ intacto)
git status --ignored --short             # -> dados/*.zip marcados como ignorados (!!)
git branch                               # -> confirma os ramos: main, feat/..., experimento/...
```

## A extrapolação validada (passo a passo)

Medi Guarujá em **1 arquivo** e quis estimar o total dos **10**. A pergunta: *posso confiar
em multiplicar?* A resposta depende de **como a Receita divide os arquivos**.

1. **Hipótese:** a divisão é por **CNPJ** (um número de empresa), que **não tem relação com a
   cidade**. Se for verdade, a proporção de Guarujá deve ser ~igual em qualquer arquivo.
2. **Teste:** baixei um **segundo** arquivo (o `5`, partição diferente) e contei.
3. **Resultado:** os arquivos `1` e `5` têm **exatamente 4.753.435 linhas cada**, e a razão de
   Guarujá ficou **estável**: 0,1560% (arquivo 1) vs 0,1607% (arquivo 5) — diferença <3%.
   A hipótese se confirma → **extrapolar é seguro**.

O código que fez isso (`04_validar.py`) é simples e legível — lê cada zip em *streaming* e
conta:

```python
def conta(zip_path):
    total = g = 0
    with zipfile.ZipFile(zip_path) as zf, zf.open(zf.namelist()[0]) as fh:
        tw = io.TextIOWrapper(fh, encoding="latin-1", newline="")
        for row in csv.reader(tw, delimiter=";", quotechar='"'):
            total += 1
            if row[20] == "6475":   # coluna 21 = município; 6475 = Guarujá
                g += 1
    return total, g          # (linhas totais, linhas de Guarujá)
```

Por que isso importa: em vez de chutar "vezes 10", a estimativa vira **vezes a fração nacional
real** (cada arquivo é ~7,9% dos ~60 milhões nacionais → fator ~12,6×), com uma margem honesta.
É a diferença entre um número inventado e um número **defensável**.

## Conclusão e próximos passos

**Vale integrar.** É a maior alavanca sobre o ponto fraco do projeto (contato), de graça.
Sequência sugerida (depois do trabalho de frontend/API que já estava no plano):

1. `feat/scout-fonte-cnpj` — o **ETL mensal** (baixar → filtrar Guarujá → juntar nome → guardar).
2. `CnpjReceitaSource` — o **plugin** que lê o arquivo local e entra no pipeline do Scout.
3. **Dedup CNPJ × OSM** — o ponto que exige mais cuidado (o mesmo negócio vem das duas fontes).
4. (Depois) enriquecimento de frescor por API por-CNPJ para os leads quentes.

> **ℹ Onde aprofundar** — [A base de Dados Abertos](cnpj-dados-abertos.md) ·
> [Download & atualização](cnpj-download.md) · [ETL & ferramentas](cnpj-etl-ferramentas.md) ·
> [Arquitetura & integração](cnpj-arquitetura.md).
