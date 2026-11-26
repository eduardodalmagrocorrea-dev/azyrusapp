# AZYRUS

PWA pessoal para iPhone com hábitos, tarefas, metas, treinos, dieta e finanças.

## Rodar
Requer Node 18+.

```bash
npm install
npm run dev
```

## Testar build/PWA

```bash
npm run build
npm run preview
```

O Service Worker é ativado no build/preview.

## Publicar

1. Envie o projeto para um repositório GitHub.
2. Importe o repositório na Vercel.
3. Abra o endereço publicado no Safari do iPhone.
4. Compartilhar → Adicionar à Tela de Início.

## Dados

Os dados ficam localmente no navegador/app. Use **Mais → Exportar dados** para manter um backup JSON.

### Alterações em lote na AZYRUS AI

Cada comando pode reunir até 100 operações. A prévia compara os valores atuais
com os propostos e pede uma escolha quando vários registros têm o mesmo nome
na mesma categoria. O comando inclui um catálogo de nomes, tipos e contagens
de homônimos, limitado a 1.000 nomes distintos por tipo no total.

Uma única transação do IndexedDB salva o lote confirmado. As notas existentes
são lidas do armazenamento anterior até a primeira gravação de notas no
IndexedDB. A cópia anterior permanece no aparelho.

Os testes locais usam respostas simuladas do Gemini e do IndexedDB. A
validação com o serviço real e no PWA do iPhone depende de um ambiente de
teste autorizado.

Não há login, comunidade, analytics ou servidor próprio.
