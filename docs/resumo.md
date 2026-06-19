# Resumo & ponderações

Esta página é diferente das outras. Não documenta o *código* — documenta o **processo**: como as decisões vêm sendo tomadas, o que está funcionando, o que precisou ser corrigido e as reflexões honestas ao longo do caminho. É a "meta-camada" do projeto.

> **❝ Por que existir** — o Hector quer *participar da construção e aprender*, não só receber resultado pronto. Registrar o raciocínio (e os erros) é parte do aprendizado — e evita repetir as mesmas escolhas no escuro.

## Como nossas conversas são direcionadas

Quatro princípios guiam praticamente toda decisão:

1. **Planejar junto antes de executar.** Entrevistar, propor, consultar — e só então construir. O "porquê" importa tanto quanto o "o quê".
2. **Começar grátis, evoluir em fases.** Nada de custo de API até o gargalo ficar claro. Um módulo de cada vez, do simples ao complexo.
3. **Testar de verdade e refletir.** Testes A/B de abordagens quando faz sentido; medir em vez de chutar; ajustar com base no resultado.
4. **Ser 100% honesto.** Sem medo de discordar, de voltar atrás, de atrasar para fazer bem feito. Autoavaliação sincera é regra, não exceção.

## Autoavaliação honesta — o que esta sessão revelou

> **✓ O que estava bom** — a memória pessoal do projeto estava atualizada e bem escrita (estado, stack, resultados A/B, baseline de desempenho). A arquitetura do código está limpa: camadas separadas, fontes/enrichers plugáveis, DTOs isolados. Nada precisou ser reestruturado.

> **⚠ O que estava errado (e foi corrigido)** — **não existia `CLAUDE.md`**. Eu vinha guardando contexto só na memória *pessoal* (fora do repositório). Faltava a memória *de projeto*, versionada e compartilhada. Também havia uma inconsistência boba: o índice da memória dizia "Fase 1" enquanto o detalhe já dizia "Fase 1.5". Ambos corrigidos.

> **↩ O que mudou de direção** — a documentação saiu do **MkDocs** para um **app React próprio**. O MkDocs cumpriu o papel, mas tem visual "templado", pouca interatividade e não ajudava o aprendizado de React. A jogada honesta foi manter o conteúdo em **Markdown** (fácil de manter) e construir só o "casco" interativo em React — o melhor dos dois mundos, sem reescrever tudo à mão.

## Preciso de skills/subagentes? (verdict honesto)

A pergunta foi levada a sério, item por item:

| Possível ajuda | Preciso? | Por quê |
|---|---|---|
| **Designer** | Não | O produto já tem um sistema de tokens (cores, espaçamento); reusá-lo deixa a doc coesa. Há ferramentas de design disponíveis se um dia quisermos arte gerada — overkill para uma doc. |
| **Estruturação Python** | Não | O código já está bem estruturado. Não há o que reestruturar. |
| **Escrever documentação** | Não | É trabalho nativo — não agrega delegar. |

A única ajuda que agrega de verdade é usar subagentes de leitura em paralelo para reler muitos módulos rápido — **eficiência**, não falta de capacidade. Conclusão: **não instalar plugin nenhum** seria gasto sem ganho.

## Trade-offs que assumimos conscientemente

- **Perdemos** a referência de API automática (mkdocstrings) e a busca pronta do MkDocs. **Reganhamos** se fizer falta — não é difícil.
- O **bundle** da doc cresceu com o destaque de código (`highlight.js`). É mitigável limitando as linguagens; não vale segurar a entrega por isso.
- **Custos** ficaram para depois, por decisão — quando houver números reais de uso, montamos o painel.

## Em uma frase

O projeto avança devagar de propósito: **qualidade e aprendizado acima de velocidade**, decisões registradas para poderem ser revisitadas, e honestidade sobre o que ainda não está bom. Ver também [Boas práticas do Claude](boas-praticas.md) e [Decisões](decisoes.md).
