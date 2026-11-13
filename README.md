# Japan Travel Planner 2029

**Japan Diary 2029 — a little guide to our big adventure.** Um planejador estático em português para seis amigos, com saída de Brasília, 25 dias e 24 noites no Japão em 2029. Datas e estação inicialmente em aberto.

## Executar

Requer Node.js 22.12+ e npm.

```sh
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente `http://127.0.0.1:5173`. Use um servidor HTTP; abrir `index.html` diretamente por `file://` não carrega os módulos e os dados.

```sh
npm test           # cálculos financeiros, roteiros, validação e persistência
npm run test:e2e   # fluxos de interface, desktop e celular (Playwright)
npm run build      # artefato estático em dist/
npm run preview    # conferir o build localmente
```

Para instalar o navegador dos testes, se necessário: `npx playwright install chromium`. A suíte inicia seu próprio servidor na porta 5173; ele é encerrado ao concluir. Capturas visuais são geradas em `test-results/`. Para verificar os caminhos de produção em um subdiretório, rode `npm run build && npm run test:production`. Se quiser usar um Chromium já instalado, defina `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` com o caminho do executável. Use `npm run format` ou `npm run format:check` para a formatação.

## O que funciona

As 14 seções são acessíveis pela sidebar ou menu móvel, com navegação por hash sem recarregar a aplicação. Há busca global, tema escuro, relógio do Japão e contagem de dias somente depois de definir embarque.

- Quatro estações com clima de seis cidades, cuidados, roupas, sugestões e favoritos.
- Comparação dos 12 meses: temperatura, precipitação, umidade, chegadas internacionais e modelo editorial com pesos editáveis. Os dados tabulares acompanham os gráficos.
- Mapa Leaflet/OSM com 29 destinos, filtros, favoritos, detalhes e inclusão no roteiro.
- 21 eventos com mês habitual e links oficiais, sem datas ou ingressos de 2029 inventados.
- Cinco roteiros independentes: primavera, verão/Okinawa, verão/Hokkaido, outono e inverno. Bases e noites editáveis; atividades com estimativa, favorito e período livre. Arrastar entre dias ou usar o botão acessível de mover. Exportação JSON e impressão pelo navegador.
- Orçamento em reais com três cenários, divisão da hospedagem pelo grupo, campos por pessoa, cálculo mensal, saldo e rosca de categorias. Exportação CSV/JSON.
- Cadastro, edição e comparação lado a lado de hospedagens; capacidade, camas, banheiros, taxas e comodidades.
- Cadastro de trechos cotados e comparação manual com passe. Aplicar os trechos ao orçamento exige confirmação e evita duplicação.
- Guia de alimentos e lojas; wishlist com conversão JPY/BRL somente após preencher cotação manual.
- Malas por estação, checklist, tarefas personalizadas, notas e backup completo JSON.
- Regras com fontes oficiais, vigência, estado da medida e verificação em 13/11/2026.

O arquivo `Contexto/Japan_Diary_2029_Quatro_Estacoes_A4.pdf` fornecido pelo usuário orientou conteúdo, cenários e identidade. Continua preservado.

## Publicar no GitHub Pages

1. Envie este projeto para um repositório GitHub, incluindo `package-lock.json`.
2. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` testa, faz o build e publica o conteúdo de `dist/` a cada push na branch `main`. Também pode ser acionado manualmente em Actions. Ajuste a branch no YAML se necessário.
4. A URL aparece no ambiente `github-pages` após concluir.

O Vite usa `base: './'`, os arquivos públicos usam `import.meta.env.BASE_URL` e a navegação usa hash. Isso permite publicar em `usuario.github.io/repositorio/` e em domínios próprios. Não há necessidade de rewrites de SPA.

## Publicar na Vercel

1. Importe o repositório no painel da Vercel.
2. Framework: **Vite**. Build: `npm run build`. Diretório de saída: `dist`.
3. Use Node.js 22. Não há variáveis de ambiente ou segredos necessários.
4. `vercel.json` contém a configuração. Publique pelo painel, ou com a CLI autenticada: `npx vercel` para preview e `npx vercel --prod` para produção.

Este trabalho prepara os arquivos para deploy; executar o build local não publica nem envia os dados pessoais do planejamento a um serviço.

## Estrutura

```text
src/
  css/style.css            # variáveis, componentes, responsive, impressão e temas
  data/
    climate.json          # JMA, normais 1991–2020, seis estações
    tourism.json          # JNTO, chegadas definitivas de 2025
    legal.json            # regras e fontes oficiais
    events.json           # eventos, meses e fontes
    images.json           # autores, alt, licença e origem das fotos
    destinations.js       # pontos aproximados e conteúdo de destinos
    planning.js           # estações, tendências e listas editoriais
  js/
    main.js               # navegação, formulários e ações
    views.js              # componentes e telas
    budget.js             # matemática financeira, sem DOM
    itinerary.js          # rotas, movimento e validações, sem DOM
    storage.js            # schema, versão, importação e localStorage
    charts.js             # Chart.js, carregado quando necessário
    maps.js               # Leaflet, carregado quando necessário
    utils.js              # formatação, escape e exportação
public/images/            # fotos locais JPEG, ~2,55 MB no total
tests/                    # testes unitários e e2e
```

Chart.js e Leaflet são carregados sob demanda; Lucide importa apenas os ícones utilizados. Fotos e dados são locais. Google Fonts e tiles de OpenStreetMap requerem internet; mapas não fazem roteamento. Sem tiles, use a lista de destinos e os links de consulta. Não há API key ou backend.

## Atualizar conteúdo e dados

**Clima:** em `src/data/climate.json`, cada vetor tem 12 posições, janeiro a dezembro. Unidades: temperatura °C, precipitação mm e umidade %. Preserve `period`, `lastVerified`, estação e URL primária. Use `null` para uma observação indisponível; não preencha com zeros ou números estimados. Para uma série inteiramente indisponível, mantenha o aviso de ausência de dados e confira os textos e tabelas em `views.js`. Sensação térmica e probabilidade de chuva não são inferidas de normais mensais.

**Turismo:** atualize os 12 valores, ano e PDF/tabela oficial em `tourism.json`. A série JNTO representa chegadas estrangeiras, incluindo viagens além de lazer; não pessoas únicas, turismo doméstico ou filas. Confira a soma anual e o status definitivo/provisório da fonte.

**Regras:** edite `legal.json` com fonte oficial, data de verificação, situação, início e fim de vigência quando conhecidos. Diferencie lei, mudança futura, regulamentação pendente e proposta. Nunca trate o prazo legal do JESTA como data exata de lançamento. O acordo atual de isenção de visto para brasileiros tem prazo até 29/09/2029, sujeito a nova prorrogação. Verifique a situação para a data de viagem. Os textos refletem a consulta de 13/11/2026 e devem ser revalidados antes de comprar e embarcar. A aplicação mostra aviso geral após 180 dias desde a revisão; atualize também a data de revisão em `main.js` ao realizar uma nova checagem completa.

**Eventos:** `events.json` usa meses 1–12 e `date2029: null` enquanto o programa oficial não estiver publicado. A interface atual apresenta meses habituais e o estado pendente; ao publicar datas confirmadas, atualize também a apresentação em `views.js`. Não há preços confirmados para 2029 nesta versão.

**Destinos:** `destinations.js` contém coordenadas aproximadas de referência. Não representam um terminal, ponto de acesso ou roteiro calculado. O mapa não desenha linhas de viagem ou inventa duração. As fotos são de referência regional/sazonal, não de cada destino individual.

**Imagens:** substitua ou acrescente fotos em `public/images`, usando arquivos otimizados e mantendo autor, URL de origem, licença, licença URL e alt em `images.json`. As oito fotos atuais usam a [licença Unsplash](https://unsplash.com/license); créditos completos na seção Fontes & sobre. As bibliotecas mantêm suas licenças em `node_modules` e em seus repositórios oficiais. Não substitua por imagens de busca sem verificar licença.

**Tema:** variáveis no começo de `style.css`; sobrescritas do modo escuro em `[data-theme=dark]`. Textos editoriais ficam em `planning.js` e `views.js`. Fontes vêm do Google Fonts, com fallback de sistema.

## Matemática e limites

Os valores editáveis do orçamento são em reais. A hospedagem é a **diária total do grupo × noites**, dividida pelos viajantes; alimentação é diária por pessoa × dias. Outros campos são totais individuais da viagem. Valores são convertidos a centavos antes de multiplicar/somar. O total individual é arredondado para o centavo; um rateio indivisível pode exigir ajustar centavos entre viajantes.

A meta mensal usa depósitos do mês inicial até o mês anterior ao embarque. Dez/2026 até jan/2029 dá 26 depósitos para embarque em fev/2029; isso é exemplo, não data predefinida. Sem data, o número de depósitos fica em aberto. Não calcula juros, inflação, câmbio ou tarifas automaticamente. Alterar estação não inventa custos ou aplica multiplicadores.

Os cenários são estimativas de novembro/2026 para 25 dias e 24 noites: R$ 26.600, R$ 34.750 e R$ 45.900 por pessoa. Ao aplicar um cenário a outra duração, os totais de referência de alimentação e hospedagem são distribuídos pelos dias/noites atuais, com arredondamento da diária; revise conforme cotações. Depois de mudar a duração no formulário, as diárias permanecem como estavam. As comparações de estações e preços relativos são editoriais e identificadas como tais. Sem cotações por estação, nenhum gráfico de custos futuros é fabricado.

O número de noites das bases e a duração configurada são validados separadamente; mudar a duração não apaga atividades. Os templates incluem pausas a cada quatro/cinco dias. Custos de atividades começam em zero por não haver cotação; não são automaticamente somados ao orçamento de parques, evitando duplicação silenciosa.

## Persistência, backup e privacidade

A chave é `japan-diary-planner-v1`, schema versão 1. Os dados ficam no navegador e na origem atual (host/porta). Não há conta, backend ou sincronização. Limpar os dados do navegador remove o planejamento. Uma mudança de domínio cria um armazenamento diferente.

Em **Checklist & notas** ou **Fontes & sobre**, use **Fazer backup / Exportar planejamento** e depois **Importar cópia** no outro dispositivo. Se houver estado corrompido, uma cópia é preservada em `japan-diary-planner-v1-recovery` quando o armazenamento permitir. A importação valida versão, dados financeiros e roteiros, aceita até 2 MB e exige revisar antes de substituir. Exportações específicas de orçamento/roteiro são para consulta; use o **backup completo** para importar. CSV usa separador `;` e proteção contra interpretação de fórmulas.

Notas do projeto anterior (`jp-trip-notes`) são migradas quando ainda não há estado novo. Se o armazenamento estiver bloqueado ou cheio, a interface avisa; exporte o estado antes de sair. Não inclua nomes completos, dados de passaporte ou dados bancários. Backups incluem os valores preenchidos: compartilhe conscientemente com o grupo.
