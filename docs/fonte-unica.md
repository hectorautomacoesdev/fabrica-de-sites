# Documentação de fonte única (MkDocs + React)

Esta página documenta **a própria documentação**: como mantemos *dois* sites de doc — um
**MkDocs** (publicado, para qualquer um abrir no navegador) e um **React** (rico, rodado
local) — sem duplicar conteúdo. É um padrão que vale a pena **reaproveitar em outros
projetos**, então no fim há um *playbook* passo a passo.

> **❝ A ideia em uma frase** — existe **um único conteúdo** (Markdown na pasta `docs/`) e
> **dois renderizadores** leem o mesmo arquivo. Você edita num lugar só; os dois atualizam.

## O problema que isso resolve

Tínhamos duas documentações que **forkaram**: o MkDocs lia `docs/*.md` e o app React tinha
**cópias próprias** em `docs-app/src/content/`. Editar uma não mexia na outra; o conteúdo
divergiu (tamanhos diferentes, páginas faltando de cada lado). Manter os dois à mão é o
anti-padrão clássico de "duas fontes da verdade".

## A solução: um conteúdo, dois renderizadores

```text
                ┌─────────────────────────┐
                │   docs/*.md (FONTE ÚNICA)│
                └─────────────┬───────────┘
            lê o mesmo arquivo │
              ┌────────────────┴───────────────┐
              ▼                                 ▼
   MkDocs (build estático)            React (import ?raw em build)
   site público no GitHub Pages       app local rico (gráficos, tema)
   abre no navegador, sem baixar      baixar e rodar (npm run dev)
```

O denominador comum é o **Markdown**: o MkDocs *só* renderiza Markdown; o React renderiza
Markdown **e** componentes. Por isso a fonte tem de ser Markdown — é o que os dois entendem.

### As 5 peças que fazem funcionar

1. **`docs/` é a casa do conteúdo.** Nenhuma cópia em `docs-app/`. O React importa os
   arquivos com `?raw` do Vite (`docs-app/src/content/index.ts` → `import x from '../../../docs/x.md?raw'`).
2. **Sintaxe portável nas páginas compartilhadas.** Diagramas em **ASCII** e caixas de
   destaque em **citação** (`>`) renderizam igual nos dois. Mermaid e `!!!` (admonitions) só
   funcionam no MkDocs, então ficam **apenas** nas páginas que só o MkDocs mostra.
3. **Reescritor de links.** O conteúdo usa links estilo MkDocs (`decisoes.md`); o React
   converte para a rota do HashRouter (`#/decisoes`) em tempo de render
   (`docs-app/src/components/Markdown.tsx`). Links para páginas que só existem no MkDocs
   abrem o site publicado, em vez de quebrar.
4. **Páginas visuais têm um "gêmeo estático".** Estrutura e Evolução são componentes React
   (com gráficos); para o site online existe uma versão `.md` equivalente em conteúdo. É a
   única duplicação consciente — restrita a páginas de baixa mudança.
5. **CI builda os dois.** A cada `git push`, o GitHub Actions republica o MkDocs **e**
   builda o app React (garante que o template que as pessoas baixam nunca quebra ao ler
   `docs/`). Ver [Publicação & CI/CD](publicacao-ci-cd.md).

## Trade-offs assumidos (honestidade)

- **Diagramas das páginas compartilhadas viram ASCII** — mais simples que o Mermaid do
  MkDocs, mas idênticos nos dois renderizadores e sem peso extra no React.
- **Um pingo de duplicação** nas páginas visuais (componente React + `.md` estático).
  Aceito porque são páginas que quase não mudam.
- **O React lê o conteúdo em tempo de *build*** — quem baixou o template vê o conteúdo
  congelado no commit que pegou; um `git pull` + rebuild traz o conteúdo novo.

## Playbook — como reproduzir em outro projeto

Receita curta para montar fonte única "MkDocs + app próprio" do zero:

1. **Escolha o Markdown como fonte** e ponha tudo numa pasta (ex.: `docs/`).
2. **MkDocs lê essa pasta nativamente.** Configure `mkdocs.yml` + deploy no GitHub Pages
   por Actions (`mkdocs build --strict` para barrar link quebrado).
3. **O app rico importa os mesmos arquivos** (no Vite, `import md from '../docs/x.md?raw'`;
   libere a pasta com `server.fs.allow`).
4. **Padronize a sintaxe** no que os dois renderizam: ASCII para diagramas, citação para
   destaques. Guarde recursos exclusivos (Mermaid etc.) para páginas de um renderizador só.
5. **Converta links no app** (`.md` → rota interna) num componente de link.
6. **Para telas que são componentes** (gráficos), mantenha um `.md` estático equivalente
   para o site público.
7. **Faça o CI buildar os dois** a cada push — o site publica, e o build do app valida que
   ele ainda compila lendo a fonte.

> **ℹ Por que vale a pena** — você ganha um site público "clica e vê" (ótimo para mostrar a
> terceiros) **e** um app próprio rico, pagando o custo de manter **um** conteúdo. É o melhor
> dos dois mundos sem o imposto da duplicação.

Decisão registrada em [Decisões (ADRs)](decisoes.md) (D18).
