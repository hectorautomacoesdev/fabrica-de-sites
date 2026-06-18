# Decisões técnicas (e o porquê)

Registro no estilo "ADR" leve. Cada decisão tem contexto, escolha e
alternativas, para podermos revisitar com clareza.

## D1 — Fonte de dados inicial: OpenStreetMap (Overpass API)
**Escolha:** começar com a Overpass API do OpenStreetMap.
**Por quê:** 100% grátis, sem chave, sem cartão, sem cadastro. Funciona hoje.
Traz nome, categoria, telefone, site, endereço, horário e coordenadas.
**Trade-off:** cobertura de negócios informais é menor que a do Google, e a
cobertura de **telefone é baixa** (em Guarujá, ~12,5%).
**Alternativas (futuras, plugáveis):** Serper.dev (2.500 buscas/mês grátis,
dados do Google Maps) e Google Places (~US$200 de crédito/mês). Entram via
nova `BusinessSource` sem reescrever o pipeline.

## D2 — Determinístico primeiro, LLM depois
**Escolha:** o núcleo do Scout (classificar, pontuar, agregar) não usa LLM.
**Por quê:** é grátis, instantâneo, 100% testável e previsível. LLM só onde
agrega (insights ricos, e os agentes 2–5). A camada de insights já é plugável
para receber Gemini/Claude depois.

## D3 — Sem CrewAI na Fase 1
**Escolha:** não usar framework de agentes agora.
**Por quê:** (a) o Scout é um pipeline de dados, não precisa de raciocínio/
delegação; (b) **teste real**: no Python 3.14 o resolvedor do pip só chega ao
`crewai 0.11.2` (de ~2 anos atrás), puxando `langchain 0.1.x` e forçando
downgrade de typer/rich — instável.
**Plano:** introduzir CrewAI/LangGraph nas fases 2+, provavelmente num **venv
Python 3.12 separado** para essas partes. (Confirmar — ver DUVIDAS_ABERTAS.)

## D4 — Stack leve: httpx, pydantic, jinja2, typer, rich
**Por quê:** poucas dependências, todas com suporte ao Python 3.14 (testado:
httpx 0.28, pydantic 2.13 com core em Rust, typer 0.26, rich 15, jinja2 3.1).
SQLite é da biblioteca padrão (zero dependência).

## D5 — Modelo de score de oportunidade (0–100), explicável
Soma de componentes, limitada a 100, **com motivo legível para cada ponto**:

| Componente | Pontos |
|------------|-------:|
| Base: sem site | 60 |
| Base: só rede social | 70 |
| Base: já tem site próprio | 25 |
| Tem telefone | +20 |
| Tem horário de funcionamento | +5 |
| Tem endereço | +5 |
| Setor prioritário | +10 |

Rótulos: ≥80 ALTÍSSIMA · ≥65 ALTA · ≥45 MÉDIA · <45 BAIXA. Pesos em `config.py`.

## D6 — "Só rede social" é o lead mais quente (base 70 > 60)
**Por quê:** quem tem só Instagram/Facebook já entendeu que precisa estar
online, mas não tem site de verdade — é mais fácil de convencer do que quem
não tem presença alguma. Detectamos por domínio (facebook/instagram/linktr.ee/
wa.me/...) e por tags `contact:instagram`/`contact:facebook`.

## D7 — "Lead quente" exige oportunidade ALTA **e** contato (ajuste desta sessão)
**Antes:** lead quente = score ≥ 65. Resultado: 268/385 — diluído demais.
**Depois:** lead quente = score ≥ 65 **E** ter telefone/e-mail. Resultado:
34/385 — acionável de verdade.
**Por quê:** um lead que não dá para contatar não está "pronto para abordar".
Funil honesto: 385 mapeados → 296 sem site (mercado) → 34 prontos para abordar.

## D8 — SQLite local + relatório HTML estático
**Por quê:** zero infraestrutura, zero custo. O relatório é um único `.html`
que abre no navegador (bibliotecas de gráfico/mapa via CDN). Supabase/Postgres
e dashboard React entram quando houver necessidade real (escala/colaboração).

## D9 — Layout `src/` + console script `fabrica`
**Por quê:** evita imports acidentais, força instalação explícita (`pip install
-e .`) e dá um comando de terminal limpo.
