# Meus Lembretes - Programação III

Atividade de Programação III (UMFG) feita a partir dos projetos base do professor:

- API: https://github.com/leicam/umfg-programacao-iii-minimal-api-2026
- Front-end: https://github.com/leicam/umfg-programacao-iii-front-end-2026

O repositório tem as duas partes:

- `api/` - Minimal API em .NET 8 com Entity Framework e MySQL
- `front/` - HTML, CSS e JavaScript puro, consumindo a API com `fetch`

## Como executar

### API

1. Ter o .NET 8 SDK e um MySQL rodando.
2. Ajustar a `ConnectionString` em `api/umfg.programacaoiii.minimalapi.2026/appsettings.Development.json` (porta, usuário e senha do seu MySQL).
3. Rodar o projeto com o perfil `https` (pelo Visual Studio ou com `dotnet run --launch-profile https` dentro da pasta do projeto).
4. A API sobe em `https://localhost:7063`. As migrations rodam sozinhas na primeira requisição.
5. Na primeira vez, confiar no certificado de desenvolvimento com `dotnet dev-certs https --trust`. Sem isso o navegador recusa a conexão https com a API e o front mostra erro de comunicação.

### Front-end

Abrir a pasta `front` com o Live Server do VS Code (ou qualquer servidor estático) e acessar o `index.html`.
O endereço da API fica na primeira linha do `front/js/app.js` (`API_URL`). Se a API estiver em outra porta, é só trocar ali.

## End-points da API

| Método | Rota | O que faz |
|--------|------|-----------|
| GET | `/lembretes` | lista todos os lembretes ativos |
| GET | `/lembretes/{id}` | busca um lembrete pelo id |
| GET | `/lembretes/filtro` | lista com filtros, paginação e ordenação |
| GET | `/lembretes/imprimir` | gera o PDF com os mesmos filtros |
| POST | `/lembretes` | cadastra (`{ "descricao": "..." }`) |
| PUT | `/lembretes/{id}` | altera a descrição |
| DELETE | `/lembretes/{id}` | exclusão lógica (marca como inativo) |

Parâmetros do `/lembretes/filtro`: `NumeroPagina`, `TamanhoPagina`, `Ordem` (`Descricao`, `DataCadastro` ou `DataAtualizacao`), `Direcao` (`ASC` ou `DESC`), `Descricao`, `DataCadastroInicial`, `DataCadastroFinal`, `DataAtualizacaoInicial` e `DataAtualizacaoFinal`.

Exemplo:

```
GET /lembretes/filtro?NumeroPagina=1&TamanhoPagina=10&Ordem=Descricao&Direcao=ASC&Descricao=prova&DataCadastroInicial=2026-11-01
```

## Sobre o CORS

O front roda em uma origem (ex.: `http://127.0.0.1:5500`, do Live Server) e a API em outra (`https://localhost:7063`). Como a porta e o protocolo são diferentes, o navegador considera origens diferentes e, por segurança, bloqueia a resposta de uma requisição feita pelo JavaScript para outra origem, a não ser que o servidor diga que aceita.

Quem faz essa liberação é a API, pelos cabeçalhos `Access-Control-Allow-*`. No `Program.cs` foi criada a política `Frontend` com `AllowAnyOrigin`, `AllowAnyHeader` e `AllowAnyMethod`, ativada com `app.UseCors("Frontend")`. Para PUT, DELETE e POST com `Content-Type: application/json` o navegador ainda manda antes uma requisição `OPTIONS` (preflight) perguntando se o método e os cabeçalhos são permitidos, e só depois envia a requisição de verdade. Dá pra ver isso na aba Rede do DevTools.

Liberar qualquer origem serve para o ambiente local. Em produção o certo seria usar `.WithOrigins("https://endereco-do-front")`.

## O que foi feito

### Front-end

- Layout novo: cabeçalho verde com os cards sobrepostos, fundo creme, detalhes em terracota, fontes Fraunces (títulos) e Manrope (texto).
- Formulário de cadastro/edição com contador de caracteres e validação da descrição obrigatória.
- Filtros por descrição, data de cadastro (de/até) e data de atualização (de/até), com botão para limpar. Não deixa filtrar com data inicial maior que a final.
- Paginação com anterior/próxima, números das páginas, quantidade de itens por página e o texto "Exibindo X–Y de Z".
- Ordenação clicando no título das colunas Descrição, Cadastro e Atualização. Cada clique inverte a direção e a seta mostra a ordem atual.
- Mensagens de sucesso e erro (toasts), estado de carregando, aviso de nenhum registro encontrado e tela de erro quando a API não responde, com botão para tentar de novo.
- Confirmação de exclusão em um modal.
- Responsivo: no celular a tabela vira uma lista de cards e a ordenação aparece como botões acima da lista.
- A descrição é inserida na tabela como texto, então HTML digitado no lembrete não é interpretado.

### Ajustes na API

Para os filtros, a ordenação e o PDF funcionarem foi preciso corrigir algumas coisas na API:

- Os parâmetros de filtro do `LembreteQueryRequestDTO` passaram a ser opcionais (`string?` e `DateTime?`). Do jeito que estava, com `[AsParameters]`, todos eram obrigatórios na query string e os valores padrão das datas faziam a consulta não trazer nada.
- A ordenação usava `OrderBy(x => dto.Ordem)`, que ordena por um valor fixo e não muda nada. Agora ela ordena pela coluna escolhida e desempata pelo `Id`, para a paginação não repetir nem pular registros com o mesmo valor.
- POST e PUT retornam 400 quando a descrição vem vazia ou passa de 500 caracteres, e as rotas com `{id}` retornam 400 quando o id não é um GUID válido (antes dava erro 500).
- O PUT retorna 404 para lembrete já excluído.
- O `Program.cs` estava salvo em ISO-8859-1. O compilador lê como UTF-8, então os acentos saíam quebrados no PDF e nas mensagens. O arquivo foi convertido para UTF-8.

## Testes realizados

Testei cadastro, consulta, edição, exclusão, todos os filtros (inclusive combinados), troca de página, quantidade por página, ordenação nas três colunas nos dois sentidos, impressão do PDF, campo obrigatório vazio, data inicial maior que a final, busca sem resultado, exclusão do último item da última página e a API desligada. Também conferi as requisições na aba Rede do navegador (método, URL, query string, headers, corpo e resposta).
