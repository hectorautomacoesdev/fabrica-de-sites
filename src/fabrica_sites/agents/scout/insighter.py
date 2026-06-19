"""Agrega os resultados do Scout e gera insights.

Hoje os insights são gerados por TEMPLATE (regras determinísticas, sem custo).
A função ``compute`` devolve um dicionário pronto para o relatório HTML e para
exibição no terminal. No futuro, uma camada com LLM (Gemini/Claude) pode
enriquecer esses insights — bastará trocar/empilhar a geração de texto.
"""

from __future__ import annotations

from ...core.sectors import all_sectors, get_sector
from ...models import OrgTipo, ScoutRun, SiteStatus

# Score a partir do qual consideramos um lead "quente" (ALTA/ALTÍSSIMA).
LEAD_QUENTE = 65


def _pct(parte: int, total: int) -> float:
    return round(100 * parte / total, 1) if total else 0.0


def compute(run: ScoutRun) -> dict:
    negocios = run.negocios
    total = len(negocios)

    n_sem_site = sum(1 for b in negocios if b.site_status is SiteStatus.SEM_SITE)
    n_so_social = sum(1 for b in negocios if b.site_status is SiteStatus.SO_REDE_SOCIAL)
    n_com_site = sum(1 for b in negocios if b.site_status is SiteStatus.COM_SITE)
    n_contactavel = sum(1 for b in negocios if b.contactavel)
    # Lead "quente" = alta oportunidade E contactável (acionável já).
    n_leads_quentes = sum(
        1 for b in negocios
        if b.score >= LEAD_QUENTE and b.contactavel and b.org_tipo is OrgTipo.INDEPENDENTE
    )
    sem_site_proprio = n_sem_site + n_so_social  # o mercado imediato

    # Agregação por setor.
    por_setor: list[dict] = []
    for sec in all_sectors():
        do_setor = [b for b in negocios if b.setor == sec.key]
        if not do_setor:
            continue
        t = len(do_setor)
        sem = sum(1 for b in do_setor if b.site_status is SiteStatus.SEM_SITE)
        soc = sum(1 for b in do_setor if b.site_status is SiteStatus.SO_REDE_SOCIAL)
        com = sum(1 for b in do_setor if b.site_status is SiteStatus.COM_SITE)
        por_setor.append({
            "key": sec.key,
            "nome": sec.nome,
            "emoji": sec.emoji,
            "cor": sec.cor,
            "prioritario": sec.prioritario,
            "total": t,
            "sem_site": sem,
            "so_social": soc,
            "com_site": com,
            "oportunidade": sem + soc,
            "oportunidade_pct": _pct(sem + soc, t),
            "score_medio": round(sum(b.score for b in do_setor) / t, 1),
            "leads_quentes": sum(
                1 for b in do_setor
                if b.score >= LEAD_QUENTE and b.contactavel
                and b.org_tipo is OrgTipo.INDEPENDENTE
            ),
        })

    # Ordena por nº de oportunidades (negócios sem site próprio), desc.
    por_setor.sort(key=lambda s: (s["oportunidade"], s["score_medio"]), reverse=True)

    insights = _gerar_insights(
        run.cidade, total, n_sem_site, n_so_social, n_com_site,
        n_contactavel, n_leads_quentes, sem_site_proprio, por_setor,
    )

    return {
        "kpis": {
            "total": total,
            "sem_site": n_sem_site,
            "so_social": n_so_social,
            "com_site": n_com_site,
            "sem_site_proprio": sem_site_proprio,
            "pct_sem_site_proprio": _pct(sem_site_proprio, total),
            "contactavel": n_contactavel,
            "pct_contactavel": _pct(n_contactavel, total),
            "leads_quentes": n_leads_quentes,
        },
        "status_dist": {
            "SEM_SITE": n_sem_site,
            "SO_REDE_SOCIAL": n_so_social,
            "COM_SITE": n_com_site,
        },
        "por_setor": por_setor,
        "insights": insights,
        "top_leads": sorted(negocios, key=lambda b: b.score, reverse=True),
    }


def _gerar_insights(
    cidade: str, total: int, sem: int, soc: int, com: int,
    contactavel: int, quentes: int, sem_proprio: int, por_setor: list[dict],
) -> list[str]:
    if total == 0:
        return [f"Nenhum negócio encontrado em {cidade}. "
                "Verifique o nome da cidade ou a cobertura do OpenStreetMap."]

    L: list[str] = []
    L.append(f"📍 {total} negócios mapeados em {cidade}.")
    L.append(
        f"🎯 {sem_proprio} ({_pct(sem_proprio, total)}%) não têm site próprio "
        f"— este é o mercado imediato."
    )
    if soc:
        L.append(
            f"🔥 {soc} têm SÓ rede social (Instagram/Facebook) e nenhum site — "
            "os leads mais quentes: já querem estar online, mas sem site de verdade."
        )
    L.append(
        f"📞 {contactavel} ({_pct(contactavel, total)}%) têm telefone/e-mail "
        "listado — contato direto possível."
    )
    if com:
        L.append(
            f"🔍 {com} já têm site próprio — o Agente Auditor (fase 3) dirá quais "
            "são fracos e ainda valem uma abordagem."
        )

    # Recomendação de setor.
    candidatos = [s for s in por_setor if s["oportunidade"] > 0]
    if candidatos:
        top = candidatos[0]
        L.append(
            f"🏆 Setor com mais oportunidade: {top['emoji']} {top['nome']} — "
            f"{top['oportunidade']} negócios sem site próprio "
            f"({top['oportunidade_pct']}% do setor)."
        )
        prioritarios = [s for s in candidatos if s["prioritario"]][:3]
        if prioritarios:
            nomes = ", ".join(f"{s['emoji']} {s['nome']} ({s['oportunidade']})"
                              for s in prioritarios)
            L.append(f"✅ Sugestão de piloto (setores prioritários): {nomes}.")
    if quentes:
        L.append(
            f"⭐ {quentes} leads quentes (alta oportunidade + telefone/e-mail "
            "disponível) — prontos para abordar já."
        )
    else:
        L.append(
            "⚠️ Nenhum lead com alta oportunidade E contato listado no OSM. "
            "A cobertura de telefone no OpenStreetMap é baixa — enriquecer "
            "contatos (Serper/Places ou redes sociais) será necessário para "
            "prospecção em escala."
        )
    return L
