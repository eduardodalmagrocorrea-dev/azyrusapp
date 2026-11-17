# Testes isolados da AZYRUS AI

## Estado da revisão

- `node tests/ai-local.cjs` executa testes offline com credenciais fictícias, Supabase e Gemini simulados. Não acessa arquivos de ambiente nem a rede. Exercita senha incorreta/correta, cookie, origem, limite, autorização e validação de resposta. Não substitui testes no navegador nem testes reais.
- `npm.cmd run build` e a verificação TypeScript das funções passaram na máquina de desenvolvimento. O build precisou ser executado fora do sandbox por restrição de acesso do Vite.
- A sincronização de lembretes foi protegida e o ícone do service worker foi apontado para `/icon-192.png`, existente. `vercel.json` e o endpoint de envio dos lembretes não foram alterados. Isso não comprova o funcionamento no iPhone nem a configuração do agendamento externo.
- `useStore` agora bloqueia a abertura após falha de leitura, serializa as gravações e mostra erro persistente com nova tentativa. Os testes locais simulam IndexedDB; ainda é preciso testar o comportamento real no navegador e no iPhone, incluindo falta de espaço.
- A validação de datas usa UTC; `node tests/date-local.cjs` verifica fuso UTC+14 e datas impossíveis.
- `api/sync-habit-reminders.ts` exige sessão e mesma origem. O teste no iPhone ainda é necessário. A autenticação é compartilhada pelo único usuário da aplicação e não individualiza a titularidade de cada inscrição.
- O limite de login agora é por IP identificado pelo cabeçalho da Vercel; usuários que compartilham IP também compartilham o limite. A IA mantém limite global por banco. **Antes de publicar a versão nova, execute novamente `sql/azyrus-rate-limit.sql` no Supabase correto** para atualizar a função existente; sem isso, o login novo será bloqueado. A alteração mantém compatibilidade com o login antigo. Sessões assinadas duram 30 dias; não há revogação individual ou botão de saída. Trocar apenas a senha não invalida cookies já emitidos.
- A tela e os dados em IndexedDB/localStorage não são criptografados pela senha do backend. A chave anteriormente exposta deve ser substituída. `.env.local` foi removido do índice, mas, caso tenha sido enviado antes, o histórico pode conter segredos; não reescreva o histórico sem um plano.
- A interface de voz depende de suporte do navegador e PWA no iPhone, ainda não testado. O navegador pode usar serviço remoto para reconhecer a fala. Para resumo e organização, a nota selecionada é enviada ao Gemini.
- Operações por IA têm limites atuais: uma edição ou exclusão por confirmação; uma alteração de exercício por proposta; alterações de carga/repetição aplicam-se a todas as séries desse exercício. Edição manual continua disponível.

## Antes de criar uma prévia

Não execute deploy, commit ou push até autorização explícita. Uma prévia Vercel possui URL própria e não substitui o domínio de produção. Contudo, serviços externos não são isolados automaticamente: configure recursos de teste separados. Não habilite notificações na prévia nem execute o endpoint de lembretes contra o banco real. Preserve o app de produção e seus dados. Ao abrir a prévia, ela terá armazenamento do navegador separado por origem; comece com dados fictícios.

1. Na Vercel, abra o projeto AZYRUS, **Settings → Environment Variables** e configure as variáveis para **Preview**, não Production. `AZYRUS_PASSWORD` deve ser uma senha de teste de pelo menos 12 caracteres; `AUTH_SECRET`, um segredo aleatório de teste com pelo menos 32 bytes; `GEMINI_API_KEY`, uma chave válida com acesso ao modelo. Não compartilhe os valores.
2. Use `SUPABASE_URL` e `SUPABASE_SECRET_KEY` de um projeto Supabase de teste separado. Execute `sql/azyrus-rate-limit.sql` nesse projeto de teste. Não copie para a prévia o segredo do Supabase de produção; não configure o cron real nem use suas tabelas de notificações. Caso crie um projeto Supabase, confirme previamente a disponibilidade da cota gratuita na conta.
3. Ative e confira **Vercel Authentication / Standard Protection** para prévias, disponível no plano Hobby; entre com a própria conta Vercel no iPhone. Valide se o PWA mantém acesso após a instalação; a proteção pode exigir autenticação adicional. Não crie exceções públicas por conveniência.
4. Para testar sem commit ou push, a opção é a CLI da Vercel, vinculada ao projeto correto: `vercel deploy` cria uma prévia; **não** use `--prod`. O comando é um deploy e exige autorização prévia. Instalar a CLI, fazer login e criar a prévia não foram feitos nesta revisão. `.env.local` é ignorado por padrão em deploy via CLI, mas não copie seu conteúdo para outros arquivos enviados.
5. Variáveis Production não são automaticamente variáveis Preview. Mudanças em variáveis exigem nova prévia. A chave Gemini usa a cota do projeto Google correspondente e o acesso ao modelo precisa ser confirmado pelo teste real.

## Roteiro com dados fictícios

1. Abra a URL de prévia no Safari. Verifique a proteção da Vercel, senha incorreta/correta, recarregamento com sessão, ausência de segredo no navegador e resposta 401 à API sem cookie. Não esgote deliberadamente o limite global em um banco compartilhado.
2. Cadastre nome de teste no onboarding. Feche e abra o navegador e confira se os registros permanecem. Teste também falha de rede e espaço restrito; não trate mensagens de sucesso como prova de persistência até resolver a falha silenciosa documentada.
3. Por texto, interprete dois hábitos ou eventos, confira e cancele; verifique que nada foi criado. Repita e confirme. Teste datas relativas, dados ausentes e nomes semelhantes. Atualize um hábito com lembrete **sem ativar push na prévia** e confira os campos.
4. Crie treino com dois exercícios; altere carga, descanso e quantidade de séries; confira campos não alterados e rejeição de nomes duplicados. Para novas séries, informe carga e repetições. Cancele uma exclusão e confirme outra somente com dados de teste.
5. Crie uma nota fictícia; selecione-a em **Resumir ou organizar uma nota**, confira o aviso de envio, edite a prévia e cancele. Repita e confirme; altere a nota em outra aba antes de confirmar e confira a detecção de conflito.
6. Exercite refeições, água, finanças e metas com valores fictícios. Verifique datas e valores após recarregar. Teste comando de edição com nomes parecidos para confirmar que o registro correto deve ser escolhido.
7. No iPhone, adicione a prévia à tela de início como app separado. Teste permissão de microfone, fala em português e fallback de digitação. A disponibilidade da Web Speech API e autenticação da Vercel no PWA devem ser verificadas no aparelho.
8. Para testar push real, somente após preparar projeto Supabase de teste, inscrições, chaves e agendamento isolados e definir um plano específico. Até lá, não ligue notificações na prévia e não acione cron ou endpoints de produção. Verifique a produção separadamente, sem alterar configuração ou inscrições.

Limitações: esta revisão não tem acesso à conta Vercel, ao projeto Gemini nem ao iPhone; não fez chamada real ao Gemini, teste visual, teste de persistência em navegador, nem enviou push.
