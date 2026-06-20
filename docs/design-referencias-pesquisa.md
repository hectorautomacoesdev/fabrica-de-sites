# Dossiê de Design/UX — Painel do Scout + Referências de Sites Institucionais

> Pesquisa para o projeto **Fábrica de Sites** (Guarujá/SP).
> Stack atual confirmada: **Vite 8 + React 19 + TypeScript 6 + TanStack Query 5 + axios**, com **CSS puro** (sem framework de UI, sem lib de charts).
> Data da pesquisa: 2026-06-20. Estrelas do GitHub coletadas via API nesta data (números mudam com o tempo).

---

## 1. Resumo executivo

O painel do Scout hoje é uma tabela filtrável. Para virar uma ferramenta de **prospecção** de verdade, o salto de maior valor é adotar o padrão **master-detail com drawer lateral**: mantém a tabela como visão de varredura e abre um painel de detalhe do lead (resumo da empresa, redes sociais, ações rápidas) sem trocar de página nem perder o contexto da lista. É o padrão que Twenty, Linear e a maioria dos CRMs modernos usam.

As ações que o Hector pediu — abrir LinkedIn/Instagram, ver resumo, mandar WhatsApp — são quase todas **client-side e não dependem da API**: um link `wa.me` bem montado e um detector de rede social por domínio resolvem boa parte. O painel deve ser **graceful**: cada campo que faltar (telefone, site, redes) simplesmente esconde a ação correspondente, sem quebrar.

Sobre **biblioteca de UI**, a recomendação de **menor atrito** é: **não trocar o CSS puro por um framework agora**. Adotar **shadcn/ui (Radix + Tailwind, código copiado para o repo)** apenas para os componentes interativos que dão trabalho de fazer à mão e são sensíveis a acessibilidade — **Drawer/Dialog, Dropdown, Tooltip** (esses três justificam o Radix sozinhos) — e, para gráficos, **Recharts** (ou os charts do próprio shadcn, que são Recharts por baixo). Isso evita reescrever a tela e o CSS existente, e ainda dá controle total sobre o estilo. Mantine é a alternativa "tudo pronto" mais forte caso se prefira um pacote único; o custo é trazer um sistema de estilo paralelo ao CSS atual.

Para a **Frente B** (o que é um "site institucional bom"), os padrões que mais geram confiança em 2025–2026 são consistentes entre setores: **hero claro com proposta de valor + CTA**, **fotos reais** (não banco de imagem genérico), **prova social** (avaliações Google, depoimentos), **mobile-first e carregamento rápido**, **contato/WhatsApp sempre acessível** e, por setor, blocos específicos (cardápio, agendamento, galeria de serviços, mapa). Isso vira tanto o checklist de "site bom" quanto o briefing do futuro agente gerador.

---

## 2. Painel de leads — padrões de UI recomendados

### 2.1 O padrão central: master-detail com drawer

- **Master (lista)**: a tabela atual de negócios continua sendo a visão de varredura. Cada linha é clicável.
- **Detail (drawer)**: ao clicar numa linha, abre um **painel lateral deslizante (drawer) pela direita** com o detalhe do lead, **sobrepondo a lista** (não substituindo a página). A lista permanece visível/contextualizada atrás.
- Por que drawer e não página nova: preserva o estado dos filtros, evita navegação ida-e-volta, e o Hector consegue "passar" de lead em lead rápido (setas ↑/↓ para navegar entre linhas com o drawer aberto é um ganho enorme de produtividade).
- Em telas largas, uma variação é **split view fixo** (lista à esquerda 40%, detalhe à direita 60%). O drawer é mais simples de implementar primeiro e funciona melhor no mobile; recomendo começar pelo drawer.

### 2.2 Conteúdo do painel de detalhe (graceful quando faltar dado)

Organize em blocos; **cada bloco só aparece se houver dado**:

1. **Cabeçalho**: nome do negócio, setor (badge), **score** com indicador visual (ver 2.4), status de site (badge: "sem site" / "site fraco" / "tem site").
2. **Ações rápidas** (barra fixa no topo do drawer): `WhatsApp`, `Ligar` (`tel:`), `Copiar telefone`, `Abrir site`, `Abrir no Maps`. Botões que não têm dado ficam **desabilitados ou ocultos**.
3. **Resumo da empresa**: texto curto (quando a API fornecer; senão, área vazia com placeholder discreto "Resumo ainda não disponível").
4. **Redes sociais**: chips/ícones detectados a partir das URLs (Instagram, Facebook, LinkedIn, Linktree) — ver seção 5. Cada chip abre em nova aba e mostra o @handle quando extraível.
5. **Contato**: telefone, endereço, link do site.
6. **Metadados/pipeline**: status de prospecção (novo / contatado / interessado / fechado), notas — mesmo que ainda só local.

### 2.3 Filtros, busca e ações na lista

- **Busca textual** no topo (nome/setor) com debounce.
- **Filtros avançados** como chips/segmented controls: status de site, faixa de score (slider ou faixas hot/warm/cold), setor, "tem WhatsApp", "tem rede social". Filtros aplicados aparecem como **chips removíveis** ("filtros ativos").
- **Ordenação por coluna** (score desc é o default natural para prospecção).
- **Ações rápidas direto na linha** (hover ou coluna fixa de ações): WhatsApp e copiar telefone sem precisar abrir o drawer.
- **KPIs no topo** (já existem): total de leads, % sem site, score médio, novos hoje.

### 2.4 Lead scoring visual

- **Escala de cor por temperatura** (convenção de CRM): 0–40 frio (cinza/azul), 41–70 morno (amarelo/laranja), 71–100 quente (verde ou vermelho-quente). Use **cor + número + rótulo** ("Quente 87") — nunca só cor (acessibilidade/daltonismo).
- Formatos: **badge colorido**, **barra de progresso fina** sob o número, ou **anel/donut** pequeno. Comece pelo badge + número (mais barato).
- Mantenha **consistência de significado de cor** com o resto do app (verde = bom/quente para prospecção).

### 2.5 Esboço ASCII — layout master-detail com drawer

```
┌───────────────────────────────────────────────────────────────────────┐
│  Painel do Scout                                      [☀/🌙 tema]  [⚙]  │
├───────────────────────────────────────────────────────────────────────┤
│  KPIs:  [ 312 leads ]  [ 68% sem site ]  [ score médio 54 ]  [ +9 hoje ]│
├───────────────────────────────────────────────────────────────────────┤
│  🔎 Buscar...        Filtros: (Setor ▾)(Status site ▾)(Score: ●Hot )    │
│  Filtros ativos: [Sem site ✕] [Score ≥ 70 ✕]                            │
├───────────────────────────────────────────────────────────────────────┤
│  NOME              SETOR       SITE     SCORE   AÇÕES                    │
│  ───────────────────────────────────────────────────  ┌──────────────────────────────────┐
│  Padaria Sol       Alimentação Sem site [87 🟢] 📱 📋  │  ✕  Padaria Sol                   │
│  Studio Bella      Beleza      Fraco    [72 🟡] 📱 📋  │  Alimentação · Sem site · [87 🟢] │
│ >Clínica Mar  ◀────(selecionada)────────[65 🟡] 📱 📋  │  ┌──────────────────────────────┐ │
│  Hotel Praia       Hotelaria   Tem site [40 ⚪] 📱 📋  │  │📱WhatsApp │☎Ligar │📋 │🌐│📍│ │
│  Academia Fit      Fitness     Sem site [58 🟡] 📱 📋  │  └──────────────────────────────┘ │
│  ...                                                   │  RESUMO                          │
│                                                        │  Clínica odontológica no centro… │
│                                                        │  REDES                           │
│   (lista continua visível atrás do drawer)            │  [📷 @clinicamar] [in/clinica-mar]│
│                                                        │  CONTATO                         │
│                                                        │  (13) 9 9999-9999 · Rua X, 123   │
│   Use ↑/↓ para navegar entre leads sem fechar ────────│  PIPELINE  [Novo ▾]  + nota      │
│                                                        └──────────────────────────────────┘
└───────────────────────────────────────────────────────────────────────┘
```

(O drawer entra pela direita sobre a lista; em mobile ele ocupa a tela inteira.)

---

## 3. CRMs/admin open-source de referência

Estrelas aproximadas coletadas via GitHub API em 2026-06-20.

| Nome | Link | ★ aprox. | Ideia aproveitável |
|---|---|---|---|
| **Twenty CRM** | https://github.com/twentyhq/twenty | ~50.8k | A melhor referência direta: React + drawer/record page por registro, tabela densa estilo planilha, command menu, kanban de pipeline, design minimalista. "Roubar": layout master-detail, ações por linha, navegação por teclado, visual de tabela limpa. |
| **ERPNext (Frappe)** | https://github.com/frappe/erpnext | ~35.9k | Suite ERP completa; bom para ver **list view + form view** clássicos, filtros salvos e bulk actions. Mais pesado/empresarial — pegar ideias de filtros e visões salvas, não o visual. |
| **Refine** | https://github.com/refinedev/refine | ~34.9k | Framework React para admin/CRUD (headless, plugável com Ant/MUI/Mantine/shadcn). Não é UI pronta: vale como **arquitetura** de telas data-driven (list/show/edit) e integração com data providers (combina com TanStack Query). |
| **shadcn/ui** | https://github.com/shadcn-ui/ui | ~117k | Não é CRM, é a coleção de componentes (Radix+Tailwind) copiáveis. Tem **blocks/dashboards** prontos (tabela com TanStack Table, cards de KPI, drawer/sheet). "Roubar": código direto de Sheet (drawer), DataTable, Command. |
| **Mantine** | https://github.com/mantinedev/mantine | ~31.3k | Lib de componentes completa e muito boa em forms, Drawer, Spotlight (command palette), DataTable (via mantine-datatable). Alternativa "tudo pronto" se não quiser montar componente a componente. |
| **Tabler** | https://github.com/tabler/tabler | ~41.2k | Dashboard/admin template (Bootstrap, HTML). Não combina com a stack React, mas é uma **mina de referência visual** de layouts de dashboard, cards e tabelas. Olhar, não importar. |
| **AppFlowy** | https://github.com/AppFlowy-IO/AppFlowy | ~72.7k | Notion open-source (Flutter/Rust). Não reaproveitável em código, mas referência de **views múltiplas do mesmo dado** (grid/board/calendar) e detalhe em painel. |
| **Tremor** | https://github.com/tremorlabs/tremor | ~3.5k | Componentes de dashboard/charts (Tailwind). Charts e KPI cards prontos. ★ baixou porque o projeto foi reposicionado (ver seção 4). |

Observação honesta: a referência nº 1 a estudar é **Twenty** (mesma stack, mesmo problema). shadcn/ui é a fonte nº 1 de **código** reaproveitável.

---

## 4. Bibliotecas de UI/charts para a stack — comparação + recomendação

Contexto crítico: hoje é **CSS puro**, sem Tailwind, sem framework. Qualquer escolha precisa **conviver com o CSS existente** sem obrigar reescrita.

### 4.1 Componentes de UI

| Opção | Modelo | Prós dado o CSS puro atual | Contras |
|---|---|---|---|
| **shadcn/ui** (Radix + Tailwind, código copiado) | Você copia o componente pro repo | Adoção **incremental** (1 componente por vez); controle total do estilo; Radix resolve acessibilidade de Drawer/Dialog/Dropdown/Tooltip de graça | Traz **Tailwind** para o projeto (precisa configurar; pode coexistir com CSS puro, mas é um 2º sistema de estilo) |
| **Radix Primitives puro** (sem Tailwind) | Lib headless (npm) | A11y de ponta **sem** trazer Tailwind; você estiliza com seu CSS puro atual | Você escreve todo o CSS dos componentes (mais trabalho que shadcn) |
| **Mantine** | Lib completa (npm) | Tudo pronto (Drawer, Spotlight, DataTable, forms, dark mode embutido); produtividade alta | Sistema de estilo próprio paralelo ao seu CSS; bundle maior; "cara" de Mantine |
| **Chakra UI** | Lib completa (npm) | DX boa, acessível, theming | CSS-in-JS historicamente; menos alinhado a um projeto CSS-puro enxuto |

### 4.2 Charts

| Opção | ★ aprox. | Quando usar |
|---|---|---|
| **Recharts** | ~27.3k | Padrão de mercado para React; componível; cobre KPIs/linhas/barras/pizza. **Recomendado** — é o que o shadcn usa por baixo nos "charts". |
| **Tremor** | ~3.5k | KPI cards + charts prontos e bonitos, mas atrelado a Tailwind e em transição. Bom se já adotar Tailwind/shadcn. |
| **visx** (Airbnb) | ~20.9k | Baixo nível (D3 + React). Poderoso, porém muito mais trabalho. Só se precisar de viz custom. |

### 4.3 Recomendação de menor atrito (faseada)

1. **Fase 0 — não trocar nada estrutural.** Continue no CSS puro para o que já funciona (tabela, KPIs, layout).
2. **Fase 1 — trazer só o que é difícil/sensível a a11y.** Adotar **shadcn/ui** (Radix+Tailwind) **apenas** para: **Sheet (drawer)**, **Dialog**, **DropdownMenu**, **Tooltip**, **Command** (busca/atalho). Esses justificam o Radix sozinhos — fazer drawer acessível à mão (foco preso, ESC, ARIA) é caro e dá bug.
   - Tailwind pode ser introduzido em modo "convivência": ele estiliza só os componentes novos; seu CSS atual segue valendo.
   - Alternativa se quiser **evitar Tailwind**: usar **Radix Primitives puro** e estilizar com seu CSS — mais trabalho, zero Tailwind.
3. **Fase 2 — charts.** Adicionar **Recharts** quando os KPIs virarem gráficos.
4. **Quando considerar Mantine**: se o escopo crescer (muitos forms, multi-view, agenda) e a produtividade "tudo pronto" passar a compensar a coexistência de estilos. Para o salto atual (drawer + ações + scoring visual), **não é necessário**.

Resumo: **shadcn/ui (Radix) para os 4–5 componentes interativos + Recharts para gráficos**, mantendo o CSS puro como base. Menor reescrita, melhor acessibilidade, controle total do visual.

---

## 5. WhatsApp click-to-chat + detecção de redes sociais

### 5.1 WhatsApp `wa.me` — formato e normalização BR

Formato oficial (sem `+`, sem espaços, sem traços; mensagem URL-encoded):

```
https://wa.me/<DDI><DDD><NUMERO>?text=<mensagem url-encoded>
Ex.: https://wa.me/5513999998888?text=Ol%C3%A1%2C%20vi%20que%20o%20seu%20neg%C3%B3cio...
```

Pontos de atenção do Brasil:
- **DDI 55** sempre.
- Celular tem o **9º dígito** (móvel começa com 9). Para *montar o link* o mais seguro é **manter o número como está** (com o 9) — o WhatsApp resolve a maioria dos casos. A inconsistência do "9" afeta principalmente o WhatsApp ID interno em DDDs fora de SP/RJ/ES; para click-to-chat costuma funcionar enviar com o 9.
- **Não** enviar `+`, parênteses, espaços ou traço no número do link.
- Sempre **`encodeURIComponent`** no texto (espaço vira `%20`, acentos/`?`/`:` também).

Exemplo de normalização e montagem (TypeScript):

```ts
/** Normaliza telefone BR para o formato do wa.me: só dígitos, com DDI 55. */
export function toWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, ""); // remove (), -, espaços, +
  if (!digits) return null;
  // Já veio com DDI 55 (12 ou 13 dígitos: 55 + DDD + 8/9 dígitos)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  // Veio só DDD + número (10 ou 11 dígitos) -> prefixa 55
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }
  return null; // formato não reconhecido -> esconder ação WhatsApp (graceful)
}

export function whatsappLink(raw: string, message?: string): string | null {
  const num = toWhatsAppNumber(raw);
  if (!num) return null;
  const base = `https://wa.me/${num}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Mensagem pré-preenchida sugerida (personalizável por lead):
// `Olá! Aqui é o Hector. Vi que a ${nome} ainda não tem site e preparei uma prévia...`
```

Boas práticas: usar **número comercial** (não pessoal) ao expor links; manter a mensagem curta, personalizada e com identificação; se o número não normalizar, **esconder o botão** em vez de gerar link quebrado.

### 5.2 Detecção de rede social a partir de uma URL

Identifique a plataforma pelo **hostname** e extraia o **@handle** do path. Referências de regex maduras:
- `lorey/social-media-profiles-regexs` — https://github.com/lorey/social-media-profiles-regexs (coleção de regex por plataforma)
- `mbparvezme/social-url-username-regex` — https://github.com/mbparvezme/social-url-username-regex (valida e extrai username de URL)
- NPM `@elevatormedia/socialite` — extrai username de URLs e monta URLs a partir de username

Abordagem prática (robusta e simples) — usar `URL` para o hostname e um mapa por plataforma:

```ts
type Social = { platform: string; handle?: string; url: string; icon: string };

export function detectSocial(rawUrl: string): Social | null {
  let u: URL;
  try { u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`); }
  catch { return null; } // URL inválida -> graceful, não mostra chip

  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const seg = u.pathname.split("/").filter(Boolean); // segmentos do path

  // Instagram: instagram.com/<handle>  (ignora reel/p/explore)
  if (host.endsWith("instagram.com")) {
    const h = seg[0];
    const reserved = new Set(["p", "reel", "reels", "explore", "stories"]);
    return { platform: "Instagram", icon: "📷", url: rawUrl,
             handle: h && !reserved.has(h) ? `@${h}` : undefined };
  }
  // Facebook: facebook.com/<page> ou /profile.php?id=
  if (host.endsWith("facebook.com") || host.endsWith("fb.com")) {
    const h = seg[0];
    const reserved = new Set(["profile.php", "people", "pages", "groups"]);
    return { platform: "Facebook", icon: "👍", url: rawUrl,
             handle: h && !reserved.has(h) ? h : undefined };
  }
  // LinkedIn: /company/<slug> ou /in/<slug>
  if (host.endsWith("linkedin.com")) {
    const kind = seg[0]; // "company" | "in"
    const slug = seg[1];
    return { platform: "LinkedIn", icon: "in", url: rawUrl,
             handle: slug ? `${kind}/${slug}` : undefined };
  }
  // Linktree: linktr.ee/<handle>
  if (host.endsWith("linktr.ee")) {
    return { platform: "Linktree", icon: "🌳", url: rawUrl, handle: seg[0] ? `@${seg[0]}` : undefined };
  }
  return null; // domínio desconhecido -> tratar como "site/genérico"
}
```

Notas: tratar `www.` e subdomínios; ignorar paths "reservados" (`/p/`, `/reel/`, `/profile.php`) para não exibir handle errado; quando não conseguir extrair handle, **mostrar só o ícone clicável** (graceful). Se a empresa só tem um link genérico, mostrar como "Site/Link".

---

## 6. Acessibilidade e microinterações — checklist

Estados de dados:
- [ ] **Loading**: usar **skeleton** para carregamento de conteúdo (tabela, detalhe); spinner só para ações curtas. Skeleton com `aria-hidden`/`role="img"` + `aria-label="carregando"`; respeitar `prefers-reduced-motion` (sem shimmer animado quando reduzido).
- [ ] **Empty state**: mensagem clara + ilustração leve + **ação** ("Ajustar filtros" / "Limpar busca"). Quando o vazio surge de uma ação do usuário, anunciar via região `aria-live="polite"`.
- [ ] **Erro**: mensagem amigável + botão "Tentar de novo" (TanStack Query já dá `isError`/`refetch`).

Foco e teclado:
- [ ] Drawer/Dialog: **focus trap** (foco preso dentro), **ESC fecha**, foco volta ao gatilho ao fechar. (Radix faz isso de graça.)
- [ ] Navegar a lista por teclado: ↑/↓ entre linhas, Enter abre detalhe.
- [ ] Todos os botões de ação alcançáveis por Tab; foco visível (anel de foco, não `outline:none` sem substituto).

Cor, contraste e tema:
- [ ] Contraste mínimo **WCAG AA** (4.5:1 texto normal). Cuidado com badges amarelos sobre branco.
- [ ] **Nunca** transmitir status só por cor — sempre cor **+ rótulo/ícone** (score, status de site, temperatura do lead).
- [ ] **Dark mode**: definir paleta clara e escura (tokens/variáveis CSS); testar contraste nos dois; respeitar `prefers-color-scheme` e permitir toggle manual com persistência.

Microinterações úteis (sutis, com `prefers-reduced-motion`):
- [ ] Hover/foco nas linhas e botões de ação.
- [ ] Slide suave do drawer; fade do overlay.
- [ ] Feedback ao **copiar telefone** ("Copiado!" toast curto).
- [ ] Chips de filtro com transição ao adicionar/remover.

---

## 7. Site institucional bom por setor — checklist + tendências

### 7.1 O que vale para todos (2025–2026)

- **Mobile-first** e **velocidade** (a maioria do tráfego é mobile; páginas que carregam em ~1s convertem muito melhor).
- **Hero claro**: o que é o negócio + proposta de valor + **CTA principal** acima da dobra (ligar/WhatsApp/agendar/reservar).
- **Prova social**: avaliações do Google, depoimentos, selos, número de clientes/anos.
- **Fotos reais** do local/equipe/produto (banco de imagem genérico reduz confiança).
- **Contato sempre acessível**: botão flutuante de **WhatsApp**, telefone clicável, endereço com **mapa**, horário de funcionamento.
- **Confiança/credibilidade**: CNPJ/endereço físico, redes sociais ativas, página "Sobre" com rosto humano.
- **Acessibilidade e dark mode** quando fizer sentido; navegação simples e enxuta.
- **SEO local** básico: nome-cidade no título, dados estruturados, Google Business vinculado.

### 7.2 Por setor — seções esperadas

**Restaurante / bar / lanchonete**
- [ ] Cardápio (idealmente digital, atualizado; preços), fotos dos pratos
- [ ] Botão de **delivery/iFood/WhatsApp** e/ou reserva
- [ ] Horário, mapa, formas de pagamento
- [ ] Galeria do ambiente + avaliações
- Tendência: cardápio bonito e rápido no mobile, fotos reais apetitosas, CTA de pedido sempre visível.

**Salão / barbearia / estética**
- [ ] **Agendamento online** (ou WhatsApp direto), lista de serviços com preços
- [ ] Galeria/portfólio de trabalhos (antes/depois), equipe
- [ ] Avaliações, horários, localização
- Tendência: visual estiloso alinhado à marca, foco em agendar com 1 toque.

**Clínica / odontologia / saúde**
- [ ] Especialidades/serviços, equipe com credenciais (CRO/CRM), convênios aceitos
- [ ] Agendamento/contato, confiança (estrutura, certificações), depoimentos
- [ ] Localização, horários; tom **profissional e limpo**
- Tendência: design sério e tranquilizador, prova de credibilidade forte, fácil marcar consulta.

**Hotel / pousada**
- [ ] Galeria de quartos/áreas, **reserva/disponibilidade** ou WhatsApp, preços/diárias
- [ ] Comodidades, localização + atrações próximas, políticas (check-in/out)
- [ ] Avaliações (Booking/Google) integradas
- Tendência: fotografia imersiva, CTA de reserva claro, prova social de viajantes.

**Academia / fitness**
- [ ] Modalidades/aulas, planos e preços, **aula experimental/matrícula** (CTA)
- [ ] Estrutura (fotos reais), horários/grade, equipe de profissionais
- [ ] Depoimentos/resultados, localização
- Tendência: energia visual, CTA de "experimente grátis", grade de horários clara no mobile.

---

## 8. Galerias de referência e o que observar

| Galeria | Link | Forte em | O que observar |
|---|---|---|---|
| **Awwwards** | https://www.awwwards.com | Craft visual, motion, tipografia | Detalhes de design e animação — porém muitos sites são lindos e convertem mal; usar para inspiração visual, não estrutura de conversão. |
| **Land-book** | https://land-book.com | Landing pages por categoria | Estrutura de página que converte; filtrar por indústria. |
| **Lapa Ninja** | https://www.lapa.ninja | Landing pages com screenshot full-page | Como empresas estruturam a página inteira (hero→prova→CTA); ótimo para padrões de conversão. |
| **Httpster** | https://httpster.net | Curadoria opinativa, estética atual | Tendências tipográficas e de layout "do momento". |
| **One Page Love** | https://onepagelove.com | Sites de uma página | Ideal para PME: site simples e direto em 1 página. |
| **SaaS Landing Pages** | https://saaslandingpage.com | Landings de SaaS | Padrões de hero/CTA/prova social bem definidos. |
| **Mobbin** (bônus) | https://mobbin.com | UI real de produtos/app | Padrões de interface (úteis para o próprio painel, não só sites). |

Padrões concretos para observar nelas (e replicar nos sites gerados):
- **Hero** com headline curta + subtítulo + 1 CTA primário (e às vezes 1 secundário).
- **Prova social logo após o hero** (logos, avaliações, números).
- **Seções escaneáveis** (uma ideia por bloco, alternando texto/imagem).
- **CTA repetido** ao longo da página e fixo no mobile.
- **Fotos reais** e consistência de marca (cores/tipografia).
- **Rodapé útil**: contato, mapa, redes, horário.

---

## 9. Fontes (URLs)

CRMs / admin open-source:
- Twenty CRM — https://github.com/twentyhq/twenty · https://twenty.com/
- ERPNext — https://github.com/frappe/erpnext
- Refine — https://github.com/refinedev/refine
- shadcn/ui — https://github.com/shadcn-ui/ui · https://ui.shadcn.com
- Mantine — https://github.com/mantinedev/mantine
- Tabler — https://github.com/tabler/tabler
- AppFlowy — https://github.com/AppFlowy-IO/AppFlowy
- Tremor — https://github.com/tremorlabs/tremor
- Visão geral de CRMs OSS — https://www.nocobase.com/en/blog/github-open-source-crm-projects

Padrões de UI / master-detail / CRM:
- The Best UI Patterns for CRM Applications — https://eseospace.com/blog/the-best-ui-patterns-for-crm-applications/
- Master-Detail (OutSystems) — https://success.outsystems.com/documentation/11/building_apps/user_interface/patterns/using_mobile_and_reactive_patterns/adaptive/master_detail/
- The Master—Detail Interface Pattern (Appli) — https://appli.io/the-master-detail-interface-pattern/
- Oracle Alta UI — Master-Detail — https://www.oracle.com/webfolder/ux/middleware/alta/patterns/MasterDetail.html

Bibliotecas de UI / charts:
- React UI libraries 2025 (shadcn/Radix/Mantine/MUI/Chakra) — https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra
- Mantine vs Chakra vs MUI — https://adminlte.io/blog/mantine-vs-chakra-ui-vs-mui/
- Tremor dashboard guide (Refine) — https://refine.dev/blog/building-react-admin-dashboard-with-tremor/
- shadcn dashboard starter — https://github.com/Kiranism/next-shadcn-dashboard-starter

WhatsApp click-to-chat / telefone BR:
- Criar link wa.me com mensagem — https://quadlayers.com/how-to-create-a-whatsapp-link-wa-me-with-a-pre-filled-message/
- Guia wa.me (Chatfuel) — https://chatfuel.com/blog/create-whatsapp-link
- Brazil phone number format — https://www.vitelglobal.com/blog/brazil-phone-number-format/
- Inconsistência do dígito 9 (Gupshup) — https://support.gupshup.io/hc/en-us/articles/4407840924953
- Telephone numbers in Brazil (Wikipedia) — https://en.wikipedia.org/wiki/Telephone_numbers_in_Brazil

Detecção de redes sociais por URL:
- lorey/social-media-profiles-regexs — https://github.com/lorey/social-media-profiles-regexs
- mbparvezme/social-url-username-regex — https://github.com/mbparvezme/social-url-username-regex
- @elevatormedia/socialite — https://github.com/ELEVATORmedia/socialite

Acessibilidade / microinterações / lead scoring visual:
- More Accessible Skeletons (Adrian Roselli) — https://adrianroselli.com/2020/11/more-accessible-skeletons.html
- Skeleton screens vs spinners — https://www.onething.design/post/skeleton-screens-vs-loading-spinners
- Carbon — Status indicator pattern — https://carbondesignsystem.com/patterns/status-indicator-pattern/
- Carbon — Loading pattern — https://carbondesignsystem.com/patterns/loading-pattern/
- Spot the hot leads (visual CRM) — https://senegalsoftware.com/blog/how-to-spot-the-hot-leads-a-visual-guide-to-your-crms-dashboard/
- Lead scoring (Freshworks) — https://www.freshworks.com/crm/lead-scoring/

Sites institucionais / tendências por setor:
- Essential features small business website 2025 — https://creatif.agency/essential-features-every-small-business-website-needs-in-2025/
- Web design trends that convert 2025 — https://www.needmomentum.com/web-design-trends-for-small-businesses-what-converts-in-2025/
- 10 web design trends small business 2025 — https://siteamplify.com/blog/10-essential-web-design-trends-small-business-2025

Galerias de inspiração:
- Awwwards — https://www.awwwards.com
- Land-book — https://land-book.com
- Lapa Ninja — https://www.lapa.ninja
- Httpster — https://httpster.net
- One Page Love — https://onepagelove.com
- SaaS Landing Pages — https://saaslandingpage.com
- Listas de galerias — https://ibelick.com/blog/ultimate-list-of-curated-design-inspiration-websites · https://www.toools.design/blog-posts/ultimate-list-100-best-inspiration-sites-to-inspire-designers

---

### Notas de honestidade / incertezas
- As contagens de estrelas do GitHub são desta data (2026-06-20) e mudam constantemente.
- A regra do "9º dígito" no Brasil tem casos de borda no **WhatsApp ID interno** (DDDs fora de SP/RJ/ES); para *click-to-chat* enviar o número com o 9 funciona na grande maioria dos casos, mas não é 100% garantido — por isso o painel deve degradar bem (esconder o botão se não normalizar) e o ideal é testar com números reais do Guarujá (DDD 13).
- A escolha entre **shadcn/ui (+Tailwind)** e **Radix puro (sem Tailwind)** depende de quanto o time topa introduzir Tailwind ao lado do CSS atual; ambos resolvem a acessibilidade do drawer. Recomendo shadcn pela velocidade, com Radix puro como plano B se quiser zero Tailwind.
