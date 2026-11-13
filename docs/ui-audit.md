# Auditoria visual · Japan Travel Planner 2029

Base: branch `feature/mochi-gemini-ai` (commit `bfb6877`), capturada com Playwright em 12 tamanhos (320×700 a 1920×1080, incluindo 844×390 na horizontal), tema claro e escuro, com estado de planejamento realista e respostas simuladas da Mochi. A matriz é reproduzível com `npm run test:visual` (`UI_VIEWPORTS=all`), que também mede rolagem horizontal, textos menores que 12 px, alvos de toque menores que 40 px e sobreposições. As capturas comparativas estão em [`screenshots/ui-polish/`](screenshots/ui-polish/).

## Diagnóstico

Não havia rolagem horizontal em nenhum tamanho. Os problemas estavam na legibilidade, na hierarquia e no uso do espaço.

| Medida (telas por tamanho, tema claro)  | 320 | 390 | 844 horiz. | 820 | 1024 | 1440 |
| --------------------------------------- | --- | --- | ---------- | --- | ---- | ---- |
| Média de textos visíveis < 12 px / tela | 13  | 14  | 12         | 23  | 18   | 24   |
| Maior quantidade em uma tela            | 23  | 25  | 23         | 44  | 32   | 44   |
| Alvos de toque < 40 px (todas as telas) | 74  | 85  | 25         | 100 | 82   | —    |

Textos chegavam a **6–8 px** (eyebrows, legendas, rótulos do progresso, carimbos).

### Navegação e cabeçalho

- **Celular:** a busca era um campo de ~110 px espremido entre o título e os ícones; o placeholder ficava cortado ("Buscar no nosso d…").
- **Tablet:** 768–1024 px usava a mesma barra inferior do celular esticada em toda a largura (itens de ~150 px) e escondia a barra lateral; não havia padrão próprio para tablet horizontal.
- **Celular na horizontal (844×390):** topo fixo + barra do wizard + barra inferior ocupavam quase toda a altura; o conteúdo da etapa não aparecia.
- O botão da Mochi cobria ações de cartões no roteiro e não se recolhia.

### Página inicial

- Celular: título e botão estavam bons, mas a fotografia começava abaixo da primeira dobra, depois de nota de rodapé e da linha "JAPAN 2029".
- Linha de edição e eyebrows com 7–8 px.
- Tablet: quatro cartões de estação em colunas estreitas.

### Wizard

- Progresso no celular: seis círculos numerados sem nomes; "ETAPA 01 DE 06" com 8 px, quebrando linha.
- Interesses: 12 cartões com 8 fotos — Tóquio aparecia 3 vezes, Osaka e inverno 2 vezes. No escuro, todos os cartões selecionados ficavam com o mesmo bloco roxo, sem hierarquia; prioridades só apareciam numa lista separada.
- Cidades: 29 destinos para 8 fotos (seis destinos com a mesma foto de outono, seis com a de inverno); motivo da recomendação truncado; sem filtro por região.
- Orçamento: cartões só com nome e total; sem indicar o que compõe a estimativa.
- Notas laterais e figura da etapa ocupavam espaço no celular sem acrescentar decisão.

### Resultado

- Ordem: herói → convite da Mochi → cidades → noites/mapa → dias → destaques → eventos → cuidados. O convite opcional da IA aparecia antes das cidades recomendadas.
- Três botões de peso semelhante; "Não é isso que queremos" com 11 px.
- Distribuição de noites como barras simples; cartões das cidades repetiam fotos.

### Mochi

- **Celular:** o bloco "Você escolhe o que compartilhar" ocupava ~55% da primeira tela; o campo de mensagem ficava abaixo da dobra; ações em linha com três botões.
- **Tablet/desktop:** gaveta de 760 px para qualquer tarefa, inclusive uma conversa curta.
- **Proposta:** duas listas lado a lado ("Roteiro atual"/"Alteração sugerida") sem marcação de cidades adicionadas, removidas ou noites alteradas; avisos no fim de uma longa lista de títulos.
- **Revisão:** relatório de títulos e marcadores; certezas e verificações automáticas misturadas.

### Dados densos

- Gráficos com legendas e eixos de 9–10 px e cores fixas (não acompanhavam o tema escuro).
- Mapa ampliado cobria o próprio botão "Reduzir": no toque não havia como sair (somente com Esc).
- No celular o mapa capturava a rolagem da página.
- Roteiro no celular: dias em duas colunas de ~170 px, atividades com ações em grade 2×2.
- Tabelas de cenários exigiam rolagem horizontal no celular.

### Código

- Três camadas de CSS (`style.css` 2.455 linhas, `redesign.css` 4.403, `mochi.css` 467) com regras sobrescritas em cascata, 17 `!important`, cerca de 20 media queries sobrepostas (760, 800, 960, 1024, 1200, 1250…), cores fixas fora das variáveis e ~1.000 linhas para telas que já não existiam (home antiga, polaroid, colunas).
- Estilos inline em formulários e tabelas.
- `zod` e o cliente da IA eram carregados na primeira visita, mesmo sem abrir a Mochi.

## O que foi feito

Detalhes de tokens, breakpoints e componentes em [design-system.md](design-system.md).

**Sistema:** CSS reescrito em módulos (tokens, base, layout, componentes, páginas, Mochi, impressão). Cores semânticas para claro e escuro com contraste verificado; o rosa de destaque ficou um tom mais profundo (`#975e6b` → `#8a5260`) para manter 4,9–5,7:1 também sobre fundos rosados e sálvia. Escala tipográfica com mínimo de 12 px; espaçamentos 4–64; alvos de 44 px; `!important` reduzido de 17 para 8, todos em utilitários (`[hidden]`, `.sr-only`, movimento reduzido), na ocultação de controles do desktop e na impressão. Estilos inline removidos dos formulários e tabelas.

**Navegação:** quatro padrões — celular (cabeçalho compacto + barra inferior com área segura), tablet vertical (barra flutuante centralizada), tablet horizontal/notebook (abas no cabeçalho + gaveta) e desktop (barra lateral fixa com rolagem própria). Busca virou botão que abre painel próprio no celular e tablet. Barra inferior, botão da Mochi e atalhos saem de cena com teclado aberto, menu aberto e mapa ampliado. Em telas baixas (horizontal) o cabeçalho e a barra do wizard deixam de ser fixos.

**Início:** no celular, título → mensagem → botão → faixa fotográfica dentro da primeira tela; tablet com proporção própria; estações em 2 colunas no tablet; lugares em carrossel com encaixe no celular.

**Wizard:** "Etapa 3 de 6 — O que amamos" com barra segmentada que também navega; interesses como cartões com ícone e tom próprio, selo "Prioridade 1–3" no cartão; cidades com capa própria (foto ou cartão-postal), motivo visível e "Por que combina" expansível, filtro por região; orçamento com valor, passagem, hospedagem e meta mensal do cenário, marcado como estimativa; barra de ações fixa com "Anterior", "Decidir depois" e "Próximo", que substitui a barra inferior durante o wizard.

**Resultado:** herói emocional com uma ação principal ("♡ Usar e personalizar roteiro"), "Ajustar escolhas" e "Criar outra sugestão"; resumo das preferências em formato de bilhete; cidades com região, noites, motivos e estação; linha do tempo das noites (vertical até 1023 px, horizontal e proporcional depois); mapa com modo ampliado; convite da Mochi depois do conteúdo principal.

**Mochi:** tela cheia no celular, gaveta de 560 px no tablet, painel de 480 px no desktop para conversar e 760–920 px para comparar e revisar. Cabeçalho fixo, área central rolável, campo de mensagem fixo (Enter envia, Shift+Enter quebra linha). Privacidade compacta: uma frase com o envio ao Google Gemini sempre visível, as duas caixas sem marcação prévia e o detalhamento em "Ver detalhes dos dados compartilhados"; depois da primeira mensagem autorizada, o bloco recolhe com "Preferências autorizadas · rever". Proposta com resumo numérico (adicionadas, removidas, noites alteradas, dias alterados), aviso de confirmação em destaque, comparação por cidade com ícone e rótulo de status e dias com selo "Alterado". Revisão em quatro grupos: O que está ótimo, O que merece atenção (verificações do aplicativo), O que podemos melhorar, Sugestões opcionais.

**Dados densos:** gráficos com cores dos tokens, textos de 12 px, dica por toque em todo o mês e resumo textual; mapa com botão próprio de ampliar/fechar, marcadores de 32 px e popups mantidos na tela; no toque, o mapa embutido não captura a rolagem. Roteiro como linha do tempo no celular, com ações de 44 px em uma linha e rótulos acessíveis específicos ("Editar: Chegada e Dotonbori"). Cenários do orçamento em cartões no celular; comparação de hospedagens com primeira coluna fixa.

**Fotos:** cada cidade só usa foto quando a imagem mostra aquele lugar (Tóquio, Osaka, Kyoto, Biei e Miyakojima, conforme o texto alternativo). As demais recebem um cartão-postal tipográfico (nome em japonês, carimbo da região, padrão seigaiha); eventos usam um carimbo com o mês (`4月`). WebP responsivo com `srcset`/`sizes`.

**Desempenho:** a Mochi (controlador, contratos com `zod` e cliente) agora carrega quando alguém a abre. Chart.js e Leaflet continuam sob demanda.

## Resultados medidos

Mesma matriz, mesmas 23 telas por tamanho (tema claro):

| Medida                         | 320      | 390      | 844 horiz. | 820      | 1024     | 1440     |
| ------------------------------ | -------- | -------- | ---------- | -------- | -------- | -------- |
| Média de textos < 12 px / tela | 13 → 0,3 | 14 → 0,4 | 12 → 0,2   | 23 → 0,4 | 18 → 0,4 | 24 → 0,8 |
| Alvos < 40 px (todas as telas) | 74 → 6   | 85 → 6   | 25 → 2     | 100 → 6  | 82 → 5   | — → 0    |
| Rolagem horizontal             | 0 → 0    | 0 → 0    | 0 → 0      | 0 → 0    | 0 → 0    | 0 → 0    |

Os textos menores que restam são decorativos e marcados com `aria-hidden` (carimbo da colagem, carimbo dos cartões-postais, rosto da Mochi). Os alvos restantes são caixas de seleção dentro de rótulos de 44 px e os links de fonte ("Fonte: JMA ↗"), com 37 px — acima do mínimo de 24 px do WCAG 2.2 AA.

**axe-core (WCAG 2.2 A/AA):** zero violações nas páginas principais (início, quatro etapas do wizard, resultado, roteiro, orçamento, destinos, meses) em claro e escuro, a 390 e 1440 px, e nos três modos da Mochi. Na base, o Lighthouse apontava 92 em acessibilidade; a auditoria encontrou também `aria-expanded` inválido na busca e tabelas roláveis sem foco, ambos corrigidos.

**Lighthouse 12.8** (página inicial, build de produção, mesma máquina, duas execuções com resultados iguais):

|                | Base celular | Novo celular | Base desktop | Novo desktop |
| -------------- | ------------ | ------------ | ------------ | ------------ |
| Desempenho     | 70           | 91           | 88           | 100          |
| Acessibilidade | 92           | 100          | 92           | 100          |
| Boas práticas  | 100          | 100          | 100          | 100          |
| SEO            | 92           | 92           | 92           | 92           |
| FCP            | 2,1 s        | 1,4 s        | 1,2 s        | 0,3 s        |
| LCP            | 10,1 s       | 3,5 s        | 1,9 s        | 0,6 s        |
| TBT            | 150 ms       | 70 ms        | 0 ms         | 0 ms         |
| Transferência  | 2,7 MB       | 1,0 MB       | 2,7 MB       | 0,77 MB      |

O único item de SEO pendente, nos dois casos, é `robots.txt` (o servidor de preview responde com a página do app).

## Limites conhecidos

- Só há 8 fotografias licenciadas; mais fotos reais por cidade melhorariam as grades. O mapeamento fica em `src/data/destination-art.js` (campo `photo`).
- O CSS minificado ficou maior (102,9 → 146,5 KB; gzip 19,7 → 23,8 KB) por usar nomes de tokens longos e cobrir estados que antes não existiam, apesar de ter removido regras mortas e sobreposições. O JavaScript inicial caiu de 345,9 para 257,7 KB (gzip 109,1 → 82,4 KB) com a Mochi sob demanda.
- O comportamento com teclado virtual foi implementado com `visualViewport` e testado por unidade; a emulação headless não abre teclado real. Vale conferir em um iPhone e em um Android.
- Mapas dependem dos tiles do OpenStreetMap.
