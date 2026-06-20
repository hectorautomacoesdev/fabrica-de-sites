# Estudo de viabilidade — Fonte de dados CNPJ (Dados Abertos da Receita Federal)

> **Status:** experimento/protótipo isolado em `experimentos/cnpj/`. **Não toca** no
> código que já funciona. Objetivo: provar (ou refutar) que a base pública de CNPJ
> vale como fonte do Scout — com **testes reais**, não só teoria.
>
> Data do estudo: jun/2026 · Dump analisado: **2026-06** · Cidade-alvo: **Guarujá/SP** (código RF `6475`).

---

## 1. Resumo executivo (TL;DR)

**Vale muito a pena.** A base de CNPJ ataca de frente a maior fraqueza do Scout hoje —
a baixa contactabilidade do OpenStreetMap (~12,5% com telefone) — e multiplica o volume
de leads, **de graça**.

Medições reais a partir de **1 dos 10 arquivos** de Estabelecimentos (jun/2026):

| Métrica | OSM (hoje) | **CNPJ (medido em 1 arquivo)** | **CNPJ (extrapolado p/ Guarujá)** |
|---|---|---|---|
| Negócios totais | 513 | 7.414 | **~75.000–95.000** |
| Ativos | — | 1.906 | **~20.000–24.000** |
| Ativos em setores prioritários | — | 439 | **~4.500–5.500** |
| **% com telefone** | ~12,5% | **88,9%** | ~89% |
| **% com e-mail** | baixíssima | **80,8%** | ~81% |
| Custo | grátis | **grátis** | grátis |

**Conclusão:** o CNPJ é **complementar** ao OSM, não substituto. O OSM diz *quem tem site*
(tem essa tag); o CNPJ diz *quem existe + como falar com ele* (telefone/e-mail/endereço/CNAE),
mas **não** tem informação de site. Juntos: volume + contato (CNPJ) × sinal de site (OSM).

**Recomendação:** construir, em fase própria (`feat/scout-fonte-cnpj`), um **ETL mensal** que
baixa → filtra Guarujá → guarda num arquivo local (DuckDB/Parquet), exposto ao pipeline como
um plugin `CnpjReceitaSource` (padrão `BusinessSource` já existente). Engine recomendada:
**DuckDB** (lê latin-1 nativo, rápido, baixa RAM).

---

## 2. O que é a fonte

A Receita Federal publica **mensalmente** o cadastro completo de CNPJ como **dados abertos**
(gratuito, sem chave de API, sem limite de uso). São ~60 milhões de estabelecimentos do Brasil
inteiro, divididos em arquivos `.zip` com CSV dentro.

Grupos de arquivos (dump 2026-06):

| Grupo | Arquivos | Tamanho | Contém |
|---|---|---|---|
| **Estabelecimentos** | 10 (`0`=2 GB; `1–9` ~325–350 MB) | **~5 GB** | **endereço, telefone, e-mail, CNAE, situação** |
| Empresas | 10 (~1,3 GB) | ~1,3 GB | **razão social**, natureza jurídica, porte, capital |
| Sócios | 10 | ~0,7 GB | quadro de sócios |
| Simples | 1 | 283 MB | opção pelo Simples/MEI |
| Lookups | Municipios, Cnaes, Naturezas, Motivos, Paises, Qualificacoes | <1 MB | tabelas de-para |

Para o Scout, o arquivo que importa é **Estabelecimentos** (contato + endereço + CNAE).
Para ter o **nome** do negócio, é preciso juntar com **Empresas** (ver dor de cabeça #6).

---

## 3. Como acessar (a maior dor de cabeça — já resolvida)

Em **janeiro/2026 a Receita mudou o mecanismo**: os arquivos saíram de um diretório HTTP
simples e foram para um **Nextcloud público, acessado por WebDAV**. Tutoriais antigos (e os
caminhos `dadosabertos.rfb.gov.br/CNPJ/...`) **não funcionam mais** — o host antigo nem resolve.

Mecanismo atual (descoberto e testado neste experimento):

```text
Endpoint WebDAV : https://arquivos.receitafederal.gov.br/public.php/webdav/
Autenticação    : HTTP Basic — usuário = TOKEN do share, senha = vazia
Token do share  : YggdBLfdninEJX9
Listar pastas   : PROPFIND Depth:1 no endpoint  -> pastas YYYY-MM (2023-05 ... 2026-06)
Baixar arquivo  : GET /public.php/webdav/2026-06/Estabelecimentos1.zip  (com Range p/ retomar)
```

Implementado em `scripts/00_baixar.py` (stdlib pura, com retomada). Descobre sozinho o mês
mais recente — então não quebra quando a Receita publicar 2026-07.

**Velocidade medida:** 4,1 MB/s → um arquivo de 325 MB em ~80s; o set completo de
Estabelecimentos (~5 GB) em **~20 min**. Aceitável para um lote mensal.

---

## 4. Schema dos Estabelecimentos (validado nos dados reais)

- **CSV sem cabeçalho, 30 colunas fixas, separador `;`, aspas `"`, encoding `latin-1`.**
- Colunas que usamos (índice 0-based): `4` nome_fantasia · `5` situação_cadastral ·
  `11` cnae_principal · `14–18` endereço · `19` UF · **`20` município (código RF)** ·
  `21/22` DDD/telefone1 · `27` e-mail.
- **Situação cadastral:** `01` nula · **`02` ATIVA** · `03` suspensa · `04` inapta · `08` baixada.
- **Município é o código interno da RF**, não o do IBGE. Guarujá/SP = **`6475`**
  (cuidado: `8129` = "Guarujá do Sul"/SC — por isso filtramos `município=6475 AND uf=SP`).
  O de-para está em `Municipios.zip`.

---

## 5. Testes A/B/C — como processar 1 GB de CSV

Tarefa: filtrar os estabelecimentos de Guarujá em um arquivo (`Estabelecimentos1`, 1.027 MB
descomprimido, 4,75 milhões de linhas). Três estratégias, **mesmo resultado (7.414)** — corretude OK:

| Estratégia | Tempo query | Extração/transcode | Deps | Disco extra | Veredito |
|---|---|---|---|---|---|
| **A) Naive (stdlib `csv`)** | 28,6s | 0 (lê do zip) | **nenhuma** | **0** | portável, simples, mais lento |
| **B) DuckDB** | **5,6s** | +5,0s extração | duckdb | 1 GB | **vencedor**: latin-1 nativo + SQL |
| **C) Polars** | 4,9s | +3,5s transcode +5,0s | polars | 1 GB+ | rápido, mas **não lê latin-1** |

**Gotcha de encoding (importante):** DuckDB lê `encoding='latin-1'` nativamente; **Polars não**
(só UTF-8) — exige transcodificar o arquivo antes, passo extra e propenso a erro. Por isso a
recomendação é **DuckDB** para o ETL, com a opção **naive (stdlib)** como plano B sem dependência.

Scripts: `02_benchmark.py` (o A/B/C) e `03_analise.py` (a análise abaixo).

---

## 6. ROI para Guarujá (o que decide)

Medido em 1 arquivo (de 10); extrapolação por proporção nacional (este arquivo = 7,9% dos
~60 mi nacionais → fator ~12,6×; a partição é por CNPJ, independente do município, então a
extrapolação é sólida):

**Guarujá neste 1 arquivo:** 7.414 estabelecimentos → por situação: 3.944 baixada,
1.506 inapta, 37 suspensa, 21 nula, **1.906 ATIVOS**.

**Cobertura de contato (entre os 1.906 ativos):**
- com **telefone**: 1.695 (**88,9%**)
- com **e-mail**: 1.541 (**80,8%**)
- com **qualquer** contato: 1.718 (**90,1%**)

**Por setor (ativos):** alimentação 206 · beleza 141 · saúde 63 · automotivo 63 · educação 56 ·
profissional 35 · serviços 30 · turismo 15 · fitness 14 · comércio 356 · outros 927.
→ **439 (23%)** em setores prioritários (alimentação/beleza/saúde/turismo/fitness).

**Validação da extrapolação:** contei um segundo arquivo (o `5`) para testar a hipótese.
Resultado: arquivos `1` e `5` têm **exatamente 4.753.435 linhas cada** e a razão de Guarujá é
estável — **0,1560%** (arq. 1) vs **0,1607%** (arq. 5), diferença <3%. Confirma que a partição é
por CNPJ (uniforme), então extrapolar é seguro. Como os arquivos têm contagem idêntica, o total
nacional provável é **~47,5 mi** (10 × 4,75 mi) — salvo o arquivo `0`, maior (2 GB), cuja contagem
não medi; por isso apresento o resultado como **faixa**, não número fechado.

**Extrapolado para Guarujá inteira:** **~75.000–95.000 estabelecimentos** · **~20.000–24.000
ativos** · **~4.500–5.500 ativos prioritários**. (OSM hoje: 513 no total.) Para um número exato
basta rodar o mesmo filtro nos 10 arquivos (~20 min de download) quando montarmos o ETL real.

Amostra anonimizada de 25 ativos prioritários reais (com bairro/contato) em
`resultados/amostra_guaruja.md` — são exatamente os negócios que queremos (quiosques,
lanchonetes, padarias, salões, pousadas de Pitangueiras/Enseada/Vicente de Carvalho).

---

## 7. Dores de cabeça / achados honestos

1. **Acesso por WebDAV** (não é mais HTTP simples) — resolvido em `00_baixar.py`.
2. **Caminho muda todo mês** (`YYYY-MM`) e o mecanismo mudou em jan/2026 — o baixador
   descobre o mês mais recente sozinho.
3. **Encoding latin-1** — DuckDB/naive OK; Polars precisa transcodificar.
4. **Código de município é da RF**, não IBGE — precisa do `Municipios.zip` e atenção a
   homônimos (Guarujá/SP `6475` vs Guarujá do Sul/SC `8129`).
5. **30 colunas fixas, sem cabeçalho** — o layout é fixo e está documentado aqui e no código.
6. **Nome do negócio:** `nome_fantasia` vem **vazio em ~metade** dos casos; a **razão social**
   está no arquivo **Empresas** (juntar por `cnpj_basico`, +1,3 GB). Para prospecção, o nome
   importa → o ETL real precisa baixar Empresas também.
7. **Filtrar situação = ATIVA (`02`) é obrigatório:** só ~26% estão ativos (53% baixados).
8. **O contato pode ser do contador:** vários e-mails na amostra são de contabilidades
   (`@...contabilidade`, `@guarucontas`). É preciso ter isso em mente na abordagem — nem todo
   telefone/e-mail fala direto com o dono.
9. **CNPJ não tem site:** a base diz que o negócio existe e como contatá-lo, mas **não** se ele
   tem site. A detecção de "sem site" continua vindo do OSM + DomainGuesser + (opcional) Serper.
10. **Frescor:** são dados de cadastro; telefones podem estar desatualizados. Ainda assim, muito
    melhor que a ausência de contato no OSM.
11. **Partições desiguais:** o arquivo `0` tem 2 GB (anômalo) e os demais ~325 MB — por isso a
    extrapolação foi feita por nº de linhas nacionais, não por "1/10".
12. **Tamanho/banda:** ~6,5 GB/mês (Estabelecimentos + Empresas) para baixar; processamento em
    minutos; armazenamento final pequeno (~tens de MB só com Guarujá ativo).

---

## 8. Como encaixar no Scout (arquitetura — a ideia dos "serviços conversando")

```text
[ETL mensal, offline]
  00_baixar (WebDAV) ─▶ filtra município=6475 (DuckDB) ─▶ junta Empresas p/ nome
        └────────────────────────────────────────────────▶ store local: cnpj_guaruja.parquet/duckdb
                                                                  (~24k ativos, com contato)
[pipeline do Scout — sem mudar o pipeline, só somar uma fonte]
  CnpjReceitaSource(BusinessSource)  ◀── lê do store local
        +  OverpassSource (OSM: dá o sinal de site)
        +  SerperSource (opcional)
                 │
                 ▼
        Dedup (nome+endereço, telefone, ou CNPJ como chave forte)
                 │
                 ▼
        Classifier ─▶ Scorer ─▶ Insighter ─▶ API/Frontend
                 ▲
   DomainGuesser/Serper detecta site (CNPJ não traz essa info)
```

Pontos de design:
- **Plugin, não reescrita:** `CnpjReceitaSource` implementa a ABC `BusinessSource` —
  entra no pipeline sem alterar as etapas (mesmo padrão de Overpass/Serper).
- **CNAE → setor:** já prototipado em `scripts/cnae_setor.py` (mapa por prefixo, alinhado aos
  setores do Scout). Reaproveitável no source.
- **Dedup é o trabalho central da integração:** o mesmo negócio pode vir do OSM e do CNPJ.
  Chaves fortes: telefone normalizado e (quando o OSM tiver) CNPJ. Senão, nome+endereço (estender
  o Jaccard que já existe).
- **Separação ETL × consulta:** o download/filtragem pesado roda **mensalmente** e à parte; o
  Scout só **lê** um arquivo local pequeno e rápido. É o "serviço de ingestão" conversando com o
  "serviço de prospecção" via um artefato local (Parquet/DuckDB).

---

## 9. Alternativas consideradas

| Opção | Serve para | Veredito |
|---|---|---|
| **Dump aberto da RFB** (esta) | **Descobrir** negócios + contato em massa, grátis | **Escolhida** p/ descoberta |
| APIs por-CNPJ (BrasilAPI, ReceitaWS, CNPJá) | **Enriquecer** um CNPJ já conhecido (frescor) | Útil **depois**, não p/ descoberta (rate limit) |
| Scrapers de terceiros / Casa dos Dados | Espelho/CDN do mesmo dump | Conveniência; preferir a fonte oficial |
| Google Places API | Contato + reviews | Pago; reservado p/ casos pontuais |

As APIs por-CNPJ **não listam** "todos os negócios de Guarujá" — só respondem por um CNPJ
específico. Logo, são complementares (frescor de um lead quente), não uma fonte de descoberta.

---

## 10. Recomendação e próximos passos

**Recomendo integrar** — é a maior alavanca sobre o ponto fraco do projeto (contato), com custo
zero. Sugestão de sequência (depois do trabalho atual de frontend/API):

1. `feat/scout-fonte-cnpj` — ETL mensal (baixar Estabelecimentos+Empresas → filtrar Guarujá →
   join nome → ativos → `cnpj_guaruja.parquet`), usando DuckDB.
2. `CnpjReceitaSource(BusinessSource)` lendo o Parquet e emitindo negócios com setor (CNAE),
   telefone, e-mail, endereço.
3. **Dedup CNPJ×OSM** (telefone/nome+endereço) — o ponto que exige mais cuidado.
4. (Depois) enriquecimento de frescor por API por-CNPJ para leads quentes.

**Decisão pendente do Hector** (ver `PERGUNTAS.md`): este experimento foi feito como sandbox
isolado; promover para `src/` e para a doc oficial (`docs/`) é o passo que depende do "ok" dele.

---

## 11. Referências

- Dados Abertos CNPJ (oficial): <https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj>
- Repositório de arquivos (Nextcloud RFB): <https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9>
- Metadados/layout (RFB): <https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf>
- `cuducos/minha-receita` (referência de ETL, Go): <https://github.com/cuducos/minha-receita>
- `rictom/cnpj-sqlite` (referência Python): <https://github.com/rictom/cnpj-sqlite>
- `caiopizzol/cnpj-data-pipeline` (rotina nova pós-jan/2026): <https://github.com/caiopizzol/cnpj-data-pipeline>
- DuckDB (engine recomendada): <https://duckdb.org/>
