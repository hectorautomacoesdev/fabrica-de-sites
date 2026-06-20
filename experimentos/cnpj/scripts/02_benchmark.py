r"""02 — Benchmark A/B/C: filtrar estabelecimentos de Guarujá (código 6475).

Compara 3 estratégias de processar UM arquivo Estabelecimentos (~1 GB CSV):

  A) NAIVE   — stdlib (csv) lendo direto de DENTRO do zip, latin-1 nativo.
               Zero dependências, zero extração, baixa RAM.
  B) DUCKDB  — read_csv com encoding='latin-1' nativo, SQL com pushdown.
  C) POLARS  — exige UTF-8: transcodifica latin-1->utf8 e faz scan lazy.

Mede tempo de cada um e confirma que os 3 chegam ao MESMO total (corretude).
Gotcha central: os dados da RFB são latin-1; DuckDB lê nativo, Polars não.

Rode com o venv isolado:
  .\.venv\Scripts\python.exe scripts\02_benchmark.py
"""

from __future__ import annotations

import csv
import io
import time
import zipfile
from pathlib import Path

DADOS = Path(__file__).resolve().parent.parent / "dados"
ZIP = DADOS / "Estabelecimentos1.zip"
CSV_LATIN = DADOS / "estab1_latin1.csv"     # extraído cru (latin-1)
CSV_UTF8 = DADOS / "estab1_utf8.csv"        # transcodificado p/ Polars

COD_GUARUJA = "6475"
IDX_MUNICIPIO = 20  # 21ª coluna (0-based)

COLS = [
    "cnpj_basico", "cnpj_ordem", "cnpj_dv", "matriz_filial", "nome_fantasia",
    "situacao_cadastral", "data_situacao", "motivo_situacao", "nome_cidade_ext",
    "pais", "data_inicio", "cnae_principal", "cnae_secundaria", "tipo_logradouro",
    "logradouro", "numero", "complemento", "bairro", "cep", "uf", "municipio",
    "ddd1", "telefone1", "ddd2", "telefone2", "ddd_fax", "fax", "email",
    "situacao_especial", "data_situacao_especial",
]


def _interno(zf: zipfile.ZipFile) -> str:
    return zf.namelist()[0]


def extrair_latin1() -> float:
    """Extrai o CSV cru (latin-1) do zip. Retorna segundos."""
    t0 = time.time()
    with zipfile.ZipFile(ZIP) as zf, zf.open(_interno(zf)) as fh, \
            open(CSV_LATIN, "wb") as out:
        while chunk := fh.read(1 << 20):
            out.write(chunk)
    return time.time() - t0


def transcodificar_utf8() -> float:
    """latin-1 -> utf-8 (necessário para o Polars). Retorna segundos."""
    t0 = time.time()
    with open(CSV_LATIN, "rb") as fin, open(CSV_UTF8, "wb") as fout:
        while chunk := fin.read(1 << 20):
            fout.write(chunk.decode("latin-1").encode("utf-8"))
    return time.time() - t0


def a_naive() -> tuple[int, float]:
    """Stream direto do zip, sem extrair. Conta linhas de Guarujá."""
    t0 = time.time()
    n = 0
    with zipfile.ZipFile(ZIP) as zf, zf.open(_interno(zf)) as fh:
        tw = io.TextIOWrapper(fh, encoding="latin-1", newline="")
        for row in csv.reader(tw, delimiter=";", quotechar='"'):
            if row[IDX_MUNICIPIO] == COD_GUARUJA:
                n += 1
    return n, time.time() - t0


def b_duckdb() -> tuple[int, float]:
    import duckdb
    t0 = time.time()
    con = duckdb.connect()
    q = f"""
        SELECT count(*) FROM read_csv(
            '{CSV_LATIN.as_posix()}',
            delim=';', header=false, quote='"', encoding='latin-1',
            all_varchar=true, names={COLS!r}
        ) WHERE municipio = '{COD_GUARUJA}'
    """
    n = con.execute(q).fetchone()[0]
    con.close()
    return n, time.time() - t0


def c_polars(transcode_s: float) -> tuple[int, float]:
    import polars as pl
    t0 = time.time()
    lf = pl.scan_csv(
        CSV_UTF8, separator=";", has_header=False, quote_char='"',
        new_columns=COLS, infer_schema=False, truncate_ragged_lines=True,
    )
    n = lf.filter(pl.col("municipio") == COD_GUARUJA).select(pl.len()).collect().item()
    # inclui o custo de transcodificação no total (é obrigatório p/ Polars)
    return n, (time.time() - t0) + transcode_s


def main() -> int:
    print(f"Arquivo: {ZIP.name} (comprimido {ZIP.stat().st_size/1e6:.0f} MB)\n")

    print("Extraindo CSV latin-1 ...")
    t_ext = extrair_latin1()
    print(f"  extração: {t_ext:.1f}s  ({CSV_LATIN.stat().st_size/1e6:.0f} MB)\n")

    print("== A) NAIVE (stdlib, lê do zip, latin-1) ==")
    na, ta = a_naive()
    print(f"  Guarujá={na}  tempo={ta:.1f}s  (sem extração necessária)\n")

    print("== B) DUCKDB (latin-1 nativo, SQL) ==")
    nb, tb = b_duckdb()
    print(f"  Guarujá={nb}  tempo={tb:.1f}s  (+{t_ext:.1f}s extração)\n")

    print("== C) POLARS (precisa UTF-8: transcodifica + scan lazy) ==")
    t_tr = transcodificar_utf8()
    print(f"  transcodificação latin-1->utf8: {t_tr:.1f}s")
    nc, tc = c_polars(t_tr)
    print(f"  Guarujá={nc}  tempo={tc:.1f}s (inclui transcode; +{t_ext:.1f}s extração)\n")

    print("=== RESUMO ===")
    print(f"  Corretude (mesmo total?): naive={na} duckdb={nb} polars={nc} "
          f"-> {'OK' if na == nb == nc else 'DIVERGIU!'}")
    print(f"  A naive  : {ta:5.1f}s  (0 disco extra, 0 deps)")
    print(f"  B duckdb : {tb:5.1f}s + {t_ext:.1f}s extração = {tb+t_ext:.1f}s total")
    print(f"  C polars : {tc:5.1f}s + {t_ext:.1f}s extração = {tc+t_ext:.1f}s total")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
