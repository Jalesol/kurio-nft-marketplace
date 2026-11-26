# Arquitetura da Kurio

## Interface e navegação

A aplicação usa React, TypeScript, Tailwind CSS e shadcn/ui. O TanStack Router
define as rotas e carrega os componentes de cada página sob demanda.

Busca, coleção, rede, ordenação e paginação fazem parte da URL do catálogo.
Isso permite compartilhar uma seleção de filtros e recuperar a navegação
ao atualizar a página ou usar o histórico do navegador.

## API e cache

O cliente Axios chama as rotas REST. O TanStack Query gerencia o cache,
os estados de carregamento e a atualização dos dados depois de uma mudança.

| Área               | Rotas principais                                                                  |
| ------------------ | --------------------------------------------------------------------------------- |
| Catálogo           | `GET /api/nfts` e `GET /api/nfts/:nftId`                                          |
| Carrinho           | `GET /api/cart` e mutações em itens e cupom                                       |
| Sessão             | `GET`, `POST` e `DELETE /api/checkout/session`                                    |
| Cadastro           | `POST /api/checkout/register`                                                     |
| Favoritos          | `GET /api/account/favorites` e `PUT` ou `DELETE /api/account/favorites/:nftId`    |
| Perfil e carteiras | `GET /api/account`, `PUT /api/account/profile` e `PUT /api/account/wallets/:slot` |
| Pedidos            | `POST /api/checkout/orders` e consulta para recuperação do pedido                 |

Catálogo e detalhe usam as chaves de cache `['catalog', filtros]` e
`['nft', nftId]`, respectivamente, com 30 segundos de frescor. Um evento de
atualização pode invalidar esses dados antes desse prazo.

Favoritos usam cache separado pelo token da sessão. A interface atualiza a
lista imediatamente e restaura o estado anterior se a API devolver erro.

## Mocks e persistência

Com `VITE_ENABLE_MOCKS=true`, o aplicativo espera o MSW iniciar antes de
renderizar. Assim, as consultas iniciais passam pelos handlers simulados.

A sessão usa `sessionStorage`. O estado persistente da demonstração usa
`localStorage`, incluindo carrinho, favoritos por conta, dados do perfil
e pedidos simulados. Atualizar a página permite recuperar esse estado no
mesmo navegador. Uma nova sessão anônima começa com armazenamento separado.

Os mocks são a fonte de dados desta demonstração. Autenticação, carteiras
e pagamentos são simulados, sem dependência de um serviço externo.

## Checkout e recuperação

O checkout mostra uma revisão antes de confirmar o pedido. Ao confirmar,
o mock verifica a cotação atual. Se o carrinho mudou, a interface informa
o conflito e exige uma nova revisão.

O pedido usa uma chave de idempotência para recuperar a mesma tentativa
em caso de reenvio ou perda da resposta. A confirmação salva um retrato
dos itens e valores comprados. O comprovante usa esses dados, mesmo que o
catálogo mude depois. O identificador do pedido na URL permite recuperar
o comprovante após F5.

## Tempo real

O `socket.io-client` usa o caminho `/kurio-realtime/`. O MSW intercepta a
conexão WebSocket e simula as mensagens Socket.IO sobre Engine.IO.

- `nft.updated` identifica o NFT e a versão da mudança. O cliente invalida
  as consultas relacionadas para buscar preço e disponibilidade atualizados.
- `order.updated` identifica a tentativa, o pedido e sua versão. O evento
  aciona a consulta do estado do pedido. O comprovante depende da confirmação
  retornada pela API simulada.

Os testes cobrem reenvio e ordem de versões para `nft.updated`. Para pedidos,
cobrem confirmação por evento e recuperação quando o WebSocket cai antes
de entregar a atualização.

## Desempenho e limitações

O carregamento por rota reduziu o JavaScript inicial. O roteador e os mocks
começam a carregar em paralelo. No detalhe, o conteúdo reserva espaço durante
o carregamento para reduzir o deslocamento do rodapé.

Na auditoria final, o desempenho desktop atingiu 96 no Início e 95 no Detalhe.
No mobile, ficou em 56 nas duas páginas, abaixo da meta de 90. Os relatórios
indicaram LCP acima de 4 segundos e custo elevado de execução de JavaScript,
incluindo o bundle dos mocks. Os resultados completos estão no
[README](README.md#lighthouse).

Os 50 testes Playwright validam a versão local com mocks. As capturas de
referência cobrem Início, Detalhe, Carrinho e Pagamento no Chromium desktop
e mobile.
