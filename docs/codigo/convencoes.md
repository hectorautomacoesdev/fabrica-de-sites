# Convenções de Código

As regras de escrita que mantêm o código consistente e legível. A meta: **código novo deve
parecer escrito pela mesma pessoa que escreveu o resto** — mesma nomenclatura, mesma
densidade de comentários, mesmos idiomas.

## Nomenclatura (PEP 8 + convenções do projeto)

| Padrão | Uso | Exemplos |
|--------|-----|----------|
| `snake_case` | funções, variáveis, módulos | `run_scout`, `build_business`, `osm_type` |
| `PascalCase` | classes | `BusinessSource`, `DomainGuesser`, `ScoutRun` |
| `SCREAMING_SNAKE` | constantes de módulo | `SCORE_WEIGHTS`, `_STOP_PT`, `SERPER_API_KEY` |
| `_prefixo` | privado ao módulo (convenção) | `_is_social`, `_checar_dominio`, `_SOCIAL_DOMAINS` |

Nomes **descritivos** onde a intenção não é óbvia (`_nome_vale_tentar`, `gerar_candidatos`);
curtos onde o contexto deixa claro (`for b in negocios:` — `b` é Business).

## Type hints + `from __future__ import annotations`

Todo arquivo abre com `from __future__ import annotations`
([PEP 563](https://peps.python.org/pep-0563/)). As anotações viram strings (avaliação
adiada), o que permite sintaxe moderna mesmo em versões mais antigas e evita problemas de
referência circular:

```python
from __future__ import annotations
# Graças ao import, isto funciona sem importar Optional/List:
def _similar(a: str | None, b: str | None, threshold: float = 0.45) -> bool: ...
def fetch(self, cidade: str, limit: int | None = None) -> list[RawPlace]: ...
```

Tipamos parâmetros, retornos e variáveis locais cujo tipo não é óbvio:

```python
vistos_ids: set[tuple[str, int]] = set()
brutos_por_fonte: list[tuple[str, list[RawPlace]]] = []
```

## Estilo e formatação (PEP 8 / Ruff)

Seguimos [PEP 8](https://peps.python.org/pep-0008/), com **Ruff** como linter
(`line-length = 99`, imports ordenados, sintaxe moderna). Exceções amplas são silenciadas
**explicitamente**, documentando a intenção:

```python
except Exception as exc:  # noqa: BLE001 — tentamos o próximo espelho
    ultimo_erro = exc
    continue
```

Imports em três grupos (stdlib · terceiros · projeto):

```python
from __future__ import annotations
import re                                  # stdlib
import httpx                               # terceiros
from .... import config                    # projeto
from ....models import Business
```

## Padrões recorrentes

### `_first()` — primeiro valor presente entre chaves
Evita repetir a lógica "pega o primeiro campo que existir":

```python
_PHONE_TAGS = ("contact:phone", "phone", "contact:mobile", "phone:mobile")
def _first(tags, chaves):
    for k in chaves:
        if (v := tags.get(k)):
            return v.strip()
    return None
```

### `frozenset` para *membership* O(1)
```python
_STOP_PT = frozenset("de da do das dos e a o ...".split())   # 'x in _STOP_PT' é O(1)
```

### Dict comprehension para indexar e atualizar por posição
```python
alvos = {i: b for i, b in enumerate(businesses)
         if b.site_status is SiteStatus.SEM_SITE and b.nome and _nome_vale_tentar(b.nome)}
```

### Imutabilidade com `model_copy`
Enrichers não mutam o objeto recebido — devolvem uma cópia atualizada (função pura, fácil de
testar). Ver [`domain_guesser._rescore`](https://github.com/hectorautomacoesdev/fabrica-de-sites/blob/main/src/fabrica_sites/agents/scout/enrichers/domain_guesser.py).

### Configuração centralizada
Nenhum número mágico no meio da lógica — tudo em `config.py`.

## Docstrings
Cada módulo abre com um docstring que explica **o que** faz e, quando há sutileza, o
**porquê** e as **limitações**. O `domain_guesser.py` é o melhor exemplo (seções
PROBLEMA / ESTRATÉGIA / LIMITAÇÕES). É a documentação que sobrevive ao tempo — e a mesma que
alimenta a [Referência de API](../referencia-api.md) via mkdocstrings.

## Autoavaliação honesta (o que melhorar)

- **`httpx.Client` por chamada** no DomainGuesser — o ideal é um cliente por thread com
  *connection pool*. Impacto pequeno na escala atual.
- **Dedup por nome** roda também dentro da mesma fonte — poderia ser só *cross-source*.
- **Sem cache** de domínios entre execuções — um cache com TTL economizaria requests.

Esses pontos estão registrados para a reestruturação — ver [Roadmap](../roadmap.md).

## Referências

- [PEP 8 — Style Guide](https://peps.python.org/pep-0008/) ·
  [PEP 484 — Type Hints](https://peps.python.org/pep-0484/) ·
  [PEP 563 — Postponed Evaluation](https://peps.python.org/pep-0563/)
- [Ruff](https://docs.astral.sh/ruff/) · [mypy](https://mypy.readthedocs.io/)
