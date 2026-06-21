// Registro do conteúdo Markdown.
// FONTE ÚNICA: a pasta `docs/` na raiz do repositório — a MESMA que alimenta o site MkDocs.
// Cada .md é importado como string crua (?raw do Vite). Não há mais cópias aqui: editar em
// `docs/` atualiza tanto o site MkDocs quanto esta documentação React.
// Páginas que no MkDocs são divididas em vários arquivos (arquitetura, código) são
// concatenadas aqui numa página só. Páginas visuais (Estrutura, Evolução, Bibliotecas) são
// componentes React e não passam por aqui.
import arquiteturaIndex from '../../../docs/arquitetura/index.md?raw'
import arquiteturaPatterns from '../../../docs/arquitetura/design-patterns.md?raw'
import arquiteturaBanco from '../../../docs/arquitetura/banco-de-dados.md?raw'
import frontendReact from '../../../docs/frontend.md?raw'
import resumo from '../../../docs/resumo.md?raw'
import boasPraticas from '../../../docs/boas-praticas.md?raw'
import codigoIndex from '../../../docs/codigo/index.md?raw'
import codigoConvencoes from '../../../docs/codigo/convencoes.md?raw'
import testes from '../../../docs/testes.md?raw'
import decisoes from '../../../docs/decisoes.md?raw'
import roadmap from '../../../docs/roadmap.md?raw'
import relatorios from '../../../docs/relatorios/index.md?raw'
import fonteUnica from '../../../docs/fonte-unica.md?raw'
import planoBaseSolida from '../../../docs/plano-base-solida.md?raw'
import publicacaoCicd from '../../../docs/publicacao-ci-cd.md?raw'
import escalaNuvem from '../../../docs/escala-nuvem.md?raw'
import cnpjVisaoGeral from '../../../docs/cnpj-visao-geral.md?raw'
import cnpjDadosAbertos from '../../../docs/cnpj-dados-abertos.md?raw'
import cnpjDownload from '../../../docs/cnpj-download.md?raw'
import cnpjEtlFerramentas from '../../../docs/cnpj-etl-ferramentas.md?raw'
import cnpjArquitetura from '../../../docs/cnpj-arquitetura.md?raw'
import planoAuditor from '../../../docs/plano-auditor-benchmark.md?raw'
import auditorPesquisa from '../../../docs/auditor-benchmark-pesquisa.md?raw'
import designPesquisa from '../../../docs/design-referencias-pesquisa.md?raw'
import planoFrontendBi from '../../../docs/plano-refatoracao-frontend-bi.md?raw'
import biFrontendPesquisa from '../../../docs/bi-frontend-pesquisa.md?raw'

// Junta vários arquivos numa única página React (com separador visual).
const join = (...parts: string[]) => parts.join('\n\n---\n\n')

export const MD_CONTENT: Record<string, string> = {
  'fonte-unica': fonteUnica,
  arquitetura: join(arquiteturaIndex, arquiteturaPatterns, arquiteturaBanco),
  react: frontendReact,
  resumo,
  'boas-praticas': boasPraticas,
  codigo: join(codigoIndex, codigoConvencoes),
  testes,
  decisoes,
  roadmap,
  relatorios,
  'plano-base-solida': planoBaseSolida,
  'publicacao-ci-cd': publicacaoCicd,
  'escala-nuvem': escalaNuvem,
  'cnpj-visao-geral': cnpjVisaoGeral,
  'cnpj-dados-abertos': cnpjDadosAbertos,
  'cnpj-download': cnpjDownload,
  'cnpj-etl-ferramentas': cnpjEtlFerramentas,
  'cnpj-arquitetura': cnpjArquitetura,
  'plano-auditor-benchmark': planoAuditor,
  'auditor-benchmark-pesquisa': auditorPesquisa,
  'design-referencias-pesquisa': designPesquisa,
  'plano-refatoracao-frontend-bi': planoFrontendBi,
  'bi-frontend-pesquisa': biFrontendPesquisa,
}
