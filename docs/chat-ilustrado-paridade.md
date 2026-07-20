# Chat Ilustrado e paridade com o Symbaroum

O Chat Ilustrado e uma camada de apresentacao do modulo
`symbaroum-ind-resources`. Ele deve ser entendido como uma variacao visual do
chat nativo, nao como um segundo motor de regras.

## Principio de paridade

O sistema Symbaroum continua sendo a fonte de verdade para regras, rolagens,
alvos, dano, protecao, criticos, resistencia, efeitos e audiencia. O Ilustrado
somente transforma a apresentacao depois que o `ChatMessage` foi criado.

Quando o setting `modernChatStyle` esta em `legacy`, o modulo deixa o HTML
nativo intacto. Esse e o caminho de paridade visual maxima com o sistema
original. Quando esta em `illustrated`, o modulo substitui apenas o conteudo
visual que consegue identificar; mensagens nao reconhecidas usam o HTML nativo.

## Pipeline atual

1. `ModernChatService.register()` registra `renderChatMessageHTML` uma vez.
2. A mensagem e filtrada por audiencia e flags antes de qualquer substituicao.
3. O modo `legacy` encerra o processamento e preserva o sistema.
4. O renderer procura uma classe de mensagem conhecida.
5. O builder correspondente cria o card Ilustrado.
6. Links, botoes de resistencia, aplicar resultados e UUIDs sao reconectados.
7. O conteudo visual e substituido sem recalcular o Roll.
8. Em erro, o modulo registra o erro e nao deve transformar a falha visual em
   falha de regra.

## Mapeamento de mensagens

| Mensagem nativa | Builder Ilustrado | Regra preservada |
| --- | --- | --- |
| Combate | `buildCombatCard` | Ataque, oposicao, dano, protecao, efeitos e privacidade. |
| Habilidade/poder | `buildAbilityRollCard` | Atributo, alvo, resultado, referencia e efeitos. |
| Defesa/resistencia | `buildResistRequestCard` | Destinatario e acao de rolar resistencia. |
| Aplicar resultados | `buildApplyResultsCard` | Acao exclusiva do GM. |
| Atributo | `buildAttributeRollCard` | Formula, modificadores e resultado. |
| Morte | `buildDeathRollCard` | Rolagem e estado de morte. |
| Manobra | `buildManeuverCard` | Teste, alvo, efeito e resultado. |
| Recuperacao de municao | `buildAmmoRecoveryCard` | Dificuldade, projeteis, qualidade e resultado. |
| Recarga/uso de municao | builders de municao | Item, quantidade, aljava e links. |
| Descanso/fome | `buildRestCard` e `buildHungerCard` | Dias, vitalidade, fome e testes. |
| Uso de item/equipamento | builders de item | Documento usado e link UUID. |
| Macro/sistema | `buildSystemMacroCard` | Texto e audiencia da mensagem. |

Os nomes acima sao builders internos; eles nao sao API do sistema Symbaroum.
Alteracoes neles devem continuar pequenas e cobertas por testes.

## O que o Ilustrado preserva

### Resultado

O card deve usar o resultado que ja esta na mensagem nativa. Nao deve fazer uma
segunda chamada a `baseRoll`, `doBaseRoll`, `Roll.evaluate` ou a qualquer
metodo de dano.

Isso e especialmente importante para:

- favor e desfavor;
- criticos opcionais;
- criticos raros com segunda rolagem;
- testes opostos;
- resistencia;
- dano e protecao;
- Dice So Nice.

### Privacidade

`whisper`, `blind` e as flags de privacidade sao preservados antes da troca
visual. O fluxo de rolagem privada usa a mensagem privada para GM e apresenta
para os demais apenas um aviso generico. O Ilustrado nao pode transformar uma
mensagem de GM em mensagem publica.

O fluxo de combate com informacao reduzida tambem precisa continuar separado:

- o GM recebe detalhes suficientes para conduzir o combate;
- o jogador recebe apenas a informacao permitida;
- protecao, modificadores de NPC e dano oculto nao podem vazar por texto,
  tooltip, atributo HTML ou link.

### Interacao

Os botoes nativos importantes continuam existindo no card visual:

- `Rolar resistencia` para o destinatario correto;
- `Aplicar resultados` para o GM;
- links UUID de itens, armas, projeteis e rituais;
- abertura de documentos quando o texto foi marcado como clicavel.

## O que o Ilustrado muda

- usa imagens de atores, itens e armas;
- organiza ator -> item/arma -> alvo;
- usa separador Symbaroum proprio;
- compacta texto e remove blocos redundantes;
- apresenta formulas em texto mais curto;
- adapta nomes e frases para PT-BR/EN;
- usa o cranio ilustrado para representar o d20;
- mostra cards menores para equipamentos, descanso e mensagens de sistema.

Essas alteracoes sao cosmeticas somente quando nao removem dados exigidos pelo
contrato nativo ou por permissao. Remover protecao de um card de jogador, por
exemplo, e uma politica de privacidade; nao e apenas CSS.

## Matriz de paridade

| Area | Nativo | Ilustrado | Classificacao |
| --- | --- | --- | --- |
| Formula e resultado | `ChatMessage`/Roll nativo | Le e exibe o resultado | Preservado |
| Favor/desfavor | Definido pelo sistema | Exibe o resultado produzido | Preservado |
| Critico comum | Setting nativo | Nao recalcula | Preservado |
| Critico raro | Primeiro e segundo d20 nativos | Deve manter a informacao autorizada | Preservado com risco de regressao |
| Ataque e dano | Sistema calcula | Card resume | Transformado visualmente |
| Protecao de NPC | Dado nativo do alvo | Omitido para jogador quando necessario | Politica de privacidade |
| Resistencia | Pedido + botao nativo | Card simples + botao reconectado | Preservado com nova aparencia |
| Aplicar resultados | Acao do GM | Botao visual equivalente | Preservado |
| Iniciativa | Hook e settings nativos | Nao deve criar mensagem extra | Preservado |
| Privacidade de rolagem | whisper/blind | Aviso generico para nao-GM | Preservado com transformacao |
| Dice So Nice | Anima Roll | Aguarda/acompanha mensagem existente | Integracao |
| Item/UUID | Link nativo | Link no texto/card | Preservado |
| Mensagem desconhecida | HTML nativo | Fallback nativo | Preservado |
| Legacy | HTML nativo | Modulo nao substitui | Paridade direta |

## Configuracoes que precisam ser respeitadas

O Ilustrado possui settings proprios, mas nao deve duplicar os nativos do
Symbaroum. A separacao correta e:

### Settings nativos do sistema

O modulo deve consultar o namespace `symbaroum` para regras como:

- automacao de combate;
- botao de resistencia;
- sucesso automatico em 1;
- criticos comuns e raros;
- criticos fora do combate;
- modificadores e ataques de NPC;
- rolagens de iniciativa;
- referencias e rituais adicionais.

### Settings do modulo

O namespace `symbaroum-ind-resources` controla apenas extensoes, por exemplo:

- habilitar o Chat Moderno;
- escolher `illustrated` ou `legacy`;
- privacidade adicional da rolagem;
- uso de itens no chat;
- cards de municao, descanso e fome;
- registro do mestre;
- ritualista, recipientes, sobrecarga e prontidao de armas;
- integracoes opcionais.

Se uma opcao ja existe no sistema, ela nao deve ser recriada no modulo. O
Ilustrado deve ler o valor nativo e seguir o mesmo fluxo.

## Riscos atuais que exigem validacao

1. O Ilustrado e um parser de mensagens. Uma nova versao do sistema ou de um
   modulo que mude o texto/HTML pode cair no fallback nativo ou ser classificada
   incorretamente.
2. Mensagens do sistema e de terceiros podem ter formato nao previsto. Elas
   devem permanecer visiveis no nativo, nunca desaparecer silenciosamente.
3. Combate privado pode gerar uma mensagem completa para GM e uma copia
   sanitizada publica. A deduplicacao precisa ser validada no GM e no jogador.
4. O pedido de resistencia precisa continuar sendo direcionado e clicavel.
5. A regra de critico raro precisa mostrar o segundo resultado quando o usuario
   tem permissao, sem alterar o resultado persistido.
6. Dice So Nice pode estar ausente, desativado ou configurado para outro modo.
7. O manifesto declara verificacao em Foundry 13.350; nao ha teste runtime
   equivalente confirmado em v14.

## Matriz de validacao

### Mensagens

- ataque com sucesso e falha;
- teste de atributo normal, favor e desfavor;
- 1 e 20 com criticos desligados;
- critico opcional;
- critico raro com segunda rolagem;
- dano, protecao, efeitos e resistencia;
- manobra com e sem teste;
- ritual, poder, habilidade e item;
- descanso, fome, municao e equipamento;
- iniciativa e morte;
- macro e mensagem de sistema;
- mensagem desconhecida de outro modulo.

### Audiencia

- GM;
- jogador autor;
- jogador alvo;
- jogador nao envolvido;
- jogador confiavel;
- whisper;
- blind;
- rolagem privada;
- combate com detalhes reduzidos.

### Ambiente

- Ilustrado;
- Legacy;
- Dice So Nice ativo;
- Dice So Nice ausente;
- socketlib ativo;
- dependencia opcional ausente;
- ficha reaberta e mensagem re-renderizada;
- mundo novo e mundo com dados existentes;
- Foundry v13 e fallback tecnico para v14.

## Criterio de paridade

O Ilustrado pode ser considerado uma variacao visual do chat nativo quando:

1. usa a mesma mensagem e o mesmo Roll como fonte;
2. respeita os mesmos settings nativos;
3. preserva a audiencia e as flags;
4. conserva botoes e links interativos;
5. nao cria rolagens, dano ou efeitos duplicados;
6. mantem fallback nativo para conteudo desconhecido;
7. passa a matriz GM/jogador/privacidade/criticos/DSN em v13 e v14.

Enquanto o item 7 nao for executado em runtime nas duas versoes, a afirmacao
correta e: o modulo tem fallback tecnico e testes estaticos, mas a paridade
runtime v14 continua pendente.

