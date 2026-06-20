# A base de Dados Abertos da RFB

Esta página explica **o que é** a base pública de CNPJ, **como ela é organizada**, **o que vem
dentro dos arquivos** e **como se acessa hoje** — incluindo a dor de cabeça que tivemos no
caminho e como foi resolvida.

> **▣ Resumo** — a Receita publica **mensalmente** o cadastro de **todos os CNPJs do Brasil**
> como arquivos `.zip` com CSV dentro. Desde jan/2026 eles ficam num **Nextcloud** acessado por
> **WebDAV** (não é mais um diretório HTTP simples). São ~17 GB de dados; o que nos interessa
> são os **Estabelecimentos** (endereço, telefone, e-mail, ramo).

## O que são "dados abertos"

Dados abertos são bases que um órgão público disponibiliza para **qualquer pessoa baixar e usar
livremente**, sem chave de API, sem login, sem custo. A Receita Federal abre o **Cadastro
Nacional da Pessoa Jurídica (CNPJ)** — toda empresa registrada no país, com seus dados
cadastrais. É a mesma base que alimenta sites de consulta de CNPJ.

## Como se acessa hoje: Nextcloud + WebDAV

Aqui está **o que deu errado** e como foi resolvido — é instrutivo.

**O caminho antigo (quebrado).** Tutoriais e projetos antigos baixavam de um diretório HTTP
simples, tipo `http://dadosabertos.rfb.gov.br/CNPJ/...`. Tentei: **o host nem resolve mais**.
Tentei o caminho novo "óbvio" (`arquivos.receitafederal.gov.br/.../dados_abertos_cnpj/2026-06/`):
**404**. Em **janeiro/2026 a Receita mudou o mecanismo** e os tutoriais antigos pararam de valer.

**A alternativa (o que funciona).** Os arquivos foram para um **Nextcloud** — um servidor de
arquivos de código aberto (pense num "Dropbox self-hosted"). O acesso é por **WebDAV**.

- **Nextcloud:** software que hospeda arquivos numa pasta compartilhada (*share*) com um link
  público. O *share* da Receita é o token `YggdBLfdninEJX9`.
- **WebDAV** (*Web Distributed Authoring and Versioning*): uma extensão do HTTP para
  **manipular arquivos** num servidor — além de `GET` (baixar), ele tem o verbo **`PROPFIND`**,
  que **lista** o conteúdo de uma pasta (com nomes, tamanhos, datas). É assim que um Nextcloud
  expõe os arquivos.

O mecanismo que descobri e testado:

```text
Endpoint WebDAV : https://arquivos.receitafederal.gov.br/public.php/webdav/
Autenticação    : HTTP Basic — usuário = TOKEN do share, senha = vazia
Token (share)   : YggdBLfdninEJX9
Listar pastas   : PROPFIND Depth:1  → devolve XML com as pastas YYYY-MM e os arquivos
Baixar          : GET /public.php/webdav/2026-06/Estabelecimentos1.zip
```

Implementei isso em `scripts/00_baixar.py` (só biblioteca padrão do Python). Ele faz um
`PROPFIND`, descobre **a pasta do mês mais recente sozinho** e baixa — então não quebra quando
a Receita publicar `2026-07`. O passo a passo de download (e como **acelerá-lo**) está em
[Download & atualização](cnpj-download.md).

## A estrutura dos arquivos (grupos, divisão e tamanhos)

Os dados não vêm num arquivo só — viriam dezenas de GB num único `.zip`. A Receita divide em
**grupos** (por assunto) e, dentro dos grupos grandes, em **10 partes**.

| Grupo | Arquivos | Tamanho (jun/2026) | O que contém |
|---|---|---|---|
| **Estabelecimentos** | `Estabelecimentos0..9.zip` | **~5 GB** | **endereço, telefone, e-mail, CNAE, situação** |
| Empresas | `Empresas0..9.zip` | ~1,3 GB | **razão social**, natureza jurídica, porte, capital |
| Sócios | `Socios0..9.zip` | ~0,7 GB | quadro de sócios |
| Simples | `Simples.zip` | 283 MB | opção pelo Simples Nacional / MEI |
| Tabelas (lookup) | `Municipios`, `Cnaes`, `Naturezas`, `Motivos`, `Paises`, `Qualificacoes` | <1 MB | "de-para" de códigos → nomes |

**Por que 10 partes?** Cada empresa tem um **CNPJ**, cujos 8 primeiros dígitos são o
"CNPJ básico". A Receita separa os registros em 10 arquivos **por esse número** — que **não tem
relação com a cidade**. Consequência prática (e muito útil): os negócios de Guarujá ficam
**espalhados uniformemente** pelos 10 arquivos. Foi isso que permitiu medir 1 arquivo e
extrapolar com segurança (ver [Visão geral](cnpj-visao-geral.md)).

> **ℹ Curiosidade medida** — os arquivos `1` a `9` têm **exatamente 4.753.435 linhas cada**; o
> arquivo `0` é maior (2 GB). Por isso a extrapolação foi feita pela **fração nacional de
> linhas**, não por um simples "× 10".

## O que vem dentro: as 30 colunas de Estabelecimentos

Cada arquivo de Estabelecimentos é um **CSV sem cabeçalho**, com **30 colunas em ordem fixa**.
"Sem cabeçalho" significa que a primeira linha **já é dado** — não há uma linha de títulos; é
preciso **conhecer a ordem das colunas de antemão** (documentada no PDF de metadados da RFB e
aqui). As que usamos estão **destacadas**:

| # | Coluna | Observação |
|---|---|---|
| 1 | CNPJ_BÁSICO | 8 primeiros dígitos (liga ao arquivo Empresas) |
| 2 | CNPJ_ORDEM | identifica a filial |
| 3 | CNPJ_DV | dígitos verificadores |
| 4 | MATRIZ/FILIAL | 1 = matriz, 2 = filial |
| **5** | **NOME_FANTASIA** | nome popular — **vem vazio em ~metade** dos casos |
| **6** | **SITUAÇÃO_CADASTRAL** | **02 = ATIVA** (01 nula, 03 suspensa, 04 inapta, 08 baixada) |
| 7 | DATA_SITUAÇÃO | quando entrou nessa situação |
| 8 | MOTIVO_SITUAÇÃO | código do motivo |
| 9–10 | CIDADE_EXTERIOR, PAÍS | para empresas no exterior |
| 11 | DATA_INÍCIO_ATIVIDADE | abertura |
| **12** | **CNAE_PRINCIPAL** | **código do ramo** (vira "setor" no Scout) |
| 13 | CNAE_SECUNDÁRIA | outros ramos (lista) |
| 14–18 | TIPO_LOGRADOURO, **LOGRADOURO, NÚMERO**, COMPLEMENTO, **BAIRRO** | **endereço** |
| 19 | **CEP** | |
| 20 | **UF** | estado (filtramos `SP`) |
| **21** | **MUNICÍPIO** | **código da RF** — Guarujá = `6475` |
| **22–23** | **DDD_1, TELEFONE_1** | **telefone principal** |
| 24–27 | DDD_2/TELEFONE_2, DDD_FAX/FAX | telefones extras |
| **28** | **CORREIO_ELETRÔNICO** | **e-mail** |
| 29–30 | SITUAÇÃO_ESPECIAL, DATA | falência/recuperação etc. |

> **▣ O nome do negócio mora em outro arquivo** — `NOME_FANTASIA` (col. 5) costuma vir vazio. A
> **razão social** está no grupo **Empresas**, ligada pelo **CNPJ_BÁSICO** (col. 1). Para ter
> bons nomes na prospecção, o ETL real precisa **juntar** Estabelecimentos + Empresas — um
> *join* por chave, conceito detalhado em [ETL & ferramentas](cnpj-etl-ferramentas.md).

## Encoding: o que é "latin-1" e por que importa

Todo texto, no computador, é guardado como **bytes**. Um **encoding** é a tabela que diz *qual
byte vira qual letra*. Dois muito comuns:

- **UTF-8** — o padrão moderno da web; cobre todos os idiomas. Letras acentuadas usam 2 bytes.
- **latin-1** (ISO-8859-1) — tabela antiga, de 1 byte por caractere, que cobre as línguas da
  Europa Ocidental (inclui `ã`, `ç`, `é`…). **É o que a Receita usa.**

Por que isso importa para nós: se você **ler** um arquivo latin-1 **achando que é UTF-8**, os
acentos viram lixo (`GUARUJÁ` → `GUARUJÃ`). Pior: algumas ferramentas **quebram**. No nosso
caso isso teve consequência prática — o **DuckDB lê latin-1 nativamente**, mas o **Polars só lê
UTF-8** (precisa converter antes). É um detalhe pequeno que vira decisão de ferramenta (ver
[ETL & ferramentas](cnpj-etl-ferramentas.md)).

```python
# ler corretamente: declarar o encoding certo
import csv, io, zipfile
with zipfile.ZipFile("Estabelecimentos1.zip") as zf, zf.open(zf.namelist()[0]) as fh:
    texto = io.TextIOWrapper(fh, encoding="latin-1", newline="")  # <- a chave
    for row in csv.reader(texto, delimiter=";", quotechar='"'):
        ...
```

## Código de município: RF ≠ IBGE

A coluna 21 (município) **não** é o código do IBGE que costumamos ver — é um **código interno
da Receita**. Para saber qual cidade é, usamos a tabela `Municipios.zip` (um "de-para"
código → nome). Descobri assim que **Guarujá/SP = `6475`**.

> **⛔ Cuidado com homônimos** — existe `8129 = GUARUJÁ DO SUL` (que fica em **Santa Catarina**).
> Por isso filtramos **`município = 6475` E `UF = SP`** — para não misturar a cidade errada.
> (Projetos como o `minha-receita` mantêm um arquivo extra do Tesouro só para mapear o código
> da RF ↔ código do IBGE; ver [referências](cnpj-arquitetura.md).)

## Resumindo a anatomia

```text
dump mensal (YYYY-MM)
├── Estabelecimentos0..9.zip   → CSV, 30 colunas, ';', latin-1, SEM cabeçalho   ★ o que importa
│      └── filtra município=6475 & UF=SP & situação=02  → ~ negócios ATIVOS de Guarujá
├── Empresas0..9.zip           → razão social (juntar por CNPJ_BÁSICO p/ ter o nome)
├── Socios / Simples           → sócios / MEI (sinais extras, opcionais)
└── Municipios, Cnaes, ...     → tabelas de-para (código → nome)
```

Com a base entendida, os próximos passos são **baixá-la rápido** e **processá-la bem** —
os temas de [Download & atualização](cnpj-download.md) e
[ETL & ferramentas](cnpj-etl-ferramentas.md).
