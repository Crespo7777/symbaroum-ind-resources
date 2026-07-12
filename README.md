# Symbaroum Ind Resources

Modulo de recursos, sobrevivencia, combate e qualidade de vida para o sistema
**Symbaroum** no **Foundry VTT**.

O modulo aparece nas configuracoes como **Tenebre Resources**, mas o ID tecnico
do pacote continua sendo `symbaroum-ind-resources`.

---

## Visao Geral

O **Symbaroum Ind Resources** adiciona automacoes opcionais para mesas que querem
controlar melhor alimentacao, fome, munição, aljavas, sobrecarga, recipientes,
movimento, manobras e mensagens de chat.

O objetivo do modulo e manter o fluxo de jogo rapido, legivel e fiel as regras
de Symbaroum, sem obrigar o Mestre a usar todas as funcoes ao mesmo tempo. Quase
tudo pode ser ativado ou desativado nas configuracoes.

Principais frentes:

- Controle de **Pao de Viagem / Waybread** com usos acumulados.
- Sistema de **aljavas**, recarga, descarga, consumo automatico e recuperacao de
  flechas/virotes.
- Regra opcional de **Fome** e testes de inanição durante o descanso.
- Regra opcional de **Sobrecarga** com pesos por item.
- Sistema de **recipientes** com sublistas expansivas na ficha.
- **Regua de movimento** baseada na distancia de Symbaroum.
- Automacao de **manobras de combate**.
- Catalogo de **Ritualista** com todos os rituais dos livros Básico e Guia
  Avançado do Jogador, agrupados por tradição e com restrições identificadas.
- Chat moderno no estilo **Ilustrado**, com opcao **Legacy** para voltar ao
  visual original do sistema.
- Compatibilidade com **Dice So Nice**, **Automated Animations**, **Token Action
  HUD**, **Drag Ruler** e outros modulos comuns.

---

## Compatibilidade

| Componente | Versao |
| --- | --- |
| Foundry VTT | v13 |
| Sistema Symbaroum | 6.1.6 |
| Modulo | 0.2.26 |
| Manifest | `https://raw.githubusercontent.com/Crespo7777/symbaroum-ind-resources/main/module.json` |
| Download | `https://github.com/Crespo7777/symbaroum-ind-resources/releases/latest/download/symbaroum-ind-resources.zip` |

### Dependencia obrigatoria

- `socketlib`

### Dependencia recomendada

- `libWrapper`

`libWrapper` nao e obrigatorio, mas melhora a convivencia quando outros modulos
tambem alteram dialogs, fichas, rolagens, menus ou tokens.

### Modulos opcionais integrados

- `dice-so-nice`: rolagens do modulo aguardam o dado 3D quando disponivel.
- `autoanimations`: itens, habilidades, poderes e rituais enviados ao chat ficam
  detectaveis por Automated Animations.
- `JB2A`: recomendado para animacoes visuais com Automated Animations.
- `token-action-hud-core` e `token-action-hud-symbaroum`: adiciona acoes do
  modulo ao HUD.
- `drag-ruler`: quando ativo, o Tenebre cede a regua propria para evitar conflito.

---

## Instalacao

### Pelo Foundry

1. Abra o Foundry VTT.
2. Va em **Add-on Modules**.
3. Clique em **Install Module**.
4. Cole o manifest:

```text
https://raw.githubusercontent.com/Crespo7777/symbaroum-ind-resources/main/module.json
```

5. Ative o modulo dentro do mundo.
6. Ative tambem `socketlib`.

### Manualmente

1. Baixe `symbaroum-ind-resources.zip` na aba de Releases.
2. Extraia para:

```text
FoundryVTT/Data/modules/symbaroum-ind-resources
```

3. O arquivo `module.json` precisa ficar diretamente dentro da pasta
   `symbaroum-ind-resources`, nao dentro de uma subpasta extra.
4. Reinicie o Foundry ou pressione `F5` no mundo.

---

## Configuracoes

As configuracoes ficam em:

```text
Configuracoes de Jogo -> Configure Settings -> Symbaroum Ind Resources / Tenebre Resources
```

Cada categoria abre um formulario independente. As alteracoes passam a valer ao
salvar; fichas, chat, HUD e controles afetados sao atualizados sem exigir F5
sempre que a API do Foundry permite.

### Alimentacao

| Opcao | Efeito |
| --- | --- |
| Ativar Pao de Viagem | Ativa o controle especial de Pao de Viagem / Waybread. |
| Usos por pao | Define quantos dias cada unidade alimenta. Padrao: 7. |
| Usar outros alimentos | Permite transformar itens de comida em suprimentos com usos configuraveis. |
| Alimentos configuraveis | Adiciona, remove, cria e define usos por unidade; itens criados ficam na pasta `Alimentos`. |

### Descanso e Fome

| Opcao | Efeito |
| --- | --- |
| Ativar Fome | Adiciona o efeito Fome e aplica a regra opcional de inanicao. |
| Exibir botao Descanso nas fichas | Adiciona o botao Descanso no cabecalho da ficha. |
| Ativar recuperacao automatica | Recupera Vitalidade pelo descanso. |
| HP/Vitalidade por dia de descanso | Define o valor recuperado por dia. Padrao: 1. |

### Municao

| Opcao | Efeito |
| --- | --- |
| Ativar consumo automatico | Consome munição quando uma arma marcada dispara. |
| Usar aljava carregada | Alterna entre o fluxo de aljavas e o consumo direto de munição avulsa. |
| Capacidade da aljava | Define quantas flechas/virotes cada aljava comporta. |
| Ativar rastreamento de acertos | Registra projeteis que acertaram para recuperacao posterior. |
| Ativar recuperacao | Habilita os testes de recuperacao de projeteis registrados. |
| Um teste por clique | Alterna entre recuperar um projetil ou resolver todos os pendentes por clique. |
| Recuperacao por tipo/qualidade | Usa alvos diferentes para munição comum, de qualidade e mistica. |
| Recuperacao unica | Define o alvo comum quando a separacao por qualidade estiver desligada. |
| Recuperacao comum | Define o alvo para munição comum. |
| Recuperacao de qualidade | Define o alvo para munição de qualidade. |
| Recuperacao mistica | Define o alvo para munição mistica/alquimica. |
| Exibir botao de recuperacao na HUD | Mostra o contador/botao perto da hotbar. |
| Exibir aljavas na HUD | Mostra aljavas equipadas/ativas e sua carga atual. |
| Exibir municoes especiais no chat | Envia a descricao da munição especial usada. |

### Sobrecarga e recipientes

| Opcao | Efeito |
| --- | --- |
| Ativar Sobrecarga | Ativa peso, limites, penalidade de Defesa e imobilizacao. |
| Ativar gerenciamento de recipientes | Ativa guardar, retirar, arrastar, expandir e proteger recipientes com conteudo. |

### Movimento

| Opcao | Efeito |
| --- | --- |
| Ativar regua de movimento | Ativa medicao e validacao de movimento do modulo. |
| Colorir regua por distancia | Colore uma acao, duas acoes e distancia bloqueada. |
| Exibir limites na etiqueta | Mostra distancia medida e limite atual. |
| Bloquear movimento acima do limite | Cancela movimentos acima do permitido durante combate. |
| Aplicar Fome ao movimento | Reduz o movimento de personagens famintos. |
| Aplicar Sobrecarga ao movimento | Aplica imobilizacao por excesso de carga. |
| Aplicar efeitos ao movimento | Respeita efeitos de manobras e flags de movimento. |
| Unidades de movimento | Alterna entre metros e pes. |
| Distancia de um movimento | Define 10 m ou 30 ft por padrao, conforme a unidade escolhida. |

### Combate

| Opcao | Efeito |
| --- | --- |
| Ativar manobras | Mostra e automatiza manobras na ficha. |
| Exibir opcao de rolagem privada | Permite enviar resultado e dados 3D somente aos Mestres em cada rolagem. |
| Ativar visual moderno do chat | Ativa a transformacao das mensagens de chat. |
| Estilo do chat moderno | Alterna entre `Ilustrado` e `Legacy`. |
| Ativar uso e envio de itens/habilidades no chat | Habilita uso manual de habilidades, poderes, rituais e itens sem acao ativa. |
| Ativar integracao com Automated Animations | Inclui os metadados consumidos pela integracao. |
| Exibir botao Limpar efeitos | Mostra o comando nas fichas com efeitos ativos. |
| Ativar integracao com Token Action HUD | Adiciona as manobras ao HUD quando disponivel. |

### Utilidades

| Opcao | Efeito |
| --- | --- |
| Ativar catalogo de rituais | Adiciona `Ver Rituais` ao menu da habilidade Ritualista. |
| Agrupar rituais em Ritualista | Transforma Ritualista em uma lista expansivel dos rituais conhecidos. |
| Ativar macros e tabelas de utilidade | Ativa versos, inspiracao, geradores e eventos de floresta. |
| Ativar Gerar Sombra | Exibe o controle Gerar Sombra nas fichas. |
| Ocultar geracao de Sombra | Esconde o comando sem desativar as outras utilidades. |
| Ocultar texto de Sombra | Mantem o comando, mas oculta seu texto visivel. |

---

## Pao de Viagem

O modulo reconhece **Pao de Viagem**, **Waybread** e nomes equivalentes.

Funciona assim:

1. O item pode existir em pilha.
2. Cada unidade possui uma quantidade de usos configuravel.
3. O display aparece como:

```text
4 (28/28)
```

Isso significa 4 unidades e 28 usos totais restantes.

Ao consumir:

- 1 uso e removido.
- Quando uma unidade inteira e consumida, a quantidade baixa automaticamente.
- O chat recebe um card informando quantos usos ainda restam.

---

## Aljavas e Municao

O fluxo de municao foi desenhado para separar:

- Flechas/virotes avulsos no inventario.
- Flechas/virotes carregados em aljava.
- Municao usada em ataques.
- Municao recuperavel depois de acertos.

### Aljava

- A aljava comporta ate **12 projeteis**.
- Flechas e virotes normalmente sao comprados em pilhas de 10.
- O jogador precisa recarregar a aljava antes de usar a municao em combate.
- Aljavas em estado **Equipado** ou **Ativo** aparecem no ataque e na HUD.
- Aljavas em **Outro** nao aparecem como disponiveis.

### Recarregar Aljava

Botao direito na aljava:

```text
Recarregar Aljava
```

O dialog permite escolher:

- Qual municao avulsa carregar.
- Quantidade a carregar.

O limite respeita:

- Capacidade restante da aljava.
- Quantidade disponivel no inventario.

### Descarregar Aljava

Botao direito na aljava:

```text
Descarregar Aljava
```

O dialog permite escolher a municao carregada e a quantidade a retirar. A municao
volta para o inventario como item avulso.

### Consumo automatico

Ao atacar com uma arma que usa flechas/virotes:

1. O dialog de ataque mostra a municao carregada nas aljavas disponiveis.
2. Ao rolar, o modulo consome 1 unidade da aljava.
3. Se o ataque acertar, a municao entra na fila de recuperacao.
4. A mensagem de ataque pode incluir a municao usada, por exemplo:

```text
Teste atacou Etterherd com Arco Longo usando Flecha Certeira e acertou.
```

---

## Recuperacao de Municao

A recuperacao usa um teste por projetil, mantendo o suspense de cada flecha ou
virote.

Quando ha projeteis recuperaveis:

- O botao aparece na HUD apenas se houver pelo menos 1 projetil pendente.
- Tambem existe opcao no menu de contexto da arma.
- Cada clique rola um teste individual.
- O modulo aguarda Dice So Nice quando o dado 3D esta ativo.

### Dificuldade do teste

| Tipo de projetil | Recupera com |
| --- | --- |
| Comum | `1d20 <= 10` |
| Com qualidade | `1d20 <= 15` |
| Mistico / alquimico | `1d20 <= 17` |

O chat informa:

```text
1d20 contra 17 ou menos
Teste tentou recuperar Flecha Certeira e obteve sucesso.
```

---

## Municoes especiais

O modulo reconhece municoes oficiais e nomes em PT-BR/EN sempre que possivel.

Exemplos:

- Flechas/Virotes - Regulares
- Flecha Certeira
- Flecha - Precisao
- Flecha - Cortador de Corda
- Flecha - Ponta Perfurante de Armadura
- Flecha - Flamejante
- Flecha - Laco
- Flecha - Sibilante
- Arpeu
- Cabeca de Martelo
- Cauda de Andorinha Sangrenta
- Virote Atordoante / Stunning Bolt

Municoes especiais podem alterar modificadores, enviar descricao ao chat ou
registrar efeitos conforme a regra cadastrada.

---

## Fome

A regra opcional de Fome adiciona um efeito de status proprio.

Enquanto o personagem esta com Fome:

- Nao se beneficia de cura natural.
- Testes sofrem segunda chance de falha quando a regra exige.
- Movimento fica reduzido pela metade.
- Durante descanso, o personagem faz teste de inanição.

### Teste de inanição

O teste e:

```text
1D20 Contra X em Vigoroso
```

Se falhar:

- O personagem perde 1 ponto temporario de Vigoroso.
- Se Vigoroso chegar a 0, o personagem morre por inanição.

### Recuperacao depois da Fome

Quando a Fome acaba:

- A penalidade de Vigoroso nao some automaticamente.
- O personagem recupera naturalmente 1 ponto por dia de descanso.
- Curas e poderes podem recuperar esses pontos como se fossem Vitalidade.

---

## Descanso

O botao **Descanso** aparece no cabecalho da ficha de personagem jogador quando
ativado.

O dialog permite definir:

- Dias de descanso.
- Cura por dia.

Durante o descanso:

- Vitalidade pode ser recuperada.
- Corrupcao temporaria pode ser zerada.
- Testes de inanição sao resolvidos se o personagem estiver com Fome.
- Cards ilustrados informam sucesso, falha ou morte por inanição.

---

## Sobrecarga

O modulo implementa a regra opcional de carga baseada em **Vigoroso**.

### Regra geral

- Capacidade normal: valor de Vigoroso.
- Com o dom Transportador: capacidade multiplicada por 1,5.
- Cada item acima da capacidade aplica penalidade em Defesa.
- Acima do dobro do Vigoroso, o personagem fica imobilizado.

### Estados dos itens

| Estado | Conta peso? |
| --- | --- |
| Equipado | Sim |
| Ativo | Sim |
| Outro | Nao |

Excecao importante: itens dentro de um recipiente contam conforme o estado do
recipiente. Se a mochila/baú estiver **Equipado** ou **Ativo**, os itens dentro
dela contam peso mesmo que estejam ocultos da lista principal.

### Pesos por item

O arquivo principal e:

```text
data/encumbrance-weights.json
```

Ele possui duas secoes:

```json
{
  "version": 2,
  "items": {
    "Pao de Viagem": 1,
    "Arco Longo": 1
  },
  "bundles": {
    "Flechas/Virotes - Regulares": {
      "bundleSize": 10,
      "slots": 1
    }
  }
}
```

`items` define peso item por item.  
`bundles` define grupos que pesam por pacote, como flechas, moedas e joias.

O sistema normaliza acentos e maiusculas/minusculas na comparacao, mas o nome
legivel no JSON deve ser mantido o mais proximo possivel dos livros e dos itens
do compendio.

---

## Recipientes

Recipientes permitem guardar itens em uma sublista expansiva dentro da propria
ficha.

### Como usar

Botao direito em um item:

```text
Guardar
```

Clique esquerdo em um recipiente:

```text
Abrir ou recolher
```

Dentro da sublista:

- **Retirar** devolve o item ao inventario principal.
- **Ver** abre a ficha do item.

### Regras de estado

Guardar e retirar so funciona se o item/recipiente estiver:

- Equipado
- Ativo

Se estiver em **Outro**, o modulo bloqueia a acao e mostra aviso.

### Recipientes reconhecidos

Exemplos reconhecidos:

- Mochila / Backpack
- Saco / Sack
- Sacola
- Alforje
- Bolsa / Belt pouch / Coin purse
- Cesta / Basket
- Jarro de barro / Clay pitcher
- Caixa decorada / Decorated box
- Baú pequeno / Small Chest
- Baú grande / Large Chest
- Barril / Barrel
- Snuff Box
- Equipamento de Acampar / Field equipment / Camping equipment

### Equipamento de Acampar

O item **Equipamento de Acampar** e tratado como recipiente especial. Quando ele
traz uma lista em sua descricao no formato **Contem:**, o modulo pode inicializar
os itens internos automaticamente.

Exemplo de conteudo esperado:

- Saco de Dormir
- Frigideira
- Lenha
- Pederneira e Isqueiro
- Corda
- Cantil

Depois de inicializado, esses itens aparecem dentro da sublista do recipiente.

---

## Movimento

A regua propria do modulo colore o movimento do token:

| Cor | Significado |
| --- | --- |
| Verde | Dentro de uma acao de movimento. |
| Amarelo | Movimento dobrado, usando movimento + acao de combate. |
| Vermelho | Acima do limite permitido. |

Por padrao:

- 1 movimento = 10 metros.
- Movimento dobrado = 20 metros.

Fome, sobrecarga e efeitos de manobra podem reduzir ou bloquear movimento.

Se **Drag Ruler** estiver ativo, o Tenebre desativa sua propria regua colorida
para nao disputar a mesma area do Foundry.

---

## Manobras

O modulo adiciona uma area de **Manobras** na ficha e pode integrar essas acoes
ao Token Action HUD.

Manobras atualmente automatizadas:

- Adiar a Iniciativa
- Agarrar
- Desarmar
- Encontrão
- Investida
- Mira Cuidadosa
- Nocaute
- Defesa Total
- Ofensiva Total
- Empurrão
- Veneno em Armas
- Tomar a Iniciativa

Quando possivel, o modulo:

- Rola o teste necessario.
- Aplica efeitos ativos.
- Remove efeitos expirados.
- Publica cards de chat no estilo configurado.

---

## Chat Moderno

O modulo possui dois estilos:

| Estilo | Descricao |
| --- | --- |
| Ilustrado | Cards visuais no estilo Symbaroum, com retratos, icones, resultado e texto claro. |
| Legacy | Usa o chat original do sistema Symbaroum. |

O estilo **Ilustrado** cobre:

- Ataques.
- Testes de atributo.
- Testes de defesa.
- Pedidos de resistencia.
- Habilidades.
- Poderes.
- Rituais.
- Manobras.
- Uso de itens.
- Pao de Viagem.
- Recarregar e recuperar municao.
- Descanso.
- Fome.
- Rolagem de morte.
- Aplicar resultados.
- Macros e mensagens de sistema.

### Pedidos de resistencia

Quando o sistema pede resistencia ao jogador, o card e mantido simples para nao
poluir o chat:

```text
Loba Faminta ataca usando Mordida
Crespo pode resistir ao ataque
[Rolar resistencia]
```

Depois que o jogador rola a resistencia, o card de ataque normal aparece logo
abaixo com o resultado.

### Dados 3D

Rolagens do modulo usam o helper de dados interno:

- Rola o dado.
- Aguarda Dice So Nice quando disponivel.
- So depois publica o resultado.

Isso evita que o chat mostre o resultado antes do dado terminar de rolar.

### Rolagem privada

Quando **Exibir opcao de rolagem privada** esta ativa, os dialogos de rolagem
mostram **Rolagem privada**. Ao marca-la, somente usuarios GM recebem o
resultado daquela rolagem.

- A escolha vale apenas para a rolagem atual.
- Dados 3D privados tambem sao enviados somente aos GMs.
- A proxima rolagem volta ao modo de chat configurado no Foundry.

---

## Envio de itens, habilidades e rituais ao chat

### Catalogo de Ritualista

Quando **Ativar catalogo de rituais** esta ligado, clicar com o botão direito na
habilidade **Ritualista** mostra **Ver Rituais**. A opção abre um catálogo com os
66 rituais encontrados no Livro Básico e no Guia Avançado do Jogador.

O catálogo:

- agrupa rituais por tradição;
- mostra nomes em PT-BR ou inglês conforme o idioma do Foundry;
- usa as imagens do conteúdo oficial instalado quando disponíveis;
- marca rituais já presentes na ficha;
- identifica como **Restrito** o conteúdo exclusivo de profissões ou
  especializações;
- abre a ficha oficial do ritual ao clicar em sua linha, permitindo consultar
  a descrição completa no visual original do sistema.

Quando **Agrupar rituais em Ritualista** está ativo, os rituais conhecidos deixam
de ocupar linhas soltas. Um clique esquerdo em **Ritualista** expande ou recolhe
a sublista; cada ritual continua permitindo usar, ver/editar e excluir pelo
fluxo normal da ficha.

Ritualista permite aprender rituais de qualquer tradição, mas o personagem
precisa ter acesso ao ensinamento. A progressão é 1 ritual no nível Novato, mais
2 no Adepto e mais 3 no Mestre, totalizando 6. Rituais marcados como restritos
não são escolhas livres da habilidade comum.

Quando a opcao **Ativar envio de itens/habilidades para animacoes** esta ligada,
itens e poderes que normalmente nao gerariam card podem ser enviados ao chat.

Isso ajuda o **Automated Animations** a detectar:

- Habilidades passivas usadas manualmente.
- Rituais.
- Poderes mistico.
- Itens especiais.
- Acoes narrativas que precisam disparar animacoes.

O item enviado carrega nome, imagem, ator e dados suficientes para o modulo de
animacao reconhecer a acao.

---

## Macros e utilidades

O modulo inclui utilidades inspiradas no pacote Bithir:

- Gerador de nomes.
- Geradores de personagens/criaturas.
- Eventos de floresta.
- Versos de Aroaleta.
- Rolagem de inspiracao.
- Gerar Sombra.
- Macros de experiencia, rerrolagem e corrupcao temporaria.

Quando o modulo oficial **Bithir's Symbaroum Mods** esta ativo, o Tenebre desliga
as utilidades internas equivalentes para evitar disputa de namespace.

---

## Compatibilidade e blindagem

O modulo possui uma camada central de compatibilidade em:

```text
scripts/compatibility.mjs
```

Ela detecta modulos que mexem nas mesmas areas e decide quando o Tenebre deve
ceder para evitar travamentos.

Exemplos:

- Com **Drag Ruler** ativo, a regua propria do Tenebre e desativada.
- Com **Bithir's Symbaroum Mods** ativo, utilidades Bithir internas sao cedidas.
- Com dois tokenizadores ativos, o Tenebre apenas avisa e nao interfere.
- Modulos com faixa de compatibilidade externa antiga sao reportados, mas nao
  alterados.

### Aviso de compatibilidade

O aviso aparece somente para usuarios GM.

O Mestre pode marcar:

```text
Nao mostrar novamente estes avisos ja listados
```

Se novos conflitos aparecerem depois, o aviso volta a abrir apenas com os novos
itens ainda nao reconhecidos.

### Diagnostico

No console do Foundry:

```js
game.tenebreResources
```

Servicos principais expostos:

- `game.tenebreResources.ammo`
- `game.tenebreResources.containers`
- `game.tenebreResources.encumbrance`
- `game.tenebreResources.hunger`
- `game.tenebreResources.maneuvers`
- `game.tenebreResources.movement`
- `game.tenebreResources.rations`
- `game.tenebreResources.rest`
- `game.tenebreResources.compatibility`

---

## Arquivos de dados editaveis

### Pesos e pacotes

```text
data/encumbrance-weights.json
```

Controla:

- Peso individual por item.
- Pesos por pacote, como flechas a cada 10 ou moedas a cada 50.

### Frases do chat ilustrado

```text
data/modern-chat-flavor.json
```

Controla frases narrativas usadas nos cards:

- Ataques.
- Habilidades.
- Atributos.
- Rituais.
- Poderes.
- Itens.
- Fome.
- Descanso.
- Sistema.

Tambem aceita overrides por nome de item/habilidade.

### Geradores

```text
data/ambrian-generator.json
data/barbarian-generator.json
data/abomination-generator.json
data/forest-events-pt-BR.json
data/aroaleta-verses.json
```

Usados pelas macros e utilidades.

---

## Estrutura do projeto

```text
symbaroum-ind-resources/
├─ assets/
├─ data/
├─ languages/
├─ packs/
├─ scripts/
├─ styles/
├─ templates/
├─ module.json
└─ README.md
```

Arquivos principais:

| Arquivo | Funcao |
| --- | --- |
| `scripts/init.mjs` | Entrada principal do modulo. |
| `scripts/settings.mjs` | Registro e dialog de configuracoes. |
| `scripts/modern-chat.mjs` | Conversao e layout dos cards modernos. |
| `scripts/ammo.mjs` | Aljavas, consumo, descarga, recarga e recuperacao. |
| `scripts/rations.mjs` | Pao de Viagem. |
| `scripts/hunger.mjs` | Efeito Fome e recuperacao de Vigoroso. |
| `scripts/rest.mjs` | Descanso e testes de inanição. |
| `scripts/encumbrance.mjs` | Calculo de sobrecarga e defesa. |
| `scripts/encumbrance-db.mjs` | Banco de pesos e bundles. |
| `scripts/containers.mjs` | Recipientes e itens guardados. |
| `scripts/maneuvers.mjs` | Manobras de combate. |
| `scripts/movement-ruler.mjs` | Regua de movimento. |
| `scripts/compatibility.mjs` | Blindagem contra conflitos com outros modulos. |
| `scripts/chat-item-use.mjs` | Envio de itens/habilidades ao chat. |
| `scripts/bithir-macros.mjs` | Utilidades e macros integradas. |

---

## Empacotamento para Release

O zip de release deve conter apenas o necessario para o Foundry carregar o
modulo.

Inclua:

- `module.json`
- `README.md`
- `assets/`
- `data/`
- `languages/`
- `packs/`
- `scripts/`
- `styles/`
- `templates/`

Nao inclua arquivos de desenvolvimento, controle de versao, zips antigos, logs,
locks de compendio do Foundry, caches, pastas temporarias ou documentacao local
de trabalho. O release deve conter somente o que o Foundry precisa para carregar
o modulo.

O zip publicado no GitHub Releases deve se chamar:

```text
symbaroum-ind-resources.zip
```

E precisa ter `module.json` na raiz do zip.

---

## Checklist de teste rapido

Depois de instalar ou atualizar:

1. Reinicie o Foundry ou pressione `F5`.
2. Confirme que `socketlib` esta ativo.
3. Abra as configuracoes do Tenebre Resources.
4. Teste Pao de Viagem:
   - Empilhamento.
   - Consumo.
   - Card de chat.
5. Teste aljava:
   - Recarregar.
   - Descarregar.
   - Atacar com arco.
   - Confirmar consumo.
   - Recuperar projetil.
6. Teste Sobrecarga:
   - Item em Equipado/Ativo conta peso.
   - Item em Outro nao conta.
   - Item dentro de mochila conta se a mochila estiver Equipado/Ativo.
7. Teste Recipiente:
   - Guardar quantidade parcial.
   - Abrir sublista.
   - Retirar quantidade parcial.
8. Teste Fome:
   - Aplicar efeito.
   - Descansar.
   - Confirmar teste de inanição.
   - Remover Fome.
9. Teste chat:
   - Ataque.
   - Defesa.
   - Resistencia.
   - Habilidade.
   - Ritual.
   - Manobra.
   - Rolagem de morte.
10. Abra o console e confirme que nao ha erros novos do Tenebre.

---

## Desenvolvimento

Durante desenvolvimento, altere os arquivos no projeto:

```text
C:\Projetos\symbaroum-ind-resources
```

Para testar no Foundry, copie a versao atual para:

```text
C:\Users\heito\Documents\FoundryVTT\Data\modules\symbaroum-ind-resources
```

Se o Foundry estiver aberto, alguns arquivos podem ficar bloqueados. Feche o
Foundry antes de sobrescrever arquivos em `Data/modules` quando necessario.

---

## Licenca e creditos

Este modulo foi criado para uso com o sistema **Symbaroum** no **Foundry VTT**.

Autores declarados no `module.json`:

- kaciquehn
- Crespo7777

Symbaroum e suas artes oficiais pertencem aos seus respectivos detentores. Este
modulo apenas adiciona automacoes e recursos de interface para uso em mesas no
Foundry VTT.
