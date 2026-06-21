# Symbaroum Ind Resources — Foundry VTT

**Symbaroum Ind Resources** é um módulo feito por fã para o sistema de RPG **Symbaroum** no **Foundry VTT (v12+)**. O objetivo deste módulo é automatizar o controle de recursos importantes de sobrevivência e combate de forma nativa e integrada à interface do sistema Symbaroum, sem poluir a ficha dos personagens.

---

## ⚔️ Funcionalidades Principais

### 1. Pão de Viagem (Travel Bread / Waybread)
* **Consumo na Ficha:** Clique com o **botão direito** sobre o item de Pão de Viagem (ou *Waybread*) no inventário do personagem e selecione **"Consumir Pão de Viagem"** para gastar 1 uso.
* **Ícone de Atalho na Hotbar:** Para o jogador ativo, um ícone de pão de viagem aparece automaticamente no canto esquerdo da Hotbar (barra de macros). Clicar nele consome um uso sem precisar abrir a ficha.
* **Cálculo Cumulativo:** O controle de usos calcula perfeitamente o valor total acumulado de todos os pães de viagem que o jogador possui no inventário (onde cada pão equivale a 7 usos. Ex: 1 pão = 7 usos, 2 pães = 14 usos).

### 2. Descanso Avançado (botão "Recuperar")
* **Integração Nativa:** Intercepta o botão nativo **Recuperar** (coração vermelho) na parte superior (topbar) da ficha do PJ.
* **Opções de Descanso:** Abre uma tela onde é possível configurar a quantidade de **Dias de descanso** e a taxa de **Cura por dia** (que vem por padrão baseada nas configurações do módulo).
* **Efeitos do Descanso:**
  * Restaura Toughness (HP) baseado em `Dias x Cura por dia`.
  * Zera os testes de morte falhos (`nbrOfFailedDeathRoll`).
  * Zera toda a **Corrupção Temporária** do personagem caso descanse 1 dia ou mais.
  * Publica um resumo do descanso formatado diretamente no Chat.

### 3. Seleção de Munição Integrada e Modificadores Alquímicos
* **Dropdown no Modal NATIVO:** Ao atacar com uma arma à distância (como Arcos ou Bestas), a antiga janela preta foi removida. Em vez disso, um dropdown com todas as munições compatíveis disponíveis no inventário aparece diretamente dentro do modal de ataque oficial do Foundry/Symbaroum, logo abaixo de **"Outro mod. de dano"**.
* **Efeitos de Munições Especiais:** Ao escolher e disparar uma munição especial no dropdown, os seus efeitos e qualidades são aplicados automaticamente na rolagem:
  * **Flechas/Virotes de Precisão:** Injeta +1 de bônus no teste de ataque (qualidade *Precisa*).
  * **Flechas/Virotes Perfurantes / Bodkin:** Injeta +1 no modificador de dano (qualidade *Impacto Profundo*).
  * **Flechas/Virotes Flamejantes:** Injeta a condição de Queimando (DoT de 1d4 de dano persistente).
* **Consumo Automático:** Disparar desconta 1 uso da munição no inventário e contabiliza acertos para posterior recuperação.

### 4. Suporte Avançado para Aljavas (Quivers)
* O módulo reconhece automaticamente itens de equipamento contendo **"Aljava"** ou **"Quiver"** em inglês ou português.
* O sistema identifica se a aljava é para Besta (Virotes) ou Arco (Flechas) buscando palavras-chaves (como *virote, besta, bolt, crossbow, quarrel*).
* Atacar consome a quantidade interna da própria aljava (representando as flechas/virotes guardados dentro dela).

---

## 💾 Instalação

Como este é um módulo desenvolvido localmente, você pode instalá-lo no seu Foundry VTT de duas maneiras:

### Método 1: Instalação Manual (Pasta Local)
1. Feche o seu Foundry VTT.
2. Copie a pasta inteira `symbaroum-ind-resources` para o diretório de dados do Foundry, no seguinte caminho:
   * **Windows:** `%localappdata%\FoundryVTT\Data\modules\symbaroum-ind-resources`
     *(ou no diretório alternativo onde seus dados do Foundry VTT estão instalados, ex: `C:\Users\<SeuUsuario>\Documents\FoundryVTT\Data\modules\symbaroum-ind-resources`)*
3. Certifique-se de que o arquivo `module.json` esteja diretamente na raiz dessa pasta (ex: `...\modules\symbaroum-ind-resources\module.json`).
4. Abra o Foundry VTT, inicie o seu mundo e ative o módulo **Symbaroum Ind Resources** na aba de gerenciamento de módulos.

### Método 2: Instalação via Link de Manifesto (Caso publique no GitHub)
Se você hospedar o projeto no GitHub ou em outro servidor web, poderá instalá-lo diretamente pelo link do manifesto `module.json`:
1. Vá na tela principal do Foundry VTT (Setup) na aba **Add-on Modules**.
2. Clique em **Install Module**.
3. No campo **Manifest URL** na parte inferior da tela, cole o link para o `module.json` bruto. Exemplo:
   `https://raw.githubusercontent.com/Crespo7777/symbaroum-ind-resources/main/module.json`
4. Clique em **Install**.

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
