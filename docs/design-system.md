# Japan Diary · Design system

**Conceito:** revista de viagem japonesa × app de planejamento × scrapbook delicado. Creme, rosa antigo, marrom e sálvia continuam sendo a identidade; o sistema acrescenta hierarquia, contraste e regras de responsividade.

Todo o CSS fica em `src/css/` e é carregado por `index.css`, nesta ordem:

| Arquivo             | Responsabilidade                                                                |
| ------------------- | ------------------------------------------------------------------------------- |
| `tokens.css`        | Cores semânticas (claro e escuro), tipografia, espaço, raios, sombras, camadas  |
| `base.css`          | Reset, escala tipográfica, foco visível, utilitários, movimento reduzido        |
| `layout.css`        | Barra lateral/gaveta, cabeçalho, busca, conteúdo, navegação inferior            |
| `components.css`    | Botões, chips, campos, cartões, avisos, abas, tabelas, diálogo, mapas, gráficos |
| `pages/home.css`    | Início e Explorar                                                               |
| `pages/planner.css` | Wizard de seis etapas                                                           |
| `pages/result.css`  | "O nosso Japão ideal"                                                           |
| `pages/tools.css`   | Estações, meses, destinos, eventos, roteiro, orçamento e demais ferramentas     |
| `mochi.css`         | Assistente Mochi                                                                |
| `print.css`         | Impressão                                                                       |

Regra: componentes usam **somente tokens**. Hexadecimais aparecem apenas em `tokens.css`, nas fotos (moldura/fita) e em tons de interesse que ilustram ícones.

## Cores

Os nomes descrevem a função, não a cor. O tema escuro redefine os mesmos nomes em `[data-theme='dark']`.

| Token                                                                      | Uso                                   | Claro       | Escuro         |
| -------------------------------------------------------------------------- | ------------------------------------- | ----------- | -------------- |
| `--color-bg`                                                               | Fundo da página                       | `#faf7f2`   | `#1d1917`      |
| `--color-bg-sunken`                                                        | Faixas, cabeçalhos de tabela, trilhas | `#f4eee6`   | `#171412`      |
| `--color-surface`                                                          | Cartões e painéis                     | `#fffdf9`   | `#27221f`      |
| `--color-surface-elevated`                                                 | Campos, popovers, folhas              | `#ffffff`   | `#302a26`      |
| `--color-surface-selected`                                                 | Estado selecionado                    | `#f8eef0`   | `#3a2a30`      |
| `--color-text`                                                             | Texto principal                       | `#3a2f2a`   | `#f3ebe4`      |
| `--color-text-secondary`                                                   | Texto de apoio                        | `#5f514a`   | `#d7c9bf`      |
| `--color-text-muted`                                                       | Metadados                             | `#6f635b`   | `#b8a89d`      |
| `--color-border` / `-strong` / `-input`                                    | Divisórias, contornos, campos (≥ 3:1) | …           | …              |
| `--color-accent` / `-hover`                                                | Ação principal, links                 | `#8a5260`   | `#dba7b3`      |
| `--color-accent-soft`                                                      | Fundo de selecionado e destaques      | `#f2e3e5`   | `#46303a`      |
| `--color-focus`                                                            | Anel de foco                          | `#8a4f5d`   | `#f0bfcb`      |
| `--color-success` / `-warning` / `-error` / `-info` (+ `-soft`, `-border`) | Estados                               | …           | …              |
| `--color-added` / `-removed` / `-changed`                                  | Comparação de roteiros da Mochi       | …           | …              |
| `--region-*`                                                               | Capas tipográficas por região         | tons suaves | tons profundos |
| `--chart-1…6`, `--chart-grid`                                              | Séries de gráficos                    | …           | …              |

**Contraste verificado** (WCAG 2.2): texto principal 12,1:1 (claro) e 14,8:1 (escuro); texto secundário ≥ 7:1; texto atenuado 5,0–5,7:1; rosa sobre superfície 6,0:1 e sobre fundos rosados ou sálvia ≥ 4,9:1; branco sobre rosa 6,1:1; bordas de campo 3,3–3,8:1. Estados nunca dependem só de cor: há ícone, texto ("Nova base", "Removida", "Prioridade 1") ou marca de seleção.

## Tipografia

- **Playfair Display** — títulos, valores de destaque e citações.
- **DM Sans** — interface e leitura.
- **Noto Sans JP** — tudo marcado com `lang="ja"`.

| Token            | Tamanho  | Uso                                   |
| ---------------- | -------- | ------------------------------------- |
| `--text-2xs`     | 12 px    | Eyebrows, rótulos curtos (mínimo)     |
| `--text-xs`      | 13 px    | Metadados                             |
| `--text-sm`      | 14 px    | Texto secundário, controles densos    |
| `--text-md`      | 16 px    | Campos (evita zoom automático no iOS) |
| `--text-base`    | 15–16 px | Corpo                                 |
| `--text-lg`      | 17–19 px | Introduções                           |
| `--text-xl`      | 20–24 px | Títulos de cartão                     |
| `--text-2xl`     | 24–34 px | Seções                                |
| `--text-3xl`     | 30–46 px | Títulos de página                     |
| `--text-display` | 44–88 px | Capa da página inicial                |

Os tamanhos fluidos usam `clamp()`. Texto de leitura nunca fica abaixo de 12 px; os únicos elementos menores são carimbos decorativos marcados com `aria-hidden`.

## Espaço, raios e controles

- Escala: `--space-1…8` = 4, 8, 12, 16, 24, 32, 48, 64 px.
- Margem lateral: `--gutter` = 16 px no celular até 48 px no desktop.
- Entre seções: `--section-gap` (48–88 px).
- Raios: 4, 8, 12, 18, 26 px e `--radius-pill`.
- Alvos de toque: `--touch` = 44 px. Botões padrão e campos: 48 px. Botões pequenos: 40 px só com mouse no desktop; 44 px em telas até 1023 px e em qualquer tela de toque.

## Breakpoints

Mobile-first. Os valores vêm do layout, não de aparelhos:

| Faixa                        | Padrão                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| < 768 px                     | Cabeçalho compacto (menu, página, busca, configurações) + barra inferior           |
| 768–1023 px                  | Marca no cabeçalho, barra inferior flutuante e centralizada, grades de 2–3 colunas |
| 1024–1279 px                 | Abas principais no cabeçalho, gaveta para as demais seções, sem barra inferior     |
| ≥ 1280 px                    | Barra lateral fixa com rolagem própria, busca integrada, relógio do Japão          |
| ≥ 1600 px                    | Largura máxima do conteúdo maior                                                   |
| altura ≤ 520 px (horizontal) | Cabeçalho deixa de ser fixo; barra do wizard vira estática                         |

O wizard esconde a barra inferior abaixo de 1024 px: a barra de ações do próprio wizard ocupa esse lugar. Com o teclado virtual aberto (`body.keyboard-open`, calculado por `viewport.js` a partir do `visualViewport`), a barra inferior, o botão da Mochi e os atalhos auxiliares da conversa saem de cena.

## Componentes principais

- **Botões:** `.btn` (principal), `.btn.secondary`, `.btn.subtle`, `.btn.small`, `.text-button`, `.icon-button`. Estados de hover, foco, `:disabled` e `aria-busy="true"` (carregando) estão no componente. Uma tela tem no máximo um botão principal por grupo.
- **Chips:** `.chip` com `aria-pressed` para filtros.
- **Capas de destino:** `cover(destino)` em `components.js` usa a foto somente quando ela mostra aquele lugar; caso contrário, gera um cartão-postal com o nome em japonês, carimbo da região e padrão seigaiha. Assim nenhuma grade repete a mesma fotografia.
- **Mapas:** `.map-frame` com botão interno para ampliar/fechar. Em telas de toque o mapa embutido não captura a rolagem da página; o arraste é liberado no modo ampliado.
- **Gráficos:** cores lidas dos tokens (`--chart-*`), textos de 12 px, dica por toque em todo o mês (`mode: 'index'`) e resumo textual (`.chart-summary`) abaixo de cada gráfico.
- **Tabelas:** `.table-wrap` com rolagem horizontal e sombras indicando continuação. Comparações de cenários usam cartões no celular.

## Movimento

Durações de 140, 220 e 380 ms com curva `--ease-out`. Usado em seleção (pop), entrada de etapas, abertura de painéis e cartões. `prefers-reduced-motion: reduce` reduz todas as animações e transições para praticamente zero; nada bloqueia interação.

## Imagens

`img()` gera `<picture>` com WebP em 480/800 px (e 1200 px para a capa), `sizes` por contexto, `width`/`height` reais (sem layout shift), `fetchpriority="high"` na capa e `loading="lazy"` no restante. O JPEG original é o fallback. AVIF foi testado, mas o codificador disponível gerou artefatos visíveis e foi descartado.
