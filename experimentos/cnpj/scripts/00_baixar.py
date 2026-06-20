"""00 — Baixador dos dados abertos de CNPJ (Nextcloud/WebDAV da RFB).

Em jan/2026 a Receita migrou os arquivos para um Nextcloud público, acessado
por WebDAV. Este script descobre o mês mais recente e baixa os arquivos
escolhidos, com RETOMADA (Range) e sem dependências externas (só stdlib).

Mecanismo:
  - share público: token na URL, autenticação Basic (usuário=token, senha vazia)
  - endpoint WebDAV: https://arquivos.receitafederal.gov.br/public.php/webdav/
  - PROPFIND Depth:1 lista pastas (YYYY-MM) e arquivos (com tamanho)

Uso:
  python 00_baixar.py --listar
  python 00_baixar.py Municipios.zip Cnaes.zip
  python 00_baixar.py Estabelecimentos1.zip
"""

from __future__ import annotations

import argparse
import base64
import re
import urllib.parse
import urllib.request
from pathlib import Path

TOKEN = "YggdBLfdninEJX9"
WEBDAV = "https://arquivos.receitafederal.gov.br/public.php/webdav"
DADOS = Path(__file__).resolve().parent.parent / "dados"
_AUTH = "Basic " + base64.b64encode(f"{TOKEN}:".encode()).decode()


def _req(url: str, method: str, headers: dict | None = None) -> urllib.request.Request:
    h = {"Authorization": _AUTH}
    if headers:
        h.update(headers)
    return urllib.request.Request(url, method=method, headers=h)


def _propfind(url: str) -> str:
    req = _req(url, "PROPFIND", {"Depth": "1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def mes_mais_recente() -> str:
    xml = _propfind(WEBDAV + "/")
    meses = sorted(set(re.findall(r"/webdav/(\d{4}-\d{2})/", xml)))
    if not meses:
        raise RuntimeError("Nenhuma pasta YYYY-MM encontrada no share.")
    return meses[-1]


def listar(mes: str) -> list[tuple[str, int]]:
    xml = _propfind(f"{WEBDAV}/{mes}/")
    itens: list[tuple[str, int]] = []
    for bloco in re.findall(r"<d:response>(.*?)</d:response>", xml, re.S):
        href = re.search(r"<d:href>([^<]+)</d:href>", bloco)
        size = re.search(r"<d:getcontentlength>(\d+)</d:getcontentlength>", bloco)
        if not href or not size:
            continue
        nome = urllib.parse.unquote(href.group(1).rstrip("/").split("/")[-1])
        itens.append((nome, int(size.group(1))))
    return sorted(itens)


def baixar(mes: str, nome: str) -> None:
    DADOS.mkdir(exist_ok=True)
    destino = DADOS / nome
    url = f"{WEBDAV}/{mes}/{nome}"
    ja = destino.stat().st_size if destino.exists() else 0

    # tamanho remoto (para detectar "já completo" e para a barra)
    with urllib.request.urlopen(_req(url, "HEAD"), timeout=60) as r:
        total = int(r.headers.get("Content-Length", "0"))
    if ja and total and ja >= total:
        print(f"  {nome}: já completo ({ja/1e6:.0f} MB)")
        return

    headers = {"Range": f"bytes={ja}-"} if ja else {}
    modo = "ab" if ja else "wb"
    baixado = ja
    with urllib.request.urlopen(_req(url, "GET", headers), timeout=120) as r, \
            open(destino, modo) as out:
        while chunk := r.read(1 << 20):
            out.write(chunk)
            baixado += len(chunk)
            if total:
                pct = 100 * baixado / total
                print(f"\r  {nome}: {baixado/1e6:7.0f}/{total/1e6:.0f} MB "
                      f"({pct:5.1f}%)", end="", flush=True)
    print(f"\r  {nome}: {baixado/1e6:.0f} MB  OK" + " " * 20)


def main() -> int:
    ap = argparse.ArgumentParser(description="Baixador CNPJ (WebDAV RFB).")
    ap.add_argument("arquivos", nargs="*", help="nomes dos .zip a baixar")
    ap.add_argument("--listar", action="store_true", help="lista arquivos do mês")
    ap.add_argument("--mes", help="força um YYYY-MM (padrão: o mais recente)")
    args = ap.parse_args()

    mes = args.mes or mes_mais_recente()
    print(f"Mês: {mes}")

    if args.listar or not args.arquivos:
        print(f"{'arquivo':<32} tamanho")
        for nome, size in listar(mes):
            print(f"{nome:<32} {size/1e6:8.1f} MB")
        if not args.arquivos:
            return 0

    for nome in args.arquivos:
        baixar(mes, nome)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
