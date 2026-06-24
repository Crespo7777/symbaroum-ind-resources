# ⚔️ Symbaroum Ind Resources — Foundry VTT

**Symbaroum Ind Resources** é um módulo desenvolvido para o sistema de RPG **Symbaroum** no **Foundry VTT (v12+)**. O objetivo deste módulo é automatizar o controle de recursos importantes de sobrevivência e combate de forma nativa e integrada à interface do sistema Symbaroum, sem poluir a ficha dos personagens.

---

## ⚔️ Funcionalidades Principais

### 1. 🍞 Pão de Viagem (Travel Bread / Waybread)
* **Consumo na Ficha:** Clique com o **botão direito** sobre o item de Pão de Viagem (ou *Waybread*) no inventário do personagem e selecione **"Consumir Pão de Viagem"** para gastar 1 uso.
* **Quantidade e Usos:** A quantidade no inventário exibe quantos usos restam no formato `Unidades (UsosRestantes/MaxUsos)` (ex: `1 (7/7)`).
* **Notificação no Chat:** Consumir um pão de viagem publica uma mensagem detalhada no Chat contendo o retrato do personagem e as informações de uso do pão.
* **Ícone de Atalho na Hotbar:** Para o jogador ativo, um ícone de pão de viagem aparece automaticamente no canto esquerdo da Hotbar. Clicar nele consome um uso sem precisar abrir a ficha.
* **Cálculo Cumulativo:** O controle de usos calcula perfeitamente o valor total acumulado de todos os pães de viagem que o jogador possui no inventário (onde cada pão equivale a 7 usos).

### 2. 🎒 Sistema de Aljava e Recarga de Munições
* **Ação de Recarga:**
  * O jogador não dispara projéteis avulsos diretamente da mochila. É necessário equipar e recarregar uma aljava ou estojo de virotes (limite de 12 flechas/virotes no total).
  * Clique com o **botão direito** em um item de aljava/estojo no inventário e selecione **"Recarregar Aljava/Estojo"**.
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
* Ao clicar em "Recuperar Munição" após o combate, o sistema faz uma rolagem de d20 para cada flecha ou virote disparado para saber se ele quebrou:
  * **Projétil Comum (sem qualidades):** Recupera se rolar **10 ou menos** (`d20 <= 10`).
  * **Projétil com Qualidade (Precisa, Flamejante, etc.):** Recupera se rolar **15 ou menos** (`d20 <= 15`).
  * **Projétil Místico/Alquímico (Certeira, Atordoante):** Recupera se rolar **17 ou menos** (`d20 <= 17`).
* Exibe no chat os dados individuais de cada d20 com destaque colorido (**Verde** para sucesso, **Vermelho e Riscado** para falha/quebra), trazendo suspense e clareza para a mesa.

### 5. 🍲 Regra Opcional de Fome (Hunger)
* **Status Effect HUD:** Adiciona o status **Fome** (ícone de prato de comida) na paleta de efeitos de status do Token no HUD do Foundry.
* **Sem Cura Natural:** Personagens sob o efeito de Fome não recuperam vitalidade ao descansar (cura forçada a 0).
* **Desvantagem Constante:** Qualquer rolagem de atributo ou teste feito sob o efeito de Fome é executado com desvantagem (rola 2d20 e escolhe o pior resultado/maior d20).
* **Testes Diários de Inanição:** Durante o descanso de um personagem com Fome, para cada dia passado, o sistema rola automaticamente um teste de **Vigoroso** (Strong) com desvantagem. Se falhar, o atributo base Vigoroso diminui em **-1**. Chegar a 0 significa morte por inanição.

### 6. 🛏️ Descanso Avançado (botão "Descanso")
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
4. Configure opções como rastreamento de acertos, recuperação automática e valores padrão de descanso.

### Atalhos de Teclado (Keybindings)
* **Abrir Diálogo de Descanso** (para o PJ controlado — padrão: `Ctrl + Shift + R`).
