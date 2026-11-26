<!-- kurio-arquitetura-entrega:start -->
## Arquitetura da demonstração

- **Interface e rotas.** React, TypeScript, Tailwind CSS e shadcn/ui. O TanStack Router define as rotas e os parâmetros de busca do catálogo. As páginas são carregadas por rota.
- **API e cache.** Axios faz as chamadas REST. TanStack Query gerencia carregamento, erros e cache. Os filtros do catálogo fazem parte da URL. Favoritos usam atualização otimista com rollback e cache associado à sessão.
- **Simulação.** Com `VITE_ENABLE_MOCKS=true`, o aplicativo espera o MSW iniciar antes de renderizar. Os mocks simulam catálogo, carrinho, sessão, perfil, carteiras e pedidos. A sessão usa `sessionStorage` e os dados persistentes dos mocks usam `localStorage`.
- **Tempo real.** O `socket.io-client` usa `/kurio-realtime/`. O MSW intercepta o WebSocket e simula o protocolo Socket.IO sobre Engine.IO. Os eventos `nft.updated` e `order.updated` carregam identificador e versão. A reconciliação consulta a API REST.
- **Checkout.** A confirmação revalida a cotação e usa uma chave de idempotência. O recibo reproduz os dados do pedido confirmado. É possível recuperá-lo após F5.
- **Escopo.** Carteiras, pagamentos e transações são simulados.
<!-- kurio-arquitetura-entrega:end -->
