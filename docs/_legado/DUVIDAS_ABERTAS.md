# Dúvidas abertas — preciso da sua decisão

Pontos onde a sua escolha muda o que faço a seguir. Numerados para facilitar a
resposta ("D1: opção B", etc.).

## P1 — Enriquecimento de contatos (o gargalo mais concreto)
O OSM tem **telefone em só ~12,5%** dos negócios de Guarujá. Para prospectar em
escala, precisamos de mais contatos. Opções:
- **(a)** Serper.dev — 2.500 buscas/mês grátis, traz dados do Google Maps.
- **(b)** Google Places — ~US$200 de crédito/mês grátis, mais completo.
- **(c)** Raspar o Instagram/Facebook dos que só têm rede social.
- **(d)** Deixar para depois; seguir só com OSM por enquanto.

**Minha sugestão:** (a) Serper, como segunda `BusinessSource`, por ser grátis e
de baixo atrito. Concorda?

## P2 — Setor do piloto
Os dados reais de Guarujá apontam: 🍽️ **Alimentação (105)** > 🛍️ Comércio (75)
> 🩺 Saúde (40). Beleza apareceu pouco — provavelmente **subcobertura do OSM**,
não ausência de mercado. Você havia citado salões/clínicas/lojas.
- Seguimos com **Alimentação** (líder nos dados)?
- Ou insiste em **Beleza/Saúde** e eu busco uma fonte mais rica antes de decidir?

## P3 — Framework de orquestração (fases 2+)
Confirmo a criação de um **venv Python 3.12 separado** para CrewAI/LangGraph
(o 3.14 atual só roda CrewAI antigo)? Ou prefere manter a abordagem leve sem
framework enquanto der?

## P4 — Pesos do score
Quer revisar comigo a tabela de pesos (D5 em DECISOES.md)? Ex.: telefone vale
mais? Setor prioritário pesa mais? Posso parametrizar por setor.

## P5 — Qual o próximo passo quando você voltar?
- **(a)** Refinar o Scout (enriquecer contatos / segunda fonte).
- **(b)** Começar o Agente **Benchmark** (Fase 2).
- **(c)** Ajustar o dashboard / a classificação primeiro.

## P6 — Dashboard web "de verdade" (React)
Hoje o relatório é HTML estático (ótimo e grátis). O dashboard React interativo
que você quer — fazemos agora ou depois de mais um ou dois agentes prontos?

## P7 — Confirmações de rumo
- OpenClaw para o Prospector (Fase 5) — mantém?
- Hospedagem dos sites gerados na Vercel (Fase 4) — mantém?
