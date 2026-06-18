# Roadmap

Construção por fases, do simples ao complexo. Cada fase entrega algo que
funciona sozinho e gera valor.

## ✅ Fase 1 — Agente Scout (FEITO nesta sessão)
Mapear negócios da cidade, detectar quem não tem site, ranquear oportunidade.

- [x] Estrutura do projeto (src layout, venv, pyproject, CLI)
- [x] Fonte de dados grátis (OpenStreetMap/Overpass), plugável
- [x] Taxonomia de setores + classificação por tags
- [x] Detecção de presença web (sem site / só rede social / site próprio)
- [x] Score de oportunidade explicável (0–100)
- [x] Persistência em SQLite
- [x] Dashboard HTML (KPIs, gráficos, mapa, tabela filtrável)
- [x] CLI com `run`, `setores`, `stats`
- [x] 25 testes automatizados passando
- [x] Execução real validada (385 negócios em Guarujá)

**Próximos refinamentos possíveis do Scout (decidir com o usuário):**
- [ ] Enriquecer contatos (cobertura de telefone no OSM é só ~12,5%)
- [ ] Fonte adicional (Serper.dev grátis / Google Places) via nova `BusinessSource`
- [ ] Camada de insights com LLM (Gemini free tier)

## 🔜 Fase 2 — Agente Benchmark
Para o setor escolhido, definir o que é um "site bom": funcionalidades
esperadas, referências, checklist pontuável. (LLM + busca web.)

## Fase 3 — Agente Auditor
Visitar os sites dos negócios que **têm** site (os 89 "COM_SITE" em Guarujá),
tirar screenshot, rodar checagem técnica, comparar com as diretrizes do
Benchmark e gerar nota + lista de gaps. (Playwright + LLM.)

## Fase 4 — Agente Criador
O mais complexo. Sub-agentes: coletor de info → planejador → gerador de
código (Next.js) → QA → deploy (Vercel). (LangGraph + Claude.)

## Fase 5 — Agente Prospector
Gerar abordagem personalizada (nome, problema detectado, link do site demo) e
enviar via WhatsApp/e-mail. (OpenClaw — WhatsApp nativo e grátis.)

## Fase 6+ — Escala e automação
Centenas de negócios por rodada, sites Tier 2/3 (agendamento, cardápio,
e-commerce), dashboard web (React) e auto-monitoramento da taxa de aceite.

## Decisão pendente sobre orquestração multiagente
No Python 3.14 (instalado aqui), o CrewAI só resolve uma versão antiga
(0.11.2). Para as fases 2+, a recomendação é um **venv separado em Python
3.12** para as partes com framework (CrewAI/LangGraph), mantendo o Scout leve.
Ver `docs/DECISOES.md` e `docs/DUVIDAS_ABERTAS.md`.
