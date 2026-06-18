# Roadmap

Construção por fases, do simples ao complexo. Cada fase entrega algo que funciona sozinho
e gera valor.

```mermaid
flowchart LR
    F1["Fase 1<br/>Scout ✅"] --> F15["Base Sólida<br/>API+React+DB 🚧"]
    F15 --> F2["Fase 2<br/>Benchmark"]
    F2 --> F3["Fase 3<br/>Auditor"]
    F3 --> F4["Fase 4<br/>Criador"]
    F4 --> F5["Fase 5<br/>Prospector"]
    F5 --> F6["Fase 6+<br/>Escala"]
```

## ✅ Fase 1 — Agente Scout

Mapear negócios da cidade, detectar quem não tem site, ranquear oportunidade.

- [x] Estrutura do projeto (src layout, venv, pyproject, CLI)
- [x] Fonte de dados grátis (OpenStreetMap/Overpass), plugável
- [x] Taxonomia de setores + classificação por tags
- [x] Detecção de presença web (sem site / só rede social / site próprio)
- [x] Score de oportunidade explicável (0–100)
- [x] **Enriquecimento de contatos** (Serper.dev) como segunda `BusinessSource`
- [x] **DomainGuesser** — descobre sites próprios não cadastrados no OSM
- [x] Persistência em SQLite
- [x] Dashboard HTML (KPIs, gráficos, mapa, tabela filtrável)
- [x] CLI com `run`, `setores`, `stats`
- [x] **77 testes** automatizados (unit, integração, desempenho)
- [x] Execução real validada: **513 negócios** em Guarujá, **145 leads quentes**

## 🚧 Fase 1.5 — Base Sólida (em andamento)

Transformar o Scout em aplicação real e criar a base de conhecimento. Detalhe completo no
[Plano — Base Sólida](plano-base-solida.md).

- [x] Repositório público no GitHub + higiene de segredos
- [ ] Documentação MkDocs Material publicada no GitHub Pages
- [ ] Backend FastAPI (API REST) sobre service layer compartilhado com a CLI
- [ ] Banco com SQLModel + Alembic (migrations)
- [ ] Frontend Vite + React + TypeScript consumindo a API
- [ ] Pirâmide de testes (API, componente, e2e) + CI

## Fase 2 — Agente Benchmark

Para o setor escolhido, definir o que é um "site bom": funcionalidades esperadas,
referências, checklist pontuável. (LLM + busca web.)

## Fase 3 — Agente Auditor

Visitar os sites dos negócios que **têm** site, tirar screenshot, rodar checagem técnica,
comparar com as diretrizes do Benchmark e gerar nota + lista de gaps. (Playwright + LLM.)

## Fase 4 — Agente Criador

O mais complexo. Sub-agentes: coletor de info → planejador → gerador de código (Next.js)
→ QA → deploy (Vercel). (LangGraph + Claude.)

## Fase 5 — Agente Prospector

Gerar abordagem personalizada (nome, problema detectado, link do site demo) e enviar via
WhatsApp/e-mail. (OpenClaw — WhatsApp nativo e grátis.)

## Fase 6+ — Escala e automação

Centenas de negócios por rodada, sites Tier 2/3 (agendamento, cardápio, e-commerce),
deploy na nuvem e auto-monitoramento da taxa de aceite. Ver [Escalando para a nuvem](#).

## Orquestração multiagente (fases 2+)

No Python 3.14 atual, o CrewAI só resolve uma versão antiga. Para as fases 2+, a
recomendação é um **venv separado em Python 3.12** para as partes com framework
(CrewAI/LangGraph), mantendo o Scout leve. Ver [Decisões](decisoes.md) (D3).
