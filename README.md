# ⚔️ Symbaroum Ind Resources — Foundry VTT

**Symbaroum Ind Resources** é um módulo desenvolvido para o sistema de RPG **Symbaroum** no **Foundry VTT (v12+)**. O objetivo deste módulo é automatizar o controle de recursos importantes de sobrevivência e combate de forma nativa e integrada à interface do sistema Symbaroum, sem poluir a ficha dos personagens.

---

## ⚔️ Funcionalidades Principais

### 1. 🍞 Pão de Viagem (Travel Bread / Waybread)
* **Consumo na Ficha:** Clique com o **botão direito** sobre o item de Pão de Viagem (ou *Waybread*) no inventário do personagem e selecione **"Consumir Pão de Viagem"** para gastar 1 uso.
* **Quantidade e Usos:** A quantidade no inventário exibe quantos usos restam no formato `Unidades (UsosRestantes/MaxUsos)` (ex: `1 (7/7)`).
* **Notificação no Chat:** Consumir um pão de viagem publica uma mensagem detalhada no Chat informando os usos e unidades restantes.
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
* **Dropdown no Modal NATIVO:** Ao atacar com uma arma à distância (como Arcos ou Bestas), a antiga janela preta foi removida. Em vez disso, um dropdown com todas as munições compatíveis disponíveis no inventário aparece diretamente dentro do modal de ataque oficial do Foundry/Symbaroum, logo abaixo de **"Outro mod. de dano"**.
* **Efeitos de Munições Especiais (Revisados de acordo com o Livro Básico e Livro Avançado):** Ao escolher e disparar uma munição especial no dropdown, os seus efeitos e qualidades são aplicados automaticamente na rolagem:
  * **Flechas/Virotes de Precisão:** Injeta +1 de bônus no teste de ataque (qualidade *Precisa*).
  * **Flechas/Virotes Perfurantes / Bodkin:** Injeta +1 no modificador de dano (qualidade *Impacto Profundo*).
  * **Flechas/Virotes Flamejantes:** Injeta a condição de Queimando (DoT de 1d4 de dano persistente).
* **Consumo Automático:** Disparar desconta 1 uso da munição no inventário e contabiliza acertos para posterior recuperação.

### 4. 🎒 Suporte Avançado para Aljavas (Quivers)
* O módulo reconhece automaticamente itens de equipamento contendo **"Aljava"** ou **"Quiver"** em inglês ou português.
* O sistema identifica se a aljava é para Besta (Virotes) ou Arco (Flechas) buscando palavras-chaves (como *virote, besta, bolt, crossbow, quarrel*).
* Atacar consome a quantidade interna da própria aljava (representando as flechas/virotes guardados dentro dela).

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
