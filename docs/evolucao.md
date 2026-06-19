# Evolução do projeto

O que era, o que é agora e o que melhorou — com os números reais de coleta, desempenho e qualidade. Cada salto veio de um teste honesto, não de um palpite.

> Esta página tem uma versão **interativa** na documentação React (`docs-app/`), com gráficos. Aqui está a versão em texto, equivalente em conteúdo.

## Em números

| Indicador | Antes | Agora | Nota |
|---|---|---|---|
| Leads quentes | 34 | **145** | +326% |
| Negócios mapeados | 385 | **513** | multi-fonte |
| Testes automatizados | 0 | **93** | pirâmide de testes |
| Tempo por negócio | — | **0,04 ms** | baseline medido |

## Ganho de coleta — testes A/B (Guarujá)

Quatro configurações de fontes, medindo o que importa: **leads quentes** (oportunidade alta *e* contactável). Empilhar fontes multiplicou os leads — ao custo de tempo.

| Config | Negócios | Contactáveis | Leads quentes | Tempo |
|---|---|---|---|---|
| A — só OSM | 385 | 48 | 34 | 2,6 s |
| B — OSM + DomainGuesser | 385 | 48 | 29 | 34,7 s |
| **C — OSM + Serper** ⭐ | 518 | 246 | **159** | 59,2 s |
| D — Full (todas as fontes) | 512 | 240 | 144 | 92,8 s |

> **ℹ Leitura do A/B** — a config **C (OSM + Serper)** deu o melhor retorno: mais negócios, muito mais contactáveis e o pico de leads quentes, em tempo razoável. O **DomainGuesser** sozinho (B) até reduziu leads (achou sites próprios, "esfriando" alguns) — útil como sinal, não como motor. A execução final usou a config completa: **513 negócios, 145 leads quentes**.

## Desempenho do pipeline

Medido com `tracemalloc` + `perf_counter`, sem rede (dados sintéticos):

- **~0,04 ms** por negócio (100 e 500 — escala linear)
- **~1,6 MB** de RAM para 500 negócios
- **~0,7 s** para rodar os 77 testes do núcleo

## Antes → depois

| Antes | Depois | Ganho |
|---|---|---|
| `db.py` com SQL cru | SQLModel + Alembic | tipagem, migrations, pronto p/ Postgres |
| Relatório HTML estático | API FastAPI + dashboard React | interativo; base dos próximos agentes |
| Lógica duplicada na CLI | Service layer único | uma fonte da verdade |
| 1 fonte de dados (OSM) | Fontes plugáveis (OSM + Serper + DomainGuesser) | 34 → 145 leads quentes |
| Documentação em MkDocs | Documentação em React (esta) | visual próprio + interatividade |

## Linha do tempo

| Sessão | Marco | O que aconteceu |
|---|---|---|
| 01 | Fundação do Scout | src layout, OSM, score explicável, SQLite, 1º dashboard. 385 negócios. |
| 02 | Enriquecimento + A/B | Serper + DomainGuesser, dedup, testes A/B. 34 → 145 leads; 77 testes. |
| 03 | Deep dive | Análise de bibliotecas, arquitetura, convenções, autoavaliação honesta. |
| 04 | Doc + CI/CD | Primeira doc (MkDocs) no GitHub Pages; higiene de segredos. |
| 05 | Base Sólida | SQLModel, Alembic, FastAPI, React. 93 testes passando. |
| 06 | Doc em React + CLAUDE.md | Esta documentação; memória de projeto versionada. |
