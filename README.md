# ⚔️ Symbaroum Ind Resources — Foundry VTT

**Symbaroum Ind Resources** é um módulo desenvolvido para o sistema de RPG **Symbaroum** no **Foundry VTT (v12+)**. O objetivo deste módulo é automatizar o controle de recursos importantes de sobrevivência e combate de forma nativa e integrada à interface do sistema Symbaroum, sem poluir a ficha dos personagens.

---

## ⚔️ Funcionalidades Principais

### 1. 🍞 Pão de Viagem (Travel Bread / Waybread)
* **Consumo na Ficha:** Clique com o **botão direito** sobre o item de Pão de Viagem (ou *Waybread*) no inventário do personagem e selecione **"Consumir Pão de Viagem"** para gastar 1 uso.
* **Quantidade e Usos:** A quantidade no inventário exibe quantos usos restam no formato `Unidades (UsosRestantes/MaxUsos)` (ex: `1 (7/7)`).
* **Notificação no Chat:** Consumir um pão de viagem publica uma mensagem detalhada no Chat contendo o retrato do personagem à esquerda e as informações de uso do pão organizadas à direita.
* **Ícone de Atalho na Hotbar:** Para o jogador ativo, um ícone de pão de viagem aparece automaticamente no canto esquerdo da Hotbar (barra de macros). Clicar nele consome um uso sem precisar abrir a ficha.
* **Cálculo Cumulativo:** O controle de usos calcula perfeitamente o valor total acumulado de todos os pães de viagem que o jogador possui no inventário (onde cada pão equivale a 7 usos. Ex: 1 pão = 7 usos, 2 pães = 14 usos).

### 2. 🛏️ Descanso Avançado (botão "Descanso")
* **Integração Nativa:** Adiciona um botão dedicado **Descanso** (cama) na barra de cabeçalho da ficha do PJ. O botão nativo **Recuperar** (coração vermelho) permanece intocado no padrão do Symbaroum.
* **Opções de Descanso:** Abre uma tela onde é possível configurar a quantidade de **Dias de descanso** e a taxa de **Cura por dia** (que vem por padrão baseada nas configurações do módulo).
* **Efeitos do Descanso:**
  * Restaura Vitalidade baseado em `Dias x Cura por dia`.
  * Zera os testes de morte falhos (`nbrOfFailedDeathRoll`).
  * Zera toda a **Corrupção Temporária** do personagem caso descanse 1 dia ou mais.
  * Publica um resumo do descanso formatado diretamente no Chat.

### 3. 🏹 Seleção de Munição e Modificadores Alquímicos
* **Dropdown no Modal NATIVO:** Ao atacar com uma arma à distância, a antiga janela preta foi removida. Em vez disso, um dropdown com as munições compatíveis disponíveis no inventário aparece diretamente dentro do modal de ataque oficial do Foundry/Symbaroum, logo abaixo de **"Outro mod. de dano"**.
* **Unificação de Munição:** Flechas e virotes foram unificados no tipo mecânico `"ammo"`. O sistema consome munições soltas antes de gastar uses de aljavas e não exige mais diferenciar tipos de munição nas fichas.
* **Efeitos de Munições Especiais (Revisados de acordo com o Livro Básico e Livro Avançado):** Ao escolher e disparar uma munição especial no dropdown, os seus efeitos e qualidades são aplicados automaticamente na rolagem:
  * **Munição de Precisão:** Injeta +1 de bônus no teste de ataque (qualidade *Precisa*).
  * **Munição Perfurante / Bodkin:** Injeta +1 no modificador de dano (qualidade *Impacto Profundo*).
  * **Munição Flamejante:** Injeta a condição de Queimando (DoT de 1d4 de dano persistente).
  * **Munição de Laço (Ensnaring):** Envia um card no chat com botões de rolagens interativas para o teste de fuga de `[Vigoroso - Dano]` e o dano de remoção de `1d4`.
  * **Raio Atordoante (Stun):** Envia um card de chat com rolagem interativa para o teste de queda (`[[/r 1d20]]`).
* **Consumo Automático:** Disparar desconta 1 uso da munição no inventário e contabiliza acertos para posterior recuperação unificada.

### 4. 🎒 Suporte Avançado para Aljavas (Quivers)
* O módulo reconhece automaticamente itens de equipamento contendo **"Aljava"** ou **"Quiver"** em inglês ou português.
* Atacar consome a quantidade interna da própria aljava (representando os projéteis guardados dentro dela).

### 5. 📏 Sistema de Régua e Movimento Dinâmico (symbaroum-ruler)
As funcionalidades do módulo **symbaroum-ruler** foram totalmente integradas de forma nativa neste módulo. Ao arrastar um token pelo mapa durante um combate ou exploração com o módulo **Drag Ruler** ativo, o Foundry exibirá faixas coloridas indicando a distância exata que o personagem pode percorrer com base em suas ações do turno.

#### 🚀 Como Funciona a Régua
* **Faixa Verde (1 Ação de Movimento - Caminhar):** Mostra a distância que o personagem percorre gastando 1 ação de movimento padrão.
* **Faixa Laranja (2 Ações de Movimento - Correr):** Mostra a distância total que o personagem alcança se decidir gastar ambas as ações do turno em movimento (correndo ou abdicando de sua ação de combate). Equivale a **2x a Velocidade Base**.

#### 🧠 Leitura e Cálculo Dinâmico de Atributos/Mecânicas
O módulo analisa em tempo real os itens e habilidades da ficha do personagem e calcula dinamicamente seu deslocamento:
* **Dádiva: Pés Leves (Fleet-footed):** Caso o personagem possua esta dádiva registrada em sua ficha (detecta termos como *Pés Leves*, *Pes Leves*, *Fleet-footed* ou *Fleet footed*), o deslocamento padrão de 1 ação é expandido automaticamente de 10m para **13 metros** (de acordo com as regras oficiais do *Guia Avançado*, p. 93).
* **Fardo: Lento (Slow):** Caso o personagem possua esta desvantagem/fardo (detecta termos como *Lento* ou *Slow*), o deslocamento padrão de 1 ação é reduzido automaticamente para **7 metros** (conforme regras oficiais do *Guia Avançado*, p. 100).
* **Velocidade Padrão:** Caso o personagem não possua nenhuma dessas condições, o sistema utiliza a velocidade padrão configurada (padrão de **10 metros**).

#### ⚙️ Configurações e Customização
* **Ajuste Global de Velocidade:** O mestre (GM) pode alterar o deslocamento base padrão de 10 metros para qualquer outro valor nas configurações do módulo, sob a seção **symbaroum-ruler**. Caso alterado, este valor será usado como a velocidade para todos os personagens normais (enquanto os com *Pés Leves* e *Lento* continuam obedecendo seus respectivos modificadores dinâmicos de 13m e 7m).
* **Ativação:** Requer que o módulo auxiliar **Drag Ruler** esteja instalado e ativado no mundo do Foundry VTT. O `symbaroum-ind-resources` registra automaticamente o `SymbaroumSpeedProvider` ao carregar o jogo.



---

## 💾 Instalação

Copie os links abaixo diretamente para instalar no seu Foundry VTT:

### Link do Manifesto (Instalação via Foundry)
Copie o link abaixo para colar no campo **Manifest URL** dentro da aba *Add-on Modules* do Foundry VTT:

```text
https://raw.githubusercontent.com/Crespo7777/symbaroum-ind-resources/main/module.json
```

### Link de Download Direto
Caso queira baixar o módulo manualmente em arquivo ZIP:

```text
https://github.com/Crespo7777/symbaroum-ind-resources/releases/latest/download/symbaroum-ind-resources.zip
```

---

## ⚙️ Configurações e Atalhos

### Configurações de Sobrevivência e Automáticas
1. No menu lateral direito do Foundry VTT, vá na aba **Configurações de Jogo** (ícone de engrenagem).
2. Clique em **Configurar Ajustes** (Configure Settings).
3. Na aba **Ajustes do Sistema** (System Settings), clique em **Symbaroum Ind Resources** (ou localize a seção dedicada no menu).
4. Aqui você poderá ativar/desativar o consumo de munição, rastreamento de acertos, atributo de recuperação e valores de cura padrão por dia de descanso.

### Atalhos de Teclado (Keybindings)
1. Vá em **Configurar Controles** (Configure Controls) no menu de configurações do Foundry.
2. Na aba **Symbaroum Ind Resources**, você encontrará e poderá redefinir os seguintes atalhos:
   * **Abrir Diálogo de Descanso** (para o PJ controlado — padrão: `Ctrl + Shift + R`).
