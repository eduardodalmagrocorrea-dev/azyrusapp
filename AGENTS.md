# AZYRUS — instruções de desenvolvimento

- Preserve a aplicação existente, a identidade visual, os dados locais e o funcionamento no iPhone/PWA. Não recrie uma seção independente de tarefas: `Tasks.tsx` contém calendário e notas.
- Analise o estado do repositório antes de editar. Não faça commits, pushes, deploys ou operações irreversíveis sem autorização. Não exponha credenciais nem conteúdo de arquivos de ambiente.
- Use os tipos e mecanismos de armazenamento existentes. Hábitos com lembretes devem usar a sincronização existente. Não altere VAPID, Supabase ou service worker sem necessidade comprovada.
- A IA deve ser compartilhada, manter segredos no servidor, validar entradas e saídas e exigir prévia e confirmação antes de salvar alterações. Priorize soluções gratuitas; preserve entrada por texto quando voz não estiver disponível.
- Execute build e verificações adequadas após mudanças relevantes. Documente decisões e pendências sem dados sensíveis.
