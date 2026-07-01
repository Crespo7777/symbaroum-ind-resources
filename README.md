# ⚔️ Symbaroum Ind Resources — Foundry VTT

**Symbaroum Ind Resources** é um módulo desenvolvido para o sistema de RPG **Symbaroum** no **Foundry VTT v13**. O objetivo deste módulo é automatizar o controle de recursos importantes de sobrevivência e combate de forma nativa e integrada à interface do sistema Symbaroum.

---

## ⚔️ Funcionalidades Principais

### 1. 🍞 Pão de Viagem (Travel Bread / Waybread)
* **Consumo na Ficha:** Clique com o **botão direito** sobre o item de Pão de Viagem (ou *Waybread*) no inventário do personagem e selecione **"Consumir Pão de Viagem"** para gastar 1 uso.
* **Quantidade e Usos:** A quantidade no inventário exibe quantos usos restam no formato `Unidades (UsosRestantes/MaxUsos)` (ex: `1 (7/7)`).
* **Notificação no Chat:** Consumir um pão de viagem publica uma mensagem detalhada no Chat contendo o retrato do personagem e as informações de uso do pão.
* **Cálculo Cumulativo:** O controle de usos calcula o valor total acumulado de todos os pães de viagem que o jogador possui no inventário. A quantidade de usos por pão é configurável nas opções do módulo.

### 2. 🎒 Sistema de Aljava e Recarga de Munições
* **Ação de Recarga:**
  * O jogador não dispara projéteis avulsos diretamente da mochila. É necessário equipar e recarregar uma aljava (limite de 12 flechas/virotes no total).
  * Clique com o **botão direito** em um item de aljava no inventário e selecione **"Recarregar Aljava"**.
  * Abre um diálogo que permite escolher qual munição avulsa do inventário carregar e a quantidade (limitado dinamicamente pela capacidade restante da aljava e quantidade disponível no inventário).
  * Uma mensagem detalhada é enviada ao chat com o retrato do personagem, ícone e quantidade da munição carregada, e o status da aljava de destino.
* **Exibição na Ficha:** O display das aljavas no inventário é atualizado dinamicamente no formato `Quantidade (Carregadas/12)` (ex: `1 (10/12)`).
* **Indicadores no Rodapé:** A interface exibe um indicador de projéteis recuperáveis e as aljavas em **Equipado** ou **Ativo** com a carga atual (`Carregadas/12`) nos espaços livres próximos à hotbar/chat. Aljavas em **Outro** não aparecem e a HUD informa quando não há aljava equipada/ativa.
* **Dropdown no Modal de Ataque:** Ao realizar um ataque com arma à distância, o dropdown de munições listará apenas os tipos de projéteis específicos que estão *carregados* nas aljavas equipadas do personagem (ex: `Aljava: Flecha - Precisão (2/12)`).

### 3. 🏹 Projéteis Especiais e Qualidades Alquímicas
O módulo oferece suporte mecânico completo para todos os projéteis especiais descritos no Livro Básico e Guia Avançado do Jogador. Ao selecionar e disparar do dropdown:
* **Flecha de Precisão:** Injeta +1 no teste de ataque (qualidade *Precisa*).
* **Ponta Perfurante de Armadura / Bodkin:** Injeta +1 no modificador de dano (qualidade *Impacto Profundo*).
* **Flecha Flamejante:** Injeta a condição de Queimando (DoT de 1d4 de dano persistente).
* **Flecha de Laço:** Envia um card no chat com testes interativos de fuga de `[Vigoroso - Dano]` e dano de remoção de `1d4`.
* **Outros Projéteis Oficiais:** Suporte narrativo e mecânico integrado para *Flecha Sibilante, Arpéu, Cabeça de Martelo, Cauda de Andorinha, Cortador de Corda, Flecha Certeira (Alquímica)* e *Raio Atordoante*.

### 4. 🎲 Recuperação Oficial por Projétil (Individual d20)
O sistema antigo de porcentagem estática foi substituído pela regra oficial de recuperação individual por d20:
* Ao clicar em **"Recuperar Munição"** após o combate, o sistema resolve todos os projéteis pendentes em uma fila automática. Se 7 ataques acertaram, há 7 testes pendentes; o jogador clica uma vez e o módulo rola 1d20 para cada projétil, um depois do outro, aguardando o resultado de cada rolagem antes de iniciar a próxima:
  * **Projétil Comum (sem qualidades):** Recupera se rolar **10 ou menos** (`d20 <= 10`).
  * **Projétil com Qualidade (Precisa, Flamejante, etc.):** Recupera se rolar **15 ou menos** (`d20 <= 15`).
  * **Projétil Místico/Alquímico (Certeira, Atordoante):** Recupera se rolar **17 ou menos** (`d20 <= 17`).
* O mesmo fluxo sequencial é usado tanto pelo botão de recuperação próximo à hotbar quanto pela ação de botão direito na arma.
* Exibe no chat o d20 de cada projétil, informa se foi recuperado ou quebrou e mostra a evolução da fila até todos os testes terminarem.
* Todo o sistema de aljavas, munição carregada, consumo de munição e recuperação automática é aplicado apenas a fichas de **Jogador**. NPCs, monstros e outras fichas continuam usando o fluxo normal do sistema.

### 5. 🍲 Regra Opcional de Fome (Hunger)
* **Status Effect HUD:** Adiciona o status **Fome** (ícone monocromático próprio) na paleta de efeitos de status do Token no HUD do Foundry.
* **Aviso no Chat:** Quando o efeito Fome é aplicado, o chat recebe uma notificação com imagem e nome do personagem afetado.
* **Sem Cura Natural:** Personagens sob o efeito de Fome não recuperam vitalidade ao descansar (cura forçada a 0).
* **Desvantagem Constante:** Qualquer rolagem de atributo ou teste feito sob o efeito de Fome é executado com desvantagem (rola 2d20 e escolhe o pior resultado/maior d20).
* **Testes Diários de Inanição:** Durante o descanso de um personagem com Fome, para cada dia passado, o sistema rola automaticamente um teste de **Vigoroso** (Strong) com desvantagem. Se falhar, o modificador temporário de Vigoroso recebe **-1**. Chegar a Vigoroso total 0 marca o personagem como morto, zera a Vitalidade e registra a morte por inanição no chat.
* **Recuperação de Vigoroso:** Remover Fome representa o personagem voltando a se alimentar, mas não apaga imediatamente o dano de inanição. Depois que a Fome acaba, o botão **Descanso** recupera naturalmente 1 ponto de Vigoroso perdido por dia. Curas herbais e poderes podem recuperar essa penalidade pela API `game.tenebreResources.hunger.recoverStrongPenalty(actor, amount, { source })`, como se fossem pontos de Vitalidade.

### 6. ⚖️ Sistema de Sobrecarga Opcional (Encumbrance)
* **Regra do Guia Avançado do Jogador:** Implementa a regra opcional de sobrecarga baseada no atributo **Vigoroso** (Strong).
* **Painel Dinâmico na Ficha:** Injeta um painel com barra de progresso próximo ao cabeçalho "Equipamento", mostrando a carga atual, capacidade máxima e penalidades defensivas ativas.
* **Auto-atribuição Global:** O sistema usa `data/encumbrance-weights.json` como banco de pesos por nome de item. O arquivo possui a seção `items`, no formato `"Pão de Viagem": 1`, e a seção `bundles` para pilhas como flechas/virotes. A comparação ignora maiúsculas/minúsculas e acentos para evitar duplicação desnecessária.
  * **Recarga em tempo real:** O arquivo instalado no módulo é recarregado automaticamente em até 1 segundo enquanto o Foundry está aberto, usando `fetch` sem cache. Alterações feitas apenas na pasta do projeto precisam ser copiadas para `Data/modules` para entrarem no Foundry.
  * **Peso Padrão:** 1 espaço quando o item não existir no JSON e não tiver regra específica.
  * **Estado dos Itens:** Itens em estado **Equipado** ou **Ativo** contam para sobrecarga. Itens em **Outro** não contam peso.
  * **Munições:** Flechas e virotes contam como 1 item transportado para cada 10 unidades.
  * **Itens Pequenos:** Moedas, pingentes e joias contam como 1 item transportado para cada 50 peças.
  * **Recipientes Volumosos:** Barris, baús e caixas contam como 1 item próprio, somado ao conteúdo carregado separadamente.
  * **Peso Duplo (2 espaços):** Armas pesadas, de duas mãos ou com a qualidade Maciça (Massive).
  * **Armaduras Equipadas:** Armaduras em estado **Equipado** contam pela categoria: leve 2, média 3, pesada 4.
* **Edição Manual Flexível:** Armas, armaduras e equipamentos exibem o campo **Peso** na descrição do item, abaixo de **Número**, permitindo ajuste manual quando necessário.
* **Mecânicas de Capacidade:** A capacidade básica é o valor de Vigoroso. O dom **Transportador** (Porter) multiplica a capacidade por 1.5. A cada espaço acima do limite, o sistema avisa o jogador e indica um redutor na **Defesa** equivalente ao sobrepeso. Ultrapassar o dobro do Vigoroso imobiliza o personagem.

### 7. 📏 Régua de Movimento Symbaroum
* **Régua própria:** Colore a régua nativa de movimento do token usando as distâncias de Symbaroum.
* **Cores de alcance:** Verde indica movimento dentro da Ação de Movimento padrão (`10 m`), amarelo indica uso da Ação de Movimento + Ação de Combate como movimento adicional (`20 m`) e vermelho indica deslocamento acima do limite atual.
* **Interação com efeitos:** Fome reduz o deslocamento pela metade. Sobrecarga acima do máximo imobiliza. Manobras como Agarrar, Derrubado, Nocauteado e Mira Cuidadosa ajustam ou bloqueiam o movimento automaticamente.
* **Validação em combate:** Durante combate ativo, movimentos acima do limite calculado são bloqueados, exceto deslocamentos/teleportes do próprio Foundry.
* **API de diagnóstico:** `game.tenebreResources.movement.getMovementSummary(actor)` mostra o limite atual, multiplicadores e motivos aplicados.

### 8. 🎒 Recipientes e Itens Guardados (Containers)
* **Recipientes Detectados:** Mochilas, sacos, sacolas, bolsas, alforjes, cestos, jarros, baús, caixas e barris são reconhecidos como recipientes.
* **Guardar Item:** Clique com o **botão direito** em um item e selecione **Guardar**. O sistema permite escolher o recipiente de destino e, quando o item possuir pilha, a quantidade a guardar.
* **Estado Necessário:** Só é possível guardar itens e retirar itens de recipientes quando o item/recipiente estiver em **Equipado** ou **Ativo**. Itens ou recipientes em **Outro** bloqueiam a ação e exibem aviso.
* **Abrir Recipiente:** Clique com o **botão direito** no recipiente e selecione **Abrir** para expandir ou recolher uma sublista logo abaixo dele na própria ficha.
* **Ações Dentro do Recipiente:** A sublista do recipiente permite **Retirar** ou **Ver** cada item guardado.
  * **Retirar:** permite escolher a quantidade quando o item guardado possui pilha.
  * **Ver:** abre a ficha do item.
* **Uso de Itens Guardados:** Para usar um item, primeiro retire-o do recipiente para o inventário principal.
* **Peso e Sobrecarga:** Itens guardados ficam ocultos da lista principal da ficha, mas continuam contando para sobrecarga se o recipiente estiver em **Equipado** ou **Ativo**. Recipientes leves não contam peso próprio; recipientes volumosos contam peso próprio e também somam o conteúdo.
* **Pilhas Parciais:** Se guardar ou retirar apenas parte de uma pilha, o sistema divide ou junta automaticamente com uma pilha visível igual quando possível.
* **Fase Atual:** Esta é a fase 1 da função de containers. O fluxo usa menus de botão direito e sublista expansível na ficha. Drag-and-drop direto para dentro de recipientes fica para uma fase posterior.

### 9. 🛏️ Descanso Avançado (botão "Descanso")
* Adiciona um botão dedicado **Descanso** na barra de cabeçalho da ficha do PJ.
* Permite configurar a quantidade de **Dias de descanso** e a taxa de **Cura por dia**.
* Zera os testes de morte falhos e remove a **Corrupção Temporária** (caso o personagem sobreviva aos testes de inanição).

### 10. ⚔️ Manobras de Combate
* **Seção nativa na ficha:** Adiciona uma linha de **Manobras** abaixo da seção de armas, seguindo o visual da ficha de Symbaroum.
* **Seleção e rolagem:** O jogador escolhe uma manobra em uma lista e clica em **Rolar**. A seleção permanece na última manobra usada.
* **Manobras automatizadas:** Inclui Adiar a Iniciativa, Agarrar, Desarmar, Encontrão, Investida, Mira Cuidadosa, Nocaute, Defesa Total, Ofensiva Total, Empurrão, Veneno em Armas e Tomar a Iniciativa.
* **Aplicação de efeitos:** Efeitos positivos e negativos são aplicados automaticamente no ator correto quando a regra permite. Efeitos com duração de turno ou combate são removidos automaticamente quando expiram.
* **Limpeza de efeitos:** O botão **Limpar efeitos** remove efeitos ativos da ficha, incluindo efeitos de manobra e Fome.
* **Restrição de tipo de ficha:** A automação de manobras está disponível apenas para fichas de **Jogador**.

### 11. 🧩 Compatibilidade com Token Action HUD Symbaroum
* Integra automaticamente com **Token Action HUD Core** e **Token Action HUD Symbaroum RPG** quando esses módulos estão ativos.
* Adiciona um grupo **Manobras** no Token Action HUD para fichas de Jogador, usando os mesmos cálculos, alvos, prompts e efeitos da seção de manobras da ficha.
* Não altera os arquivos do Token Action HUD; a integração usa hooks oficiais do Core.
* Monstros e NPCs não recebem ações de manobra no HUD.

---

## 💾 Instalação

### Dependências
* **Obrigatória:** `socketlib` (declarado no `module.json`).
* **Opcional:** `token-action-hud-core` + `token-action-hud-symbaroum`, caso o grupo queira rolar ações pelo Token Action HUD.

Copie o link abaixo e cole no campo **Manifest URL** dentro da aba *Add-on Modules* do Foundry VTT:

```text
https://raw.githubusercontent.com/Crespo7777/symbaroum-ind-resources/main/module.json
```

---

## ⚙️ Configurações e Atalhos

### Configurações de Sobrevivência e Automáticas
1. No menu lateral direito do Foundry VTT, vá na aba **Configurações de Jogo** (ícone de engrenagem).
2. Clique em **Configurar Ajustes** (Configure Settings).
3. Na aba **Ajustes do Sistema** (System Settings), clique em **Symbaroum Ind Resources**.
4. Configure os controles de Pão de Viagem, consumo de munição, rastreamento de acertos, recuperação de munição, Fome, descanso, Sobrecarga e demais automações do módulo.

### Atalhos de Teclado (Keybindings)
* **Abrir Diálogo de Descanso** (para o PJ controlado — padrão: `Ctrl + Shift + R`).
