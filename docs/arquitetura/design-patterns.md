# Design Patterns

Os padrões de projeto que usamos (e os que vamos usar na reestruturação), com o **código
real** do projeto e referências. A regra que seguimos: *só introduzir um padrão quando ele
resolve um problema concreto* — padrão por padrão é complexidade à toa.

## Backend

### Strategy / Plugin Pattern — fontes e enriquecedores

**Problema:** queremos trocar/empilhar fontes de dados (OSM, Serper, Places) e
pós-processadores sem reescrever o pipeline.
**Solução:** definir um contrato abstrato (ABC) e fazer o orquestrador depender só do
contrato, nunca da implementação concreta.

```python title="src/fabrica_sites/agents/scout/sources/base.py"
class BusinessSource(ABC):
    """Contrato de uma fonte de negócios locais."""
    name: str = "desconhecida"

    @abstractmethod
    def fetch(self, cidade: str, admin_level: int = 8,
              limit: int | None = None) -> Iterable[RawPlace]:
        raise NotImplementedError
```

O orquestrador trabalha apenas com a interface:

```python title="src/fabrica_sites/agents/scout/scout.py"
for src in lista_fontes:                 # (1)!
    raw_list = list(src.fetch(cidade, admin_level=admin_level, limit=limit))
    brutos_por_fonte.append((src.name, raw_list))
```

1.  `lista_fontes` pode conter `OverpassSource`, `SerperSource` ou qualquer futura
    implementação — o laço não muda.

!!! success "Open/Closed Principle"
    O pipeline está **aberto para extensão** (nova fonte = nova classe) e **fechado para
    modificação** (`scout.py` não muda). É o "O" do SOLID, viabilizado por ABCs.

### Repository Pattern — isolar o acesso a dados *(reestruturação)*

**Problema:** hoje o `db.py` mistura SQL cru com a lógica de gravação. Conforme a API
cresce, queremos consultas filtradas sem espalhar SQL pelo código.
**Solução:** um **repositório** expõe métodos de domínio (`save_run`, `list_businesses(filtros)`)
e esconde *como* os dados são buscados. O service layer pede ao repositório; nunca escreve SQL.

```python title="Alvo (SQLModel) — esboço"
class RunRepository:
    def __init__(self, session: Session):
        self.session = session

    def save(self, run: ScoutRun) -> int: ...
    def get(self, run_id: int) -> RunRow | None: ...
    def list_businesses(self, run_id: int, *, setor=None, status=None,
                        score_min=0, contactavel=None, busca=None,
                        offset=0, limit=50) -> list[BusinessRow]: ...
```

### Service Layer — orquestração reutilizável *(reestruturação)*

**Problema:** CLI e API precisam da mesma sequência "rodar scout → persistir → calcular
insights". Duplicar isso levaria a divergência.
**Solução:** um **service** encapsula o caso de uso e é consumido por ambos os clientes.

```python title="Alvo — esboço"
def executar_scout(cidade: str, *, com_serper=False, enriquecer=False,
                   limit=None) -> RunResumo:
    run = run_scout(cidade, sources=montar_fontes(com_serper),
                    enrichers=montar_enrichers(enriquecer), limit=limit)
    run_id = repo.save(run)
    return RunResumo(run_id=run_id, **insighter.compute(run)["kpis"])
```

### Dependency Injection — `Depends` do FastAPI *(reestruturação)*

**Problema:** endpoints precisam de uma sessão de banco/repositório, sem criar acoplamento
nem dificultar testes.
**Solução:** o FastAPI injeta dependências por assinatura. Em teste, troca-se a dependência
por uma versão fake — sem mexer no endpoint.

```python title="Alvo — esboço"
@router.get("/runs/{run_id}/businesses")
def listar(run_id: int, filtros: Filtros = Depends(),
           repo: RunRepository = Depends(get_repo)):
    return repo.list_businesses(run_id, **filtros.model_dump())
```

### DTO vs Modelo de domínio/banco

**Problema:** o formato que a API expõe nem sempre é o formato do banco (campos internos,
`raw_tags`, etc.).
**Solução:** **DTOs** (schemas Pydantic de entrada/saída) separados dos **models** de banco
(SQLModel). A camada de API converte um no outro. Mantém o contrato público estável mesmo
que o banco mude.

## Frontend (React)

### Composição de componentes + container/apresentação

Componentes pequenos e combináveis. Os de **apresentação** só recebem `props` e renderizam;
os de **container** (ou *hooks*) cuidam de dados e estado. Facilita reuso e teste.

### Custom hooks — encapsular lógica reutilizável

```tsx title="Alvo — esboço"
function useRun(runId: number) {
  return useQuery({
    queryKey: ["run", runId],
    queryFn: () => api.getRun(runId),
  });
}
```

### Server-state vs client-state (TanStack Query)

**Problema:** dados que vêm da API (lista de negócios, KPIs) têm cache, revalidação,
estados de carregando/erro. Tratar isso "na mão" com `useState/useEffect` vira boilerplate
e bugs.
**Solução:** **TanStack Query** gerencia o *server-state* (cache, refetch, loading/erro);
o `useState` fica só para o *client-state* (filtros selecionados, abas).

### Fluxo de dados unidirecional

Estado flui de cima para baixo (props); eventos sobem por callbacks. Previsível e fácil de
depurar — princípio central do React.

## Referências

- Refactoring Guru — [Strategy](https://refactoring.guru/design-patterns/strategy) ·
  [catálogo de padrões](https://refactoring.guru/design-patterns/catalog)
- Martin Fowler — [Repository](https://martinfowler.com/eaaCatalog/repository.html) ·
  [Service Layer](https://martinfowler.com/eaaCatalog/serviceLayer.html) ·
  [Data Transfer Object](https://martinfowler.com/eaaCatalog/dataTransferObject.html)
- FastAPI — [Dependencies / `Depends`](https://fastapi.tiangolo.com/tutorial/dependencies/)
- React — [Pensando em React](https://react.dev/learn/thinking-in-react) ·
  [Reutilizando lógica com hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- TanStack Query — [Visão geral](https://tanstack.com/query/latest/docs/framework/react/overview)
- Python — [`abc` (Abstract Base Classes)](https://docs.python.org/3/library/abc.html)
