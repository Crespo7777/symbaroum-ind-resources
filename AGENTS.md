# AGENTS.md - Diretriz de Estabilizacao do Modulo

## Objetivo atual

O projeto esta em fase de estabilizacao. A prioridade e corrigir regressoes, falhas de integracao, inconsistencias visuais e erros de comportamento sem introduzir novas funcionalidades ou refatoracoes amplas, salvo quando o usuario solicitar explicitamente.

Ordem de prioridade:

1. preservar dados, permissoes e mundos existentes;
2. restaurar comportamentos que funcionavam antes;
3. impedir regressoes entre GM e jogador;
4. manter compatibilidade com Foundry VTT v13 e v14;
5. corrigir com a menor alteracao possivel;
6. otimizar apenas quando houver evidencia e cobertura suficiente.

## Regra principal

Antes de editar, reproduza ou determine tecnicamente a causa do problema. Nao trate apenas o sintoma visual quando a origem estiver em estado, flags, settings, hooks, sockets, documentos ou transformacao do chat.

Nao altere codigo nao relacionado ao defeito atual. Nao aproveite uma correcao para reorganizar arquivos, renomear APIs, reformatar grandes blocos ou criar abstracoes sem necessidade comprovada.

## Processo obrigatorio para correcoes

1. Leia o relato, imagens, video e console fornecidos.
2. Localize o fluxo completo: origem do evento, regra, persistencia, UI e efeitos colaterais.
3. Compare com o sistema Symbaroum original quando o comportamento depender dele.
4. Identifique quais fluxos existentes podem ser afetados pela correcao.
5. Aplique um patch pequeno, reversivel e localizado.
6. Adicione ou atualize um teste de regressao sempre que a logica puder ser testada fora do Foundry.
7. Execute testes focados e depois a suite completa.
8. Valide idiomas, settings, permissoes e estados ativado/desativado quando forem relevantes.
9. Sincronize com `Data/modules` somente depois da validacao estatica.
10. Atualize o release somente mediante pedido explicito e depois de todas as validacoes.

## Matriz minima de regressao

Avalie, conforme o fluxo afetado:

- GM, jogador e jogador confiavel;
- mensagem publica, privada, cega e direcionada;
- chat Ilustrado e Legacy;
- configuracao ligada e desligada, sem exigir F5 quando prometida como tempo real;
- ficha de jogador, PNJ e monstro;
- item no inventario, recipiente e compendio;
- mundo recarregado e ficha reaberta;
- dependencia ativa, ausente e desativada;
- Foundry v13 e fallback tecnico para v14.

Se algum caso nao puder ser executado, declare-o como teste manual pendente. Nunca apresente analise estatica como teste real no Foundry.

## Protecao contra regressoes

- Nao use seletores CSS globais quando um namespace do modulo resolver.
- Nao registre hooks ou listeners mais de uma vez.
- Nao persista dados em hooks de renderizacao.
- Nao dependa de ordem acidental entre modulos.
- Nao confie em dados enviados pelo cliente para operacoes privilegiadas.
- Nao altere diretamente internals do Foundry ou do sistema quando houver API publica.
- Nao duplique configuracoes nativas do Symbaroum.
- Nao mude defaults, regras, textos ou layout fora do escopo solicitado.
- Nao sobrescreva alteracoes existentes do usuario.
- Nao sincronize arquivos de desenvolvimento, logs, caches, locks ou artefatos temporarios.

## Criterio de conclusao

Uma correcao so esta concluida quando:

- a causa foi identificada;
- o comportamento solicitado foi corrigido;
- os fluxos relacionados foram revisados;
- os testes focados e a suite completa passaram;
- nao existem erros novos de sintaxe, JSON, traducoes ou estrutura;
- riscos e testes manuais pendentes foram informados objetivamente.

Em caso de duvida entre uma mudanca ampla e uma correcao local, escolha a correcao local.
