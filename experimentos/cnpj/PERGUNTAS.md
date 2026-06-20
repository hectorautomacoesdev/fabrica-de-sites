# Perguntas para o Hector (decidir juntos depois)

Você pediu para eu deixar registradas as perguntas que eu te faria, para conversarmos quando
voltar. Aqui estão, em ordem de importância. Minha recomendação vem em **negrito**.

### Sobre seguir em frente
1. **Promover para produção?** Quer que eu transforme isto num `feat/scout-fonte-cnpj` (ETL
   mensal + plugin `CnpjReceitaSource`) **depois** do trabalho de frontend/API que já estava no
   plano? → *Recomendo sim, mas sem pressa: primeiro fechamos frontend/API, depois o CNPJ.*

2. **É a maior alavanca do projeto.** Concorda que resolver contato (de 12% → ~90%) e volume
   (de 513 → dezenas de milhares) justifica priorizar isso logo após o frontend? → *Sim.*

### Sobre qualidade dos dados
3. **Nome do negócio:** o `nome_fantasia` vem vazio em ~metade dos casos; a razão social está
   no arquivo Empresas (+1,3 GB para baixar e juntar). Vale a pena? → **Sim — nome é essencial
   para abordar.**

4. **Contato do contador:** parte dos telefones/e-mails é de escritórios de contabilidade
   (vi `@...contabilidade`, `@guarucontas` na amostra). Abordamos mesmo assim (o contador pode
   ser ponte para o dono), sinalizamos, ou filtramos? → **Sinalizar (marcar "contato via
   contador"), não descartar.**

5. **Frescor:** os dados são de cadastro e podem estar desatualizados. Aceita validar o telefone
   na hora da abordagem, ou quer uma camada de enriquecimento (API por-CNPJ, ex. BrasilAPI) só
   para os leads quentes? → **Validar na abordagem agora; enriquecimento fica para depois.**

### Sobre escopo e regras
6. **Só ativos?** Recomendo descartar baixados/inaptos (53%+20%) e ficar só com situação ATIVA.
   Confirma? → **Sim.**

7. **Foco de setores:** mantenho o foco nos prioritários (alimentação/beleza/saúde/turismo/
   fitness) ou quer **todos** os ativos no banco, filtrando depois no frontend? → **Guardar todos
   os ativos; priorizar na visualização.**

8. **MEI/micro como sinal:** quer usar o `Simples.zip` para marcar MEI/microempresa? Eles são os
   mais propensos a não ter site — ótimo sinal de oportunidade. → **Sim, como sinal extra de score.**

### Sobre integração técnica
9. **Dedup OSM × CNPJ:** o mesmo negócio virá das duas fontes. Topa a estratégia por telefone
   normalizado + nome/endereço (estendendo o Jaccard que já existe)? → *É o ponto que exige mais
   cuidado; proponho detalhar quando integrarmos.*

10. **Dependência DuckDB:** OK adicionar DuckDB ao projeto para o ETL (lê latin-1 nativo, rápido)?
    Ou prefere manter tudo em stdlib (naive, sem dependência, ~5× mais lento)? → **Recomendo
    DuckDB no ETL; o naive fica documentado como plano B.**

### Sobre privacidade
11. **LGPD/privacidade:** são dados abertos oficiais e públicos, mas têm e-mail/telefone pessoais.
    Alguma diretriz sua? → **Proponho: nunca commitar os dados (já gitignorado), mascarar contato
    em telas/relatórios públicos, e usar só para a prospecção do projeto.**

---

**Nota:** nada em `src/` foi alterado. Tudo isto vive em `experimentos/cnpj/` (sandbox isolado,
venv próprio, dados gitignorados). Promover para `src/` e para `docs/` é a decisão que depende
do seu "ok".
