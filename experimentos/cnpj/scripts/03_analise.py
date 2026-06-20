"""03 — Análise de ROI: o que o CNPJ entrega para Guarujá?

A partir de UM arquivo (Estabelecimentos1), responde as perguntas que decidem
se vale integrar esta fonte ao Scout:

  - Quantos estabelecimentos de Guarujá? Quantos ATIVOS?
  - Distribuição por SETOR (via CNAE) — quantos em setores prioritários?
  - COBERTURA DE CONTATO: % com telefone, % com e-mail (o ponto fraco do OSM).
  - Extrapolação para os 10 arquivos (estimativa do total real).
  - Amostra (anonimizada) como prova de qualidade.

Usa DuckDB (latin-1 nativo) só para fatiar Guarujá; o resto é Python puro.
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

import duckdb

from cnae_setor import SETORES_PRIORITARIOS, cnae_para_setor

DADOS = Path(__file__).resolve().parent.parent / "dados"
RESULT = Path(__file__).resolve().parent.parent / "resultados"
CSV_LATIN = DADOS / "estab1_latin1.csv"
COD_GUARUJA = "6475"

# total nacional de estabelecimentos (ordem de grandeza conhecida, ~jun/2026)
NACIONAL_APROX = 60_000_000

COLS = [
    "cnpj_basico", "cnpj_ordem", "cnpj_dv", "matriz_filial", "nome_fantasia",
    "situacao_cadastral", "data_situacao", "motivo_situacao", "nome_cidade_ext",
    "pais", "data_inicio", "cnae_principal", "cnae_secundaria", "tipo_logradouro",
    "logradouro", "numero", "complemento", "bairro", "cep", "uf", "municipio",
    "ddd1", "telefone1", "ddd2", "telefone2", "ddd_fax", "fax", "email",
    "situacao_especial", "data_situacao_especial",
]

SIT = {"01": "nula", "02": "ATIVA", "03": "suspensa", "04": "inapta",
       "08": "baixada"}


def _mask_email(e: str) -> str:
    if not e or "@" not in e:
        return ""
    user, _, dom = e.partition("@")
    u = (user[0] + "***") if user else "***"
    return f"{u}@{dom}"


def _mask_tel(ddd: str, tel: str) -> str:
    if not tel:
        return ""
    tel = re.sub(r"\D", "", tel)
    if len(tel) < 4:
        return f"({ddd}) ****"
    return f"({ddd}) {tel[:2]}***{tel[-2:]}"


def main() -> int:
    con = duckdb.connect()
    leitor = (
        f"read_csv('{CSV_LATIN.as_posix()}', delim=';', header=false, quote='\"', "
        f"encoding='latin-1', all_varchar=true, names={COLS!r})"
    )

    total_arquivo = con.execute(f"SELECT count(*) FROM {leitor}").fetchone()[0]

    rows = con.execute(f"""
        SELECT nome_fantasia, situacao_cadastral, cnae_principal,
               logradouro, numero, bairro, cep, uf, ddd1, telefone1, email
        FROM {leitor}
        WHERE municipio = '{COD_GUARUJA}'
    """).fetchall()
    con.close()

    total_g = len(rows)
    por_sit = Counter(SIT.get(r[1], r[1]) for r in rows)

    ativos = [r for r in rows if r[1] == "02"]
    n_ativos = len(ativos)

    # cobertura de contato (entre ATIVOS)
    com_tel = sum(1 for r in ativos if (r[9] or "").strip())
    com_email = sum(1 for r in ativos if (r[10] or "").strip())
    com_qualquer = sum(1 for r in ativos
                       if (r[9] or "").strip() or (r[10] or "").strip())

    # por setor (entre ATIVOS)
    setor_de = {i: cnae_para_setor(r[2]) for i, r in enumerate(ativos)}
    por_setor = Counter(setor_de.values())
    prioritarios = sum(v for k, v in por_setor.items() if k in SETORES_PRIORITARIOS)

    # extrapolação: Guarujá é independente da partição (split por CNPJ)
    fator = NACIONAL_APROX / total_arquivo
    est_total_g = round(total_g * fator)
    est_ativos = round(n_ativos * fator)
    est_priorit = round(prioritarios * fator)

    # ---- relatório no console ----
    P = print
    P(f"Arquivo: estab1 (1 de 10)  |  linhas no arquivo: {total_arquivo:,}")
    P(f"Fração nacional deste arquivo: {100/fator:.1f}%  (fator de extrapolação ~{fator:.1f}x)\n")
    P(f"=== GUARUJÁ (município 6475) neste arquivo ===")
    P(f"  Total estabelecimentos: {total_g:,}")
    P(f"  Por situação: {dict(por_sit)}")
    P(f"  ATIVOS: {n_ativos:,}\n")
    P(f"=== Cobertura de contato (entre os {n_ativos:,} ATIVOS) ===")
    P(f"  com telefone: {com_tel:,} ({100*com_tel/n_ativos:.1f}%)")
    P(f"  com e-mail  : {com_email:,} ({100*com_email/n_ativos:.1f}%)")
    P(f"  com QUALQUER contato: {com_qualquer:,} ({100*com_qualquer/n_ativos:.1f}%)\n")
    P(f"=== Por setor (ATIVOS) ===")
    for setor, n in por_setor.most_common():
        flag = " [prioritário]" if setor in SETORES_PRIORITARIOS else ""
        P(f"  {setor:14} {n:5,}{flag}")
    P(f"  -> setores prioritários: {prioritarios:,} de {n_ativos:,} "
      f"({100*prioritarios/n_ativos:.1f}%)\n")
    P(f"=== EXTRAPOLAÇÃO p/ os 10 arquivos (estimativa) ===")
    P(f"  Estab. Guarujá (todos):   ~{est_total_g:,}")
    P(f"  Estab. Guarujá ATIVOS:    ~{est_ativos:,}")
    P(f"  ATIVOS prioritários:      ~{est_priorit:,}")
    P(f"  (OSM hoje traz ~513 negócios no total)\n")

    # ---- amostra anonimizada (prova de qualidade) ----
    amostra = [r for r in ativos
               if cnae_para_setor(r[2]) in SETORES_PRIORITARIOS
               and ((r[9] or "").strip() or (r[10] or "").strip())][:25]
    linhas_md = [
        "| Nome fantasia | Setor | Bairro | Telefone | E-mail |",
        "|---|---|---|---|---|",
    ]
    for r in amostra:
        nome = (r[0] or "(só razão social — ver Empresas)").strip()[:40]
        setor = cnae_para_setor(r[2])
        bairro = (r[3] and (r[5] or "")).strip()[:20]
        tel = _mask_tel(r[8] or "", r[9] or "")
        email = _mask_email(r[10] or "")
        linhas_md.append(f"| {nome} | {setor} | {bairro} | {tel} | {email} |")
    RESULT.mkdir(exist_ok=True)
    (RESULT / "amostra_guaruja.md").write_text(
        "# Amostra — 25 ativos prioritários de Guarujá (contato mascarado)\n\n"
        "> Dados abertos da RFB (jun/2026). Telefone/e-mail mascarados por privacidade.\n\n"
        + "\n".join(linhas_md) + "\n",
        encoding="utf-8",
    )
    P(f"Amostra anonimizada salva em resultados/amostra_guaruja.md "
      f"({len(amostra)} linhas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
