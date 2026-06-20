"""01 — Inspeciona as tabelas de lookup do CNPJ (Municípios, CNAEs).

Objetivos:
  1. Descobrir o CÓDIGO da Receita Federal para Guarujá (a coluna MUNICIPIO
     dos Estabelecimentos usa o código interno da RF, não o do IBGE).
  2. Validar encoding (latin-1) e separador (;) dos CSVs da RF.
  3. Construir um mapa CNAE -> descrição (para depois mapear CNAE -> setor).

Usa só a biblioteca padrão — nenhuma dependência externa.
"""

from __future__ import annotations

import csv
import io
import json
import sys
import unicodedata
import zipfile
from pathlib import Path

DADOS = Path(__file__).resolve().parent.parent / "dados"
RESULT = Path(__file__).resolve().parent.parent / "resultados"
ENCODING = "latin-1"   # ISO-8859-1, padrão dos dados abertos da RFB
DELIM = ";"


def _ler_zip_csv(zip_path: Path) -> list[list[str]]:
    """Extrai o (único) CSV de dentro do zip e devolve as linhas como listas."""
    with zipfile.ZipFile(zip_path) as zf:
        nome = zf.namelist()[0]
        with zf.open(nome) as fh:
            texto = io.TextIOWrapper(fh, encoding=ENCODING, newline="")
            return list(csv.reader(texto, delimiter=DELIM, quotechar='"'))


def _sem_acento(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    ).upper()


def inspecionar_municipios() -> list[tuple[str, str]]:
    zp = DADOS / "Municipios.zip"
    linhas = _ler_zip_csv(zp)
    print(f"[Municipios] {len(linhas)} linhas. Arquivo interno: "
          f"{zipfile.ZipFile(zp).namelist()[0]}")
    print("[Municipios] amostra (validação de encoding/delimitador):")
    for ln in linhas[:3]:
        print("   ", ln)

    achados = []
    for codigo, nome, *resto in linhas:
        if "GUARUJA" in _sem_acento(nome):
            achados.append((codigo, nome))
    print(f"\n[Municipios] correspondências para 'GUARUJA': {achados}")
    return achados


def inspecionar_cnaes() -> dict[str, str]:
    zp = DADOS / "Cnaes.zip"
    linhas = _ler_zip_csv(zp)
    print(f"\n[CNAEs] {len(linhas)} linhas.")
    print("[CNAEs] amostra:")
    for ln in linhas[:3]:
        print("   ", ln)
    mapa = {codigo: desc for codigo, desc, *_ in linhas}
    # Salva o mapa para uso posterior (CNAE -> setor)
    RESULT.mkdir(exist_ok=True)
    (RESULT / "cnae_map.json").write_text(
        json.dumps(mapa, ensure_ascii=False, indent=0), encoding="utf-8"
    )
    print(f"[CNAEs] mapa salvo em resultados/cnae_map.json ({len(mapa)} códigos)")
    return mapa


def main() -> int:
    if not (DADOS / "Municipios.zip").exists():
        print("ERRO: rode primeiro o download dos lookups.", file=sys.stderr)
        return 1
    achados = inspecionar_municipios()
    inspecionar_cnaes()

    if achados:
        codigo = achados[0][0]
        print(f"\n==> CÓDIGO RF DE GUARUJÁ = {codigo}")
        (RESULT / "guaruja_codigo.txt").write_text(codigo, encoding="utf-8")
    else:
        print("\n!! Guarujá não encontrado — investigar nomes alternativos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
