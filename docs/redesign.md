# Criar a própria viagem

> A interface foi revisada depois deste documento: veja a [auditoria visual](ui-audit.md), o [design system](design-system.md) e as [capturas antes/depois](screenshots/ui-polish/). As capturas abaixo são regeneradas pela suíte e mostram a versão atual.

A Home anterior misturava inspiração, resumo financeiro, configurações e tarefas. O fluxo agora começa com um convite e revela os detalhes conforme o grupo avança:

**Início → Criar viagem → Nossa sugestão → Meu roteiro → ferramentas.**

## Experiência

- Home editorial com as fotos locais licenciadas, composição de polaroids e um ponto de entrada.
- Seis etapas: época, grupo/duração, interesses, cidades, orçamento e revisão. Campos de época, interesses, destinos e orçamento podem ficar em aberto.
- Até três prioridades ordenadas influenciam destinos e atividades. Seleções têm texto, estado visual e `aria-pressed`.
- Resultado com motivos por cidade, distribuição exata de noites, mapa de pontos, prévia dos dias, eventos e observações específicas.
- Cinco ações principais; o restante fica em grupos recolhíveis e no hub de exploração. Navegação inferior em celular/tablet.
- O resultado pode ser refinado ou rejeitado antes de qualquer aplicação. Após aceitar, o editor existente continua disponível.

## Dados e compatibilidade

A versão 2 armazena o rascunho em `planner.draft`, a etapa em `planner.step`, a sugestão em `planner.result` e a cópia inicial aceita em `planner.baselineRoute`. `routeChosen` diferencia um modelo disponível de uma escolha efetiva. `routes.personalized` contém o roteiro aceito; os modelos sazonais permanecem intactos.

A migração aceita backups v1, preservando roteiros, favoritos, orçamento, notas e listas. O estado antigo continua em `japan-diary-planner-v1`; o novo usa `japan-diary-planner-v2`. Um estado inválido recebe cópia de recuperação quando o armazenamento permitir. Rascunhos incompletos podem ser salvos mesmo com dias/noites em revisão; gerar uma sugestão exige consistência.

Aceitar um novo planejamento exige confirmação quando já há escolhas ou valores anteriores. A viagem ativa, seu orçamento e o roteiro são guardados no histórico; restaurar uma versão guarda a atual primeiro. Não há exclusão automática das rotas antigas.

Os dados JMA/JNTO, a legislação, os eventos, as fotos, Chart.js, Leaflet e as ferramentas existentes foram mantidos. Nenhuma dependência foi adicionada. Os caminhos relativos e as rotas por hash continuam compatíveis com GitHub Pages e Vercel.

## Organização do código

O wizard não foi incorporado ao controlador principal. `planner-controller.js` cuida das interações; `planner-state.js` valida e migra preferências; `recommendations.js` é independente do DOM; `planner-actions.js` aplica/restaura cópias. As telas usam os mesmos componentes HTML que as ferramentas existentes.

O motor é editorial e determinístico. Não usa IA, preços futuros ou cálculo de tempo de viagem. A classificação e seus limites estão documentados no README e no próprio resultado.

## Revisão visual

Capturas reais do Playwright, com estado de teste, estão em `screenshots/`:

| Tela            | Desktop 1440                         | Tablet 768                          | Celular 390                         |
| --------------- | ------------------------------------ | ----------------------------------- | ----------------------------------- |
| Boas-vindas     | [Ver](screenshots/welcome-1440.png)  | [Ver](screenshots/welcome-768.png)  | [Ver](screenshots/welcome-390.png)  |
| Época           | [Ver](screenshots/wizard-1-1440.png) | [Ver](screenshots/wizard-1-768.png) | [Ver](screenshots/wizard-1-390.png) |
| Grupo e duração | [Ver](screenshots/wizard-2-1440.png) | [Ver](screenshots/wizard-2-768.png) | [Ver](screenshots/wizard-2-390.png) |
| Interesses      | [Ver](screenshots/wizard-3-1440.png) | [Ver](screenshots/wizard-3-768.png) | [Ver](screenshots/wizard-3-390.png) |
| Cidades         | [Ver](screenshots/wizard-4-1440.png) | [Ver](screenshots/wizard-4-768.png) | [Ver](screenshots/wizard-4-390.png) |
| Orçamento       | [Ver](screenshots/wizard-5-1440.png) | [Ver](screenshots/wizard-5-768.png) | [Ver](screenshots/wizard-5-390.png) |
| Revisão         | [Ver](screenshots/wizard-6-1440.png) | [Ver](screenshots/wizard-6-768.png) | [Ver](screenshots/wizard-6-390.png) |
| Resultado       | [Ver](screenshots/result-1440.png)   | [Ver](screenshots/result-768.png)   | [Ver](screenshots/result-390.png)   |

As capturas de viewport mostram a navegação fixa como o usuário a vê. O restante do conteúdo é acessível por rolagem. A suíte verifica ausência de overflow horizontal nas três larguras.

## Validação

```sh
npm test
npm run test:e2e
npm run build
npm run test:production
npm run format:check
```

Os testes anteriores foram preservados. Apenas as expectativas ligadas à Home e aos grupos da navegação foram adaptadas ao novo layout. Testes adicionais cobrem migração, prioridades, cenários de verão/inverno, passos opcionais, datas, valores personalizados, continuidade, edição e restauração do planejamento anterior.

A revisão de acessibilidade incluiu semântica, labels, foco de teclado, toque, mensagens de erro, contraste, modo escuro e movimento reduzido. Mapas precisam de acesso aos tiles do OpenStreetMap; os destinos e links de consulta permanecem disponíveis sem eles.
