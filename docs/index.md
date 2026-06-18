# Fábrica de Sites

Sistema **multiagente** que encontra negócios locais sem site (ou com site fraco),
**gera sites** sob medida e os **oferece aos donos**. Mercado-alvo inicial: **Guarujá, SP**.

!!! info "Status do projeto"
    **Fase 1 (Agente Scout) concluída** — incluindo enriquecimento de contatos
    (Serper) e descoberta de sites ocultos (DomainGuesser). Em andamento agora: a
    **reestruturação da base** para uma aplicação real (API + frontend React + banco
    com ORM) e esta documentação. Veja o [Plano — Base Sólida](plano-base-solida.md).

## O que esta documentação é

Esta é a **base de conhecimento** do projeto: arquitetura, decisões técnicas (com o
porquê de cada escolha), as bibliotecas usadas, um passeio pelo código, a estratégia de
testes e os relatórios de cada sessão de trabalho. A ideia é que qualquer pessoa — ou o
"eu do futuro" — consiga entender **como** e **por que** o sistema foi construído assim.

## Os 5 agentes

O produto é uma esteira: cada agente entrega um artefato que o próximo consome.

<div class="grid cards" markdown>

-   :material-magnify:{ .lg .middle } __1. Scout__ *(atual)*

    ---

    Mapeia os negócios da cidade, detecta quem **não tem site** e ranqueia a
    oportunidade por setor. Fonte grátis (OpenStreetMap) + enriquecimento (Serper).

-   :material-clipboard-check:{ .lg .middle } __2. Benchmark__

    ---

    Para o setor escolhido, define o que é um **"site bom"**: funcionalidades
    esperadas, referências e checklist pontuável.

-   :material-magnify-scan:{ .lg .middle } __3. Auditor__

    ---

    Visita os sites **existentes**, tira screenshot, roda checagem técnica e dá uma
    **nota de qualidade** com a lista de gaps.

-   :material-robot:{ .lg .middle } __4. Criador__

    ---

    Gera o **site sob medida** (Next.js) e publica. O agente mais complexo —
    sub-agentes para coletar, planejar, gerar, revisar e publicar.

-   :material-whatsapp:{ .lg .middle } __5. Prospector__

    ---

    Monta a abordagem personalizada (nome, problema detectado, link do site demo) e
    **contata o dono** por WhatsApp/e-mail.

</div>

## Onde o Scout está hoje (dados reais de Guarujá)

| Métrica | Valor |
|---|---|
| Negócios mapeados | **513** |
| Sem site próprio (mercado imediato) | 342 (66,7%) |
| Só rede social (leads mais quentes) | 66 |
| Com contato (telefone/e-mail) | 242 (47,2%) |
| ⭐ Leads quentes (alta oportunidade **+** contato) | **145** |
| Testes automatizados | 77 (passando) |

## Como navegar

<div class="grid cards" markdown>

-   :material-map-marker-path: __[Plano — Base Sólida](plano-base-solida.md)__

    O plano vivo desta fase: documentação + reestruturação do Scout para app real.

-   :material-scale-balance: __[Decisões (ADRs)](decisoes.md)__

    Cada decisão técnica com contexto, escolha e alternativas — para revisitar com clareza.

-   :material-road-variant: __[Roadmap](roadmap.md)__

    A construção por fases, do simples ao complexo.

</div>

## Princípios do projeto

1. **Começar grátis.** A Fase 1 não gasta um centavo; o custo entra só quando o valor
   estiver comprovado e o gargalo for claro.
2. **Construir por fases**, do simples ao complexo, um agente de cada vez.
3. **Tudo plugável.** Trocar a fonte de dados ou o LLM não deve exigir reescrever o pipeline.
4. **Determinístico primeiro, IA depois.** O que dá para resolver com regras (classificar
   setor, pontuar oportunidade) é feito sem LLM — é grátis, rápido, testável e previsível.
