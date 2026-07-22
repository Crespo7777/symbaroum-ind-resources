# Diarios do Foundry VTT e do Symbaroum

## Objetivo

Este documento registra o contrato tecnico que deve orientar qualquer integracao de lore, cronicas, notas de campanha e conteudo editorial com o modulo `symbaroum-ind-resources`.

O objetivo e usar Documents nativos do Foundry, preservar permissoes e manter compatibilidade funcional com Foundry VTT v13 e v14. A integracao nao deve criar um banco paralelo de diarios.

## Fontes verificadas

### Instalacao local

- Foundry v13:
  - `common/documents/journal-entry.mjs`
  - `common/documents/journal-entry-page.mjs`
  - `client/documents/journal-entry.mjs`
  - `client/documents/journal-entry-page.mjs`
- Symbaroum 6.1.6:
  - `system.json`
  - `script/sheet/journal.js`
  - `script/common/hooks.js`

### API e documentacao oficial

- Journal Entries: <https://foundryvtt.com/article/journal/>
- JournalEntry v14: <https://foundryvtt.com/api/v14/classes/foundry.documents.JournalEntry.html>
- JournalEntryPage v14: <https://foundryvtt.com/api/v14/variables/CONFIG.JournalEntryPage.html>
- Journal collection v14: <https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Journal.html>

## Modelo nativo

### JournalEntry

`JournalEntry` e um World Document armazenado na colecao `game.journal`. Ele representa uma obra, pasta logica ou registro principal e contem paginas embutidas.

Campos relevantes:

| Campo | Finalidade |
| --- | --- |
| `name` | Nome visivel do diario |
| `pages` | Colecao embutida de `JournalEntryPage` |
| `folder` | Pasta do diretorio de diarios |
| `categories` | Categorias internas da entrada |
| `sort` | Ordenacao persistente |
| `ownership` | Permissoes por usuario e nivel padrao |
| `flags` | Metadados namespaced de integracoes |
| `_stats` | Metadados gerenciados pelo Foundry |

Operacoes persistentes devem usar APIs de Document, por exemplo:

- `JournalEntry.implementation.create(...)`;
- `journal.update(...)`;
- `journal.createEmbeddedDocuments("JournalEntryPage", [...])`;
- `journal.updateEmbeddedDocuments("JournalEntryPage", [...])`;
- `journal.deleteEmbeddedDocuments("JournalEntryPage", [...])`.

Nao editar bancos, packs, `_source`, collections ou objetos internos diretamente.

### JournalEntryPage

Cada pagina e um Embedded Document pertencente a um `JournalEntry`.

Tipos nativos confirmados nas versoes analisadas:

| Tipo | Uso recomendado |
| --- | --- |
| `text` | Lore, sessoes, fichas narrativas, notas e indices |
| `image` | Mapas, retratos, documentos e handouts |
| `pdf` | Material PDF autorizado |
| `video` | Videos locais ou fontes suportadas pelo Foundry |

Campos importantes:

- `name`, `type`, `sort` e `category`;
- `text.content`, `text.markdown` e `text.format` para texto;
- `src` para imagem, PDF ou video;
- `title.show` e `title.level` para apresentacao;
- `image.caption` e propriedades de video;
- `ownership` e `flags`.

Paginas herdam permissoes da entrada por padrao, mas podem possuir ownership proprio. Para dados realmente sigilosos, ainda e mais seguro usar entradas separadas do que depender de combinacoes complexas de ownership por pagina.

## Permissoes

Niveis nativos relevantes:

| Nivel | Comportamento esperado |
| --- | --- |
| `NONE` | Documento oculto |
| `LIMITED` | Visibilidade limitada conforme a superficie do Foundry |
| `OBSERVER` | Leitura do conteudo |
| `OWNER` | Leitura e edicao |

Regras importantes:

- GM recebe autoridade total pelo Foundry.
- Criacao de diarios exige a permissao de usuario correspondente, como `JOURNAL_CREATE`.
- Atualizacao e exclusao devem respeitar ownership no ponto da operacao.
- Ocultar botoes nao substitui verificacao de permissao.
- Um jogador `OBSERVER` nao deve receber ferramentas de edicao.
- Um jogador `OWNER` pode editar conteudo e participar da edicao colaborativa suportada pelo editor nativo.

### Matriz recomendada

| Conteudo | GM | Jogador relacionado | Outros jogadores |
| --- | --- | --- | --- |
| Lore geral | OWNER | OBSERVER | OBSERVER |
| Resumo publico de sessao | OWNER | OBSERVER ou OWNER | OBSERVER |
| Diario pessoal | OWNER | OWNER | NONE |
| Dossie publico de personagem | OWNER | OWNER | OBSERVER |
| Preparacao da sessao | OWNER | NONE | NONE |
| Segredos de NPC | OWNER | NONE | NONE |
| Nota compartilhada do grupo | OWNER | OWNER | OWNER |

## Recursos nativos que devem ser preservados

- editor rico e Markdown conforme o tipo/formato da pagina;
- autosave e edicao colaborativa fornecidos pelo Foundry;
- links UUID para Journal, Actor, Item, Scene e outros Documents;
- links para cabecalhos e sumario de paginas;
- blocos secretos do editor;
- exibicao de entradas ou paginas aos jogadores;
- pins de Journal em Scenes;
- importacao e exportacao por compendios usando APIs publicas;
- busca, pastas, ordenacao e ownership nativos.

O modulo nao deve substituir esses comportamentos por HTML solto ou um armazenamento proprio.

## Comportamento do Symbaroum

O sistema Symbaroum 6.1.6 nao cria um tipo proprio de Journal nem altera o schema dos Documents.

Ele registra uma sheet opcional chamada `SymbaroumWide`, derivada da sheet AppV1 do Foundry. A customizacao:

- aumenta a largura padrao;
- adiciona a classe CSS `symbaroum-mod`;
- preserva o fluxo nativo de configuracao de sheet;
- nao muda persistencia, ownership, tipos de pagina ou links.

O sistema tambem possui um pack de `JournalEntry` para guias e usa importacao nativa de compendio. Portanto, qualquer integracao deste modulo deve continuar criando `JournalEntry` e `JournalEntryPage` comuns.

## Compatibilidade v13 e v14

O modelo de Document e as operacoes embutidas necessarias existem nas duas versoes analisadas. A implementacao futura deve:

1. usar Documents como contrato principal;
2. evitar depender diretamente da classe AppV1 `SymbaroumWide`;
3. deixar a abertura do documento usar a sheet registrada/configurada pelo Foundry;
4. usar `ApplicationV2` apenas para dashboards ou assistentes proprios do modulo;
5. isolar em adapter qualquer diferenca real de contexto ou render entre v13 e v14.

A compatibilidade v14 nao deve ser declarada como validada sem teste runtime no build alvo.

## Metadados da integracao

Todo conteudo importado deve receber flags namespaced e versionadas:

```js
flags: {
  "symbaroum-ind-resources": {
    knowledge: {
      schema: 1,
      source: "symbaroumlore",
      sourceId: "davokar",
      kind: "lore-section",
      visibility: "public",
      sourceHash: "...",
      importedAt: "..."
    }
  }
}
```

Essas flags identificam a origem e permitem atualizar o mesmo Document sem duplicar entradas. Nunca usar apenas o nome como identificador.

## Invariantes de seguranca

- Conteudo secreto deve permanecer em Documents sem ownership de jogador.
- Dados vindos dos projetos devem ser tratados como entrada nao confiavel e sanitizados antes de inserir HTML.
- Links persistentes devem usar UUID.
- Imagens devem ser copiadas para uma pasta estavel do modulo ou do mundo; caminhos temporarios e URLs externas nao sao fonte confiavel.
- Importacoes em massa exigem dry-run, confirmacao, relatorio e estrategia de rollback.
- Apenas um GM ativo deve executar migracoes globais, de forma idempotente.
- Renderizar ou abrir um Journal nunca deve persistir migracoes ocultas.

## Conclusao tecnica

O sistema nativo de diarios atende leitura, edicao, permissoes, imagens, links e organizacao necessarios aos dois projetos. A arquitetura correta e converter os dados para Documents nativos, usar compendios para conteudo editorial versionado e usar Journals do mundo para a cronica mutavel.

