# planner — Diário de viagem japonês

A identidade combina vermelho inspirado no sol da bandeira, branco de papel, tinta escura e verde matcha. Fotografias reais, cartões-postais, selos e a Mochi dão personalidade ao planejamento. A interface prioriza hierarquia, leitura e uma ação principal por contexto.

## Estrutura

`src/css/index.css` carrega tokens, base, layout, componentes, páginas, Mochi, `japan.css`, `pages/planner-coach.css`, movimento e impressão. `japan.css` aplica a linguagem compartilhada às telas: navegação, formulários, seletores, roteiro, orçamento, mapas, listas, modais e assistente. `pages/home.css` contém a capa, bilhete, ferramentas em abas e Explorar.

As rotas, o armazenamento, os cálculos e as propostas continuam separados da apresentação. `dashboard.js` deriva o resumo sem alterar o planejamento. Gráficos e mapas são importados sob demanda; na Home, apenas a aba aberta carrega sua ferramenta.

## Cores

| Uso                | Tema claro | Tema escuro |
| ------------------ | ---------- | ----------- |
| Fundo              | `#f8f7f3`  | `#19231f`   |
| Superfície         | `#ffffff`  | `#222e27`   |
| Texto              | `#252a26`  | `#f5f3e9`   |
| Texto secundário   | `#555b53`  | `#d1d6c9`   |
| Ação principal     | `#bc3526`  | `#ffa18a`   |
| Seleção suave      | `#fce5de`  | `#4b3229`   |
| Matcha / conclusão | `#386449`  | `#b9d799`   |
| Foco de teclado    | `#39715a`  | `#b9d799`   |

Estados combinam cor com texto, ícone, borda ou seleção. As séries de gráficos usam vermelho, verde, ocre e azul. A linha de temperatura mantém os valores históricos e tem pontos circulares; a tabela de valores continua disponível.

O tema claro é o padrão desta identidade. `appearanceVersion: 2` migra uma aparência anterior uma única vez, preservando roteiros, valores, notas e favoritos. Depois da migração, a preferência de tema claro ou escuro fica salva.

## Tipografia e componentes

- **Manrope:** marca, títulos e valores de destaque, com pesos fortes e espaçamento compacto.
- **DM Sans:** texto, navegação, formulários e gráficos.
- Ambas são arquivos locais em `public/fonts/`, com licenças SIL OFL. Não há carregamento externo de Google Fonts. Japonês usa fontes de sistema.
- Botões principais em cápsula, cartões com raios de 16–24 px, seletores com foco explícito e áreas de toque de pelo menos 44 px.
- Campos comuns usam 16 px. Metadados curtos são subordinados aos títulos e valores; conteúdo de leitura mantém altura de linha confortável.
- Fotos com cortes consistentes, margens generosas e legendas. Cidades sem foto própria usam cartões tipográficos identificados, sem fotografias de lugares diferentes.

## Início

A capa “Próxima parada: Japão.” tem uma ação principal, fotografia de Kyoto, cartão menor do Monte Fuji e selo decorativo. São fotografias locais já creditadas na página de fontes.

O bilhete abaixo resume viajantes e duração reais do rascunho, com acesso direto para ajustes. Estações, Mapa, Clima e Meu plano ficam em quatro abas. Só um painel aparece por vez. O progresso usa as seis etapas existentes; não há pontos inventados.

O mapa mostra destinos escolhidos ou cinco ideias identificadas como referências. Não apresenta trajetos calculados. O gráfico usa médias JMA de 1991–2020, identificadas como dados históricos. A troca de cidade preserva o foco.

## Telas internas

A seleção de estação, interesses e destinos tem cartões com borda e marca de seleção. O wizard mantém progresso e barra de ações própria. Recomendações usam um resumo em bilhete, explicação das escolhas e confirmação para aplicar.

O roteiro usa cartões de dia, atividades e ações consistentes. O orçamento separa campos de entrada do resumo matcha, com estimativas e premissas visíveis. Mapas, tabelas, filtros, checklist, hospedagem e transporte usam a mesma família de controles.

A Mochi tem forma de bolinho de arroz, rosto simples e bochechas vermelhas. A conversa usa balões claros e um compositor fixo. Consentimento, revisão de propostas e confirmação antes de aplicar mantêm o comportamento existente. O avatar não faz chamadas de IA. No criador, a pessoa pode ativar o acompanhamento contextual da Mochi para a sessão.

## Responsividade

| Largura             | Comportamento                                                        |
| ------------------- | -------------------------------------------------------------------- |
| Menos de 768 px     | Uma coluna, menu em gaveta, barra inferior, estações em duas colunas |
| 768–1023 px         | Capa em duas colunas, gaveta e navegação inferior                    |
| 1024–1279 px        | Seções principais no cabeçalho e gaveta para ferramentas             |
| A partir de 1280 px | Sidebar de 224 px, busca integrada e área de trabalho em colunas     |

A Mochi recolhe durante rolagem no celular e respeita teclado virtual, navegação inferior, wizard e mapa ampliado. Mapas têm controle próprio para ampliar; os destinos continuam acessíveis em lista.

## Movimento

Uma textura de papel pontilhada permanece estática no fundo. O selo, a estrela e o caminho decorativo têm ciclos suaves; entradas usam opacidade e pequeno deslocamento. Fotos respondem ao hover apenas em dispositivos com ponteiro adequado.

O controle ao lado dos cartões-postais pausa animações e salva a preferência em `planner-motion`. `prefers-reduced-motion` prevalece e também responde a mudanças durante a sessão. A página oculta pausa loops. As abas funcionam com setas, Home e End e preservam foco. A troca de painel não remonta a capa.

## Verificação

`npm test` cobre cálculos, migração e integridade de estado. `npm run test:e2e` verifica fluxo de planejamento, Mochi com respostas simuladas, responsividade, foco, áreas de toque e axe em todas as rotas nos dois temas. `npm run test:production` verifica imagens, gráficos, mapas e navegação com build em subdiretório.

Capturas desta identidade ficam em `docs/screenshots/japan-journal/`. Capturas anteriores são mantidas como histórico.

### Criador com acompanhamento

As seis etapas têm uma coluna Mochi no desktop e um painel recolhível no celular. Pedidos e preferências a evitar ficam junto aos interesses; a revisão permite voltar diretamente a esses campos. Dias e noites se atualizam juntos. Mês, estação, data e ano mantêm coerência, com aviso quando uma data precisa ficar em aberto. Os cenários de orçamento mantêm diárias de referência de 25 dias e 24 noites, calculando totais para a duração escolhida.

Dicas da IA são identificadas como sugestões, podem ser pausadas e só mudam escolhas após aplicar. O painel mantém o foco da pergunta durante atualizações. Falhas deixam os controles do criador disponíveis. O roteiro completo continua sujeito à comparação e confirmação. Capturas do novo acompanhamento ficam em `docs/screenshots/planner-coach/`; testes usam respostas simuladas.
