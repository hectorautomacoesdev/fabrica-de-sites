# Boas práticas do Claude

Trabalhar bem com o Claude Code tem técnicas concretas. Esta página registra as práticas que **não seguíamos** e passamos a adotar — com o porquê e a diferença que fazem. É o complemento prático do [Resumo & ponderações](resumo.md).

## O panorama: antes → agora

| Prática | Antes | Agora | Diferença |
|---|---|---|---|
| **Memória de projeto** | só memória pessoal (fora do repo) | `CLAUDE.md` versionado no repo | contexto compartilhado e durável; sobrevive a novas sessões |
| **Testes como portão** | rodados às vezes | rodar os 93 antes de declarar "pronto" | regressão acende luz vermelha na hora |
| **Planejar antes** | já praticávamos | formalizado no `CLAUDE.md` | decisões consultadas, não impostas |
| **Higiene de segredos** | atenção manual | regra escrita + varredura antes de todo push | repo é público; um vazamento seria sério |
| **Commits** | informais | convencionais + co-autor | histórico legível e rastreável |
| **DTOs vs ORM** | implícito | regra explícita: API nunca expõe SQLModel cru | banco e contrato evoluem sem se quebrar |

## O `CLAUDE.md` — a prática mais importante

É um arquivo na raiz do repositório que o Claude lê **em toda sessão**. Diferente da memória pessoal (que fica em `~/.claude`, sobre você e o histórico), o `CLAUDE.md` é **do projeto**: versionado, compartilhado, sobre *como trabalhar neste código*.

O nosso contém: visão do projeto e fase atual, stack e layout de pastas, **comandos reais** (rodar, testar, buildar), convenções, guardrails (segredos, custos, repo público) e como o Hector quer trabalhar.

> **ℹ Por que importa** — sem ele, cada sessão recomeça do zero e o Claude pode "redescobrir" coisas erradas. Com ele, comandos e convenções ficam a um arquivo de distância — menos retrabalho, menos erro.

## Como usar o Claude Code bem (na prática)

- **Plan mode primeiro em tarefas grandes.** Apresentar um plano e ajustar *antes* de escrever código evita refação. Foi exatamente o que fizemos aqui: esqueleto + 1 página-modelo → aprovação → resto.
- **Construir por fases.** Entregas pequenas e verificáveis batem com "começar grátis e evoluir".
- **Pedir honestidade explícita.** "Seja sincero, não tenha medo de discordar" muda a qualidade da resposta — vira análise de trade-off, não confirmação.
- **Confirmar termos ambíguos.** Transcrições por voz truncam palavras; melhor perguntar do que adivinhar errado.
- **Deixar o Claude rodar/checar o próprio trabalho.** Build, typecheck e testes antes de dizer "feito" — afirmar sem verificar é o anti-padrão.
- **Registrar decisões na doc.** Todo plano relevante vira página (ADR, roadmap, esta própria página). A base de conhecimento é o ativo que fica.

## O que evitar

- **Afirmar sem verificar** ("deve funcionar"). Se não rodou o teste, diga que não rodou.
- **Pesquisar/instalar em excesso.** Ponderar se uma dependência ou skill agrega *de verdade* antes de adicionar.
- **Acumular contexto só na cabeça.** O que é durável vai para o `CLAUDE.md` ou para a doc; o que é da conversa, fica na conversa.
- **Otimizar cedo.** Determinístico e simples primeiro; complexidade só quando o gargalo for real e medido.

## Em resumo

A maior parte das "boas práticas" se reduz a três hábitos: **escrever o que é durável** (CLAUDE.md, doc), **verificar antes de afirmar** (testes/build) e **decidir junto, com honestidade**. O resto é consequência.
