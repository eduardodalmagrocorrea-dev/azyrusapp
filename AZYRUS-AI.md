# AZYRUS AI — diagnóstico inicial

- A autenticação atual é apenas no cliente; a senha está no bundle e `azyrus-authenticated` no localStorage não protege APIs.
- `api/ai.ts` e autenticação no backend ainda não existem neste repositório. `tsconfig.json` verifica `src` e `vite.config.ts`, não as funções de `api`.
- Dados principais usam IndexedDB (`src/db.ts`); notas usam localStorage em `src/pages/Tasks.tsx`.
- Lembretes usam `src/notifications.ts`, `api/sync-habit-reminders.ts` e `api/send-habit-reminders.ts`. O endpoint de envio exige POST e CRON_SECRET; `vercel.json` não define cron. A origem e frequência do agendamento externo precisam ser verificadas antes de mudanças.
- `.env.local` está rastreado pelo Git. Verificar seu conteúdo em ambiente seguro e remover segredos do histórico somente com plano e autorização adequados; não divulgar valores.
- O endpoint de sincronização de lembretes não verifica sessão: conhecer um endpoint de inscrição permite tentar alterar seus lembretes. Revisar autenticação e autorização sem interromper notificações.
- Próximos passos: autenticação de servidor com cookie seguro e limite de tentativas persistente e compartilhado entre instâncias; configuração das variáveis na Vercel; proteção e testes de API; integração incremental com confirmação; testes em iPhone. Não considerar limite em memória de função serverless como proteção efetiva.
- Gemini 2.5 Flash-Lite consta no plano gratuito, mas o Google informa restrição de acesso a modelos 2.5 para usuários com uso anterior. Verificar acesso efetivo no projeto antes de depender dele; cotas variam. Dados enviados no plano gratuito podem ser usados para melhorar produtos do Google.

## Implementação iniciada

Autenticação por senha no servidor e cookie HttpOnly de 30 dias; endpoints recusam alterações entre origens. O controle de tentativas e de uso da IA usa a função SQL em `sql/azyrus-rate-limit.sql`, com falha fechada se ela não estiver instalada. O login permite 10 tentativas por IP em 15 minutos; a IA tem limite global de 20 chamadas por 24 horas em janela fixa. IPs compartilhados compartilham o limite. A função SQL precisa ser atualizada antes de publicar esta versão. A sessão exige rede ao abrir o aplicativo, mesmo que o PWA esteja instalado.

A IA interpreta texto e voz e apresenta campos editáveis para confirmar a criação de registros. Sem a execução do SQL e a configuração das variáveis, a autenticação não funcionará. Testar sessão, limites e comandos em uma implantação de teste antes de produção.

## Integrações em andamento

A IA propõe criação de hábitos, eventos, finanças, metas, treinos, notas, refeições e registros de água com revisão visual e confirmação. Para exclusão e edição, o usuário seleciona um registro encontrado no aparelho e confirma; as alterações são processadas individualmente. Em treinos, a IA pode adicionar, alterar ou remover um exercício por proposta; repetições e carga alteradas aplicam-se a todas as séries do exercício. Na criação, exercícios exigem nome e carga; séries, repetições e descanso podem ficar pendentes. A carga é preservada até que a quantidade de séries seja informada. Notas selecionadas podem ser resumidas ou organizadas após envio explícito do conteúdo ao Gemini, com prévia antes de substituir a nota.
