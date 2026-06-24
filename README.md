# ⚔️ Symbaroum Ind Resources — Foundry VTT

**Symbaroum Ind Resources** é um módulo desenvolvido para o sistema de RPG **Symbaroum** no **Foundry VTT v13**. O objetivo deste módulo é automatizar o controle de recursos importantes de sobrevivência e combate de forma nativa e integrada à interface do sistema Symbaroum.

---

## ⚔️ Funcionalidades Principais

### 1. 🍞 Pão de Viagem (Travel Bread / Waybread)
* **Consumo na Ficha:** Clique com o **botão direito** sobre o item de Pão de Viagem (ou *Waybread*) no inventário do personagem e selecione **"Consumir Pão de Viagem"** para gastar 1 uso.
* **Quantidade e Usos:** A quantidade no inventário exibe quantos usos restam no formato `Unidades (UsosRestantes/MaxUsos)` (ex: `1 (7/7)`).
* **Notificação no Chat:** Consumir um pão de viagem publica uma mensagem detalhada no Chat contendo o retrato do personagem e as informações de uso do pão.
* **Ícone de Atalho na Hotbar:** Para o jogador ativo, um ícone de pão de viagem aparece automaticamente no canto esquerdo da Hotbar. Clicar nele consome um uso sem precisar abrir a ficha.
* **Cálculo Cumulativo:** O controle de usos calcula o valor total acumulado de todos os pães de viagem que o jogador possui no inventário. A quantidade de usos por pão é configurável nas opções do módulo.

### 2. 🎒 Sistema de Aljava e Recarga de Munições
* **Ação de Recarga:**
  * O jogador não dispara projéteis avulsos diretamente da mochila. É necessário equipar e recarregar uma aljava (limite de 12 flechas/virotes no total).
  * Clique com o **botão direito** em um item de aljava no inventário e selecione **"Recarregar Aljava"**.
  * Abre um diálogo que permite escolher qual munição avulsa do inventário carregar e a quantidade (limitado dinamicamente pela capacidade restante da aljava e quantidade disponível no inventário).
  * Uma mensagem detalhada é enviada ao chat com o retrato do personagem, ícone e quantidade da munição carregada, e o status da aljava de destino.
* **Exibição na Ficha:** O display das aljavas no inventário é atualizado dinamicamente no formato `Quantidade (Carregadas/12)` (ex: `1 (10/12)`).
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
* Ao clicar em "Recuperar Munição" após o combate, o sistema resolve **um projétil por clique**. Se 7 ataques acertaram, há 7 testes pendentes; cada clique rola 1d20 para uma flecha ou virote e deixa os demais para os próximos cliques:
  * **Projétil Comum (sem qualidades):** Recupera se rolar **10 ou menos** (`d20 <= 10`).
  * **Projétil com Qualidade (Precisa, Flamejante, etc.):** Recupera se rolar **15 ou menos** (`d20 <= 15`).
  * **Projétil Místico/Alquímico (Certeira, Atordoante):** Recupera se rolar **17 ou menos** (`d20 <= 17`).
* Exibe no chat o d20 daquele projétil, informa se foi recuperado ou quebrou e mostra quantos testes ainda faltam, mantendo o suspense a cada clique.

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
* **Badges Visuais:** Adiciona uma pequena insígnia (badge) na linha de cada item exibindo seu peso acumulado e destacando itens pesados (Maciços) ou de peso zero.
* **Auto-atribuição Global:** O sistema possui um banco de dados interno que analisa os nomes dos itens (em inglês e português) assim que entram no inventário. O peso é atribuído automaticamente e silenciosamente a todos os itens.
  * **Peso Padrão:** 1 espaço.
  * **Peso Zero:** Itens no estado **Ativo** ou **Outro** não contam peso.
  * **Estado dos Itens:** Ativo não conta peso; Equipado conta peso; Outro não conta peso.
  * **Munições:** Flechas e virotes contam como 1 item transportado para cada 10 unidades.
  * **Itens Pequenos:** Moedas, pingentes e joias contam como 1 item transportado para cada 50 peças.
  * **Recipientes Volumosos:** Barris, baús e caixas contam como 1 item próprio, somado ao conteúdo carregado separadamente.
  * **Peso Duplo (2 espaços):** Armas com a qualidade Maciça (Massive).
  * **Armaduras Equipadas:** Armaduras em estado Equipado contam pelo valor de Obstrutiva.
* **Edição Manual Flexível:** Armas, armaduras e equipamentos exibem o campo **Peso** na descrição do item, abaixo de **Número**, permitindo ajuste manual quando necessário.
* **Mecânicas de Capacidade:** A capacidade básica é o valor de Vigoroso. O dom **Transportador** (Porter) multiplica a capacidade por 1.5. A cada espaço acima do limite, o sistema avisa o jogador e indica um redutor na **Defesa** equivalente ao sobrepeso. Ultrapassar o dobro do Vigoroso imobiliza o personagem.

### 7. 🛏️ Descanso Avançado (botão "Descanso")
* Adiciona um botão dedicado **Descanso** na barra de cabeçalho da ficha do PJ.
* Permite configurar a quantidade de **Dias de descanso** e a taxa de **Cura por dia**.
* Zera os testes de morte falhos e remove a **Corrupção Temporária** (caso o personagem sobreviva aos testes de inanição).

---

## 💾 Instalação

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
4. Configure os controles de Pão de Viagem, consumo de munição, rastreamento de acertos, recuperação de munição, Fome, descanso e Sobrecarga.

### Atalhos de Teclado (Keybindings)
* **Abrir Diálogo de Descanso** (para o PJ controlado — padrão: `Ctrl + Shift + R`).
