"""04 — Valida a extrapolação: a proporção de Guarujá é estável entre arquivos?

A partição dos Estabelecimentos é por CNPJ (independente do município). Se isso
for verdade, a razão (linhas de Guarujá / linhas totais) deve ser ~igual em
qualquer arquivo. Comparamos o arquivo 1 (já analisado) com o arquivo 5.
"""

from __future__ import annotations

import csv
import io
import time
import zipfile
from pathlib import Path

DADOS = Path(__file__).resolve().parent.parent / "dados"
COD = "6475"
IDX = 20


def conta(zip_path: Path) -> tuple[int, int]:
    total = g = 0
    with zipfile.ZipFile(zip_path) as zf, zf.open(zf.namelist()[0]) as fh:
        tw = io.TextIOWrapper(fh, encoding="latin-1", newline="")
        for row in csv.reader(tw, delimiter=";", quotechar='"'):
            total += 1
            if row[IDX] == COD:
                g += 1
    return total, g


def main() -> int:
    print(f"{'arquivo':<22}{'linhas':>12}{'guaruja':>10}{'razao %':>10}")
    ref = None
    for nome in ("Estabelecimentos1.zip", "Estabelecimentos5.zip"):
        zp = DADOS / nome
        if not zp.exists():
            print(f"{nome:<22}  (não baixado)")
            continue
        t0 = time.time()
        total, g = conta(zp)
        razao = 100 * g / total
        print(f"{nome:<22}{total:>12,}{g:>10,}{razao:>9.4f}%  ({time.time()-t0:.0f}s)")
        ref = razao if ref is None else ref
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
