# Mochi AI ♡ — configuração e operação

A Mochi acrescenta geração, alterações por conversa, chat e revisão ao Japan Diary. O motor clássico em `src/js/recommendations.js`, a calculadora e os dados locais continuam independentes da IA. Nenhuma chamada ao Gemini acontece ao carregar páginas, digitar, navegar pelo mapa ou recalcular valores.

A implementação usa Vite no navegador e cinco Vercel Functions Node.js em `/api/ai`. A chave e o SDK `@google/genai` ficam no servidor. O navegador recebe somente dados validados. Sem chave, acesso de grupo, segredo de sessão, origem autorizada **e** Redis configurados, os endpoints respondem `503 disabled` e não chamam o provedor. Não existe alternativa com chave no frontend.

## Modelo e acesso

Verificação documental em **13/11/2026**: [`gemini-3.5-flash-lite`](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) está documentado como estável e oferece saídas estruturadas. Por isso, mantivemos o modelo solicitado. Documentação não comprova acesso de uma chave específica: a disponibilidade no projeto precisa ser validada pela administradora após configurar seu ambiente.

`GEMINI_MODEL` é privado e aceita IDs Flash/Flash-Lite estáveis no formato validado pelo servidor. Não há mudança silenciosa de modelo em caso de erro. Se a conta não tiver acesso, escolha manualmente outro Flash/Flash-Lite econômico que ainda conste no [catálogo oficial](https://ai.google.dev/gemini-api/docs/models) e suporte [saídas estruturadas](https://ai.google.dev/gemini-api/docs/structured-output). Revise preço e limites antes de mudar. Modelos Pro não são aceitos por esta versão.

## Chave e ambiente local

1. Acesse o [Google AI Studio](https://aistudio.google.com/api-keys) com sua própria conta e crie uma chave para um projeto dedicado. Confira as [orientações oficiais de segurança](https://ai.google.dev/gemini-api/docs/api-key) e as restrições disponíveis para a chave. Não envie a chave pelo chat, por PR ou por mensagem ao grupo.
2. Copie `.env.example` para `.env.local`. Os valores privados permanecem vazios no exemplo; `.env`, `.env.*` e `*.local` são ignorados pelo Git, com exceção de `.env.example`.
3. Preencha as variáveis abaixo somente nesse arquivo ou no painel privado da Vercel. Nunca use prefixo `VITE_` para segredos.

| Variável privada           | Finalidade                                                               |
| -------------------------- | ------------------------------------------------------------------------ |
| `GEMINI_API_KEY`           | Chave do projeto Google                                                  |
| `GEMINI_MODEL`             | Padrão `gemini-3.5-flash-lite`                                           |
| `AI_ENABLED`               | Somente `true` permite ativação; demais proteções continuam obrigatórias |
| `MOCHI_GROUP_ACCESS_HASH`  | Hash scrypt do código compartilhado com o grupo                          |
| `MOCHI_SESSION_SECRET`     | Segredo aleatório para HMAC e sessões                                    |
| `UPSTASH_REDIS_REST_URL`   | URL HTTPS privada da API REST do Upstash Redis                           |
| `UPSTASH_REDIS_REST_TOKEN` | Token privado do Redis, com permissão para scripts e gravação            |
| `MOCHI_ALLOWED_ORIGINS`    | Origens exatas separadas por vírgula, sem caminho ou barra final         |
| `MOCHI_LOCAL_HTTP`         | `true` exclusivamente para desenvolvimento em localhost/127.0.0.1        |

Para preparar o acesso, execute em **seu terminal privado**:

```bash
node scripts/mochi-access.mjs
```

O script recebe um código de 12–128 caracteres sem exibi-lo, gera um salt, um hash scrypt e um segredo aleatório. Coloque o hash e o segredo no ambiente privado; compartilhe apenas o código com os amigos por um canal apropriado. Não execute o script em CI nem publique sua saída. Não há código de grupo embutido no JavaScript distribuído.

### Testar as Functions localmente

`npm run dev` inicia **somente o Vite** em `127.0.0.1:5173`. A IA permanece indisponível nessa configuração; os testes de interface interceptam `/api/ai` e usam mocks.

Para testar frontend e Functions juntos, use o [Vercel CLI / vercel dev](https://vercel.com/docs/cli/dev), após vincular este checkout ao seu projeto:

```bash
npm ci
npx vercel dev --listen 3000
```

Configure `MOCHI_ALLOWED_ORIGINS=http://localhost:3000` e `MOCHI_LOCAL_HTTP=true` em `.env.local`, e abra exatamente `http://localhost:3000`. Se usar `127.0.0.1`, configure essa origem explicitamente. O Vercel CLI carrega o ambiente local; não crie proxy direto para o Gemini no Vite.

Sem credenciais, ainda é possível verificar `503`, usar o site clássico e executar todos os testes. Com credenciais reais, use uma única ação explícita de teste e confira a cota; não execute a suíte contra o provedor real.

## Acesso, sessão e proteção persistente

O código do grupo é conferido no servidor com scrypt e comparação em tempo constante. Um login válido emite cookie assinado com HMAC, `HttpOnly`, `Secure`, `SameSite=Strict`, caminho `/` e expiração de oito horas. Em produção ele usa prefixo `__Host-`. A exceção HTTP só vale para ambiente local; `VERCEL_ENV=production` a desativa. A API também exige origem exata e token CSRF derivado da sessão para cada operação de escrita.

Sair remove o cookie do navegador. Para invalidar todas as sessões e acessos anteriores, troque **o código/hash e o segredo de sessão** e publique o novo ambiente. O código identifica o grupo; esta primeira versão não mantém contas individuais nem permite revogar somente um participante. A sessão é um token assinado: a remoção do cookie no logout não revoga uma cópia roubada antes da expiração. A rotação do segredo invalida essas cópias.

Crie um banco [Upstash Redis](https://upstash.com/docs/redis/features/restapi) dedicado, ou use um já autorizado. Configure a URL REST e o token no servidor. Nenhum banco, plano pago ou faturamento é criado automaticamente por este código. Os scripts Lua fazem a reserva de cota e concorrência de forma atômica, compartilhada entre instâncias serverless, com expiração. Todas as chaves usam o mesmo hash tag Redis e o prefixo `mochi:{group}:v1:`. Ambientes que compartilham esse banco compartilham os limites.

| Proteção                    | Limite implementado                                                           |
| --------------------------- | ----------------------------------------------------------------------------- |
| Grupo inteiro               | 40 solicitações aceitas por dia UTC                                           |
| Sessão                      | 8 solicitações por hora UTC                                                   |
| IP pseudonimizado           | 12 solicitações por hora UTC                                                  |
| Concorrência                | 2 no grupo e 1 por sessão                                                     |
| Tentativas de login         | 30/hora no grupo e 5/hora por IP                                              |
| Lease de concorrência       | 60 segundos; limpeza automática e TTL de 70 segundos                          |
| Corpo HTTP                  | 64.000 bytes                                                                  |
| Mensagem / notas adicionais | 1.200 / 1.000 caracteres                                                      |
| Histórico enviado           | Últimas 6 mensagens; até 1.500 caracteres cada                                |
| Contexto do roteiro         | Até 90 dias, 30 bases e 12 atividades por dia                                 |
| Saída                       | Chat: 1.200 tokens; análise: 2.200; proposta: `min(16000, 3000 + dias × 140)` |
| Timeout do provedor         | 20 segundos; interface cancela espera em 27 segundos                          |
| Tentativas SDK              | 1, sem retry automático                                                       |

Os limites são conservadores e fixos em `server/mochi-security.js`; aumentá-los exige revisão de código e de custo. Trocar de sessão/IP não elimina a cota global. Falhas e cancelamentos **consomem a reserva da solicitação**; não há devolução que permita contornar a cota. As janelas são fixas, portanto há possibilidade de duas cotas próximas à virada do dia/hora. Se Redis falhar na reserva, a chamada ao Gemini não acontece. Se a finalização falhar, o lease expira e o erro é registrado sem dados privados.

Cancelar interrompe a espera do cliente e sinaliza o abort ao SDK. Conforme a [documentação do SDK](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html), isso não garante que o processamento remoto pare nem elimina cobranças. Os limites de solicitações permanecem mesmo se o provedor continuar processando.

## Endpoints e contratos

Todas as respostas usam JSON e `Cache-Control: no-store`. O acesso foi implementado para **frontend e backend na mesma origem**. Não habilitamos CORS com credenciais entre domínios. GitHub Pages continua publicando a experiência clássica; para usar Mochi, abra o frontend hospedado na Vercel junto de suas Functions. Nenhuma URL pública externa com chave é adicionada ao frontend.

| Método e endpoint        | Entrada / resultado                                                                |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `GET /api/ai/session`    | Estado do acesso e token CSRF da sessão; não chama Gemini                          |
| `POST /api/ai/session`   | `{code}`; verifica código e limites de login; emite cookie e CSRF                  |
| `DELETE /api/ai/session` | Cookie + `X-Mochi-CSRF`; remove cookie                                             |
| `POST /api/ai/itinerary` | Preferências mínimas e orçamento opcional; retorna proposta                        |
| `POST /api/ai/refine`    | Preferências + roteiro relevante + pedido; retorna proposta completa para comparar |
| `POST /api/ai/chat`      | Preferências + roteiro opcional + mensagem + histórico limitado                    |
| `POST /api/ai/analyze`   | Preferências + roteiro; retorna análise e verificações determinísticas             |

Os quatro endpoints de IA exigem cookie e cabeçalho `X-Mochi-CSRF`. O cliente cuida deles; não salve o token de sessão em localStorage. Os schemas completos são a fonte de verdade em `src/js/mochi-contracts.js`. Objetos têm campos estritos; dados extras como backup completo são rejeitados.

Cada pedido contém `profile`, `budget` (resumo ou `null`) e `additionalPreferences`. O perfil inclui ano, estação/mês/data opcionais, origem, viajantes, dias, noites, ritmo, interesses, prioridades e IDs de cidades. O roteiro enviado contém somente cidades, noites, dias, títulos e marcação de pausa; não envia custos individuais, notas privadas, checklists, nomes, documentos, e-mails ou listas de compras. Títulos e texto livre ainda podem conter algo pessoal digitado pela pessoa: o painel pede explicitamente para não incluí-lo.

O chat mantém até 20 mensagens **somente em memória durante a sessão da página**; envia no máximo seis. Limpar ou recarregar elimina esse histórico. Ao desmarcar orçamento, turnos anteriores marcados como contendo esse resumo ficam fora do contexto enviado. Cada abertura pede consentimento novamente. Nenhum pedido depende de consentimento implícito.

Sucesso: `{data, meta: {requestId, mode, checks?}}`. `mode` é `gemini` ou `local` para respostas protegidas no chat. Erros: `{error: {code, message, requestId}}`. Códigos relevantes:

- `400 invalid_input`, `413 too_large`, `405 method_not_allowed`.
- `401 access_required`, `403 access_required/origin_rejected`.
- `429 rate_limited/busy/provider_limited`, com `Retry-After` quando disponível.
- `502 invalid_response`, `504 timeout`, `499 cancelled` quando a conexão ainda existe.
- `503 disabled/protection_unavailable/provider_unavailable/unavailable`.

Não devolvemos mensagens brutas, stack traces ou configurações do SDK. A interface usa a mensagem “A Mochi está descansando um pouquinho. ♡ Você ainda pode continuar planejando normalmente.” e oferece a sugestão clássica.

## Integridade e limites das sugestões

O SDK recebe JSON Schema com `responseMimeType=application/json` e `responseJsonSchema`. Restrições que não fazem parte do subconjunto do provedor, como comprimento de texto, são aplicadas novamente com Zod no servidor. O frontend também valida o retorno antes da prévia. JSON inválido, campos extras, destinos fora do catálogo, noites incorretas, dias faltantes, sequência incompatível entre dias e bases ou custos preenchidos são rejeitados.

Textos retornados são escapados; nenhum HTML, Markdown executável, script ou URL arbitrária do modelo é executado. A validação rejeita markup, valores monetários, durações numéricas de transporte e certas afirmações de confirmação futura. Esse filtro não prova a verdade de toda frase: as sugestões continuam sujeitas à revisão humana, com pendências explícitas. Não há ferramenta de busca conectada. O contexto do servidor inclui somente catálogo editorial e normais históricas JMA 1991–2020, verificadas no projeto em 13/11/2026; não é previsão de viagem.

Perguntas detectadas sobre entrada, vistos, JESTA, tax-free, impostos, preços, disponibilidade, horários e saúde recebem resposta local declarando a ausência de verificação atual e apontando as páginas de fontes/regras do planner, sem inventar uma resposta atualizada. As palavras-chave são uma proteção adicional; o prompt de sistema também proíbe essas afirmações. A Mochi não deve ser usada para confirmar decisões legais ou médicas. Metas mensais são calculadas no código existente; se não houver data, solicita-se completar a calculadora. Não há nova cotação ou cálculo financeiro pelo modelo.

Na geração e no refinamento, a prévia mostra bases e comparação de todos os dias, atividades, motivos, chuva, logística, economia e pendências. Só **Aplicar alteração** muda o roteiro ativo. A versão anterior é arquivada usando o mesmo formato do planejador; **Desfazer alteração** ou **Versões anteriores** permite restaurá-la. Atividades com o mesmo título preservam as estimativas e os favoritos existentes; novas atividades começam com custo zero (“A estimar”). O orçamento do aplicativo não é alterado. Backups v1/v2 continuam compatíveis e não recebem conversas nem credenciais.

O analisador verifica soma das noites, dias além da duração, excesso de atividades e blocos sem pausas no código, antes de pedir interpretação ao Gemini. As observações do modelo distinguem inferência e sugestão. Nenhuma conclusão sazonal ou logística é uma confirmação de condições futuras.

## Consumo, privacidade e desligamento

- Consulte uso e cotas no Google AI Studio e os [limites por projeto/modelo](https://ai.google.dev/gemini-api/docs/rate-limits). Chaves do mesmo projeto compartilham quotas. Uma resposta 429 não é repetida automaticamente.
- Revise a [tabela oficial de preços](https://ai.google.dev/gemini-api/docs/pricing) e o plano antes de ativar qualquer faturamento. Este projeto não ativa billing, não contrata serviço pago e não pressupõe que uma cota gratuita estará disponível.
- Se usar billing, configure cotas baixas no provedor e alertas no Google Cloud. Alertas de orçamento não são, sozinhos, um bloqueio rígido de gastos. A combinação de cota diária de pedidos e limite de tokens limita exposição; os tokens de entrada também dependem do texto enviado.
- A Vercel registra apenas UUID do pedido, operação, código de resultado, duração e contagens disponíveis de tokens. Nunca registra corpo, resposta, código de grupo, cookie, IP bruto ou chave. IPs são pseudonimizados com HMAC somente nas chaves do limiter. Erros brutos não são registrados.
- Redis mantém contadores diários em hashes `mochi:{group}:v1:metrics:<dia UTC desde epoch>`, com TTL de 30 dias: pedidos por operação/status e tokens disponíveis. `usageUnavailable` indica ausência de metadados; não equivale a zero. Compare com o consumo real no provedor, inclusive chamadas canceladas que podem não retornar metadados. Essas métricas básicas não substituem a fatura do Google.
- Os [termos Gemini](https://ai.google.dev/gemini-api/terms) distinguem serviços gratuitos e pagos. Dados do serviço gratuito podem ser usados para aprimorar produtos e revisados por pessoas; serviços pagos têm condições diferentes, incluindo retenção temporária para segurança. Consulte os termos aplicáveis ao projeto; não prometa retenção zero. Não envie dados sensíveis de participantes.

Para desligar emergencialmente, defina `AI_ENABLED=false` na Vercel e faça redeploy para aplicar o novo ambiente às Functions. Para bloquear também um vazamento, revogue a chave no Google e rotacione segredos. A chave revogada deixa de funcionar mesmo em deploys antigos. O modo clássico continua disponível.

## Publicar na Vercel

1. Importe este repositório como Vite, Node.js 22 ou posterior compatível. `vercel.json` mantém `npm run build`, saída `dist` e duração máxima de 30 segundos nas Functions.
2. Configure as variáveis privadas no painel **Settings → Environment Variables**, nos ambientes necessários. Use origens exatas de produção e preview. Não use wildcard em `MOCHI_ALLOWED_ORIGINS`; previews sem origem própria configurada ficam desabilitados por origem.
3. Em produção, deixe `MOCHI_LOCAL_HTTP=false`. Use HTTPS e o mesmo host para frontend e API. Não inclua segredos em `vercel.json`, código ou variáveis Vite.
4. Publique a branch/PR no ambiente escolhido. A integração não modifica o workflow de publicação do GitHub Pages. Deploys antigos mantêm seus ambientes; revise previews e revogue chaves expostas se houver incidente.
5. Sem login, confirme que uma ação de IA recebe `401` e que o planejamento clássico funciona. Com configuração faltante, espere `503`. Depois, entre no grupo, autorize somente dados mínimos e faça **uma** solicitação manual. Revise a proposta antes de aplicar e confira os registros de consumo. Não exiba cookies/chaves em capturas.
6. Teste aplicar/desfazer e o modo clássico. Verifique o cookie `Secure/HttpOnly/SameSite=Strict`, o cabeçalho CSRF e os limites no ambiente de preview, sem contornar o limiter para demonstrações públicas.

Não foi feito deploy nem chamada real ao Gemini durante a implementação. O acesso da conta Google, as permissões do Redis e as Functions hospedadas dependem dessa configuração da administradora.

## Testes e capturas

```bash
npm test
npm run test:e2e
npm run build
npm run format:check
```

Os testes Node exercitam os handlers, sessão/CSRF, falhas de configuração, validação, SDK simulado, limiter REST simulado, timeout/cancelamento, erros e integração com versões de roteiros. O adaptador Redis é verificado com transporte simulado; não foi conectado a um Redis real. Os testes Playwright interceptam todas as chamadas `/api/ai` e cobrem geração, refinamento, análise, chat, consentimento, fallback, cancelamento, XSS, aplicar/desfazer e layout. Não há chamadas reais ao Google e nenhum teste depende de segredos. Os testes anteriores de backups, orçamento, wizard e mapas são mantidos.

Verificação executada nesta implementação: **49 testes Node**, **31 casos Playwright** e **1 teste do build em `/trip-planner/`** aprovados, além de `npm run build`, `npm run format:check` e `git diff --check`. As capturas foram inspecionadas em desktop, tablet e celular. SDK, Functions hospedadas e Redis reais ainda precisam da validação de configuração descrita acima.

Capturas de respostas simuladas, em 1440, 768 e 390 px:

| Tela                  | Desktop                                       | Tablet                                      | Celular                                     |
| --------------------- | --------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| Convite no resultado  | [1440](screenshots/mochi/invitation-1440.png) | [768](screenshots/mochi/invitation-768.png) | [390](screenshots/mochi/invitation-390.png) |
| Proposta e comparação | [1440](screenshots/mochi/proposal-1440.png)   | [768](screenshots/mochi/proposal-768.png)   | [390](screenshots/mochi/proposal-390.png)   |
| Revisão               | [1440](screenshots/mochi/review-1440.png)     | [768](screenshots/mochi/review-768.png)     | [390](screenshots/mochi/review-390.png)     |
| Chat                  | [1440](screenshots/mochi/chat-1440.png)       | [768](screenshots/mochi/chat-768.png)       | [390](screenshots/mochi/chat-390.png)       |

Avatar Mochi: desenho original em CSS, sem personagem de terceiros.
