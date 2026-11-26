# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

<!-- kurio-validacao-entrega:start -->
## Execução e validação

Na raiz do projeto:

1. Instale as dependências com `npm ci`.
2. Instale o Chromium com `npx playwright install chromium`.
3. Rode `VITE_ENABLE_MOCKS=true npm run dev` para abrir a demonstração.
4. Rode `npm run lint`, `VITE_ENABLE_MOCKS=true npm run build` e `npx playwright test` para validar.
5. Abra o relatório com `npx playwright show-report`.

As contas de demonstração são `colecionador@kurio.test` e `visitante@kurio.test`. A senha inicial das duas é `KurioDemo123`. Use `KURIO10` para aplicar desconto ou `EXPIRADO` para conferir o tratamento de um cupom expirado. Login, carteira e checkout são simulados.

A suíte final teve **50 testes aprovados** no Chromium desktop e mobile. As referências visuais cobrem Início, Detalhe, Carrinho e Pagamento. Rode a suíte sem `--update-snapshots` para comparar com as capturas versionadas.

### Lighthouse

Lighthouse 13.6.0 no build de produção com mocks ativos. Cada linha mostra a mediana de três medições.

| Página | Desempenho | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Início · mobile | 56 | 98 | 100 | 100 | 4298,610 | 0,000 | 3021,783 |
| Início · desktop | 96 | 98 | 100 | 100 | 1092,567 | 0,000 | 122,000 |
| Detalhe · mobile | 56 | 100 | 100 | 100 | 4524,053 | 0,000 | 1948,442 |
| Detalhe · desktop | 95 | 100 | 100 | 100 | 1165,662 | 0,000 | 140,000 |

[Resumo da auditoria final](artifacts/lighthouse/final-20261126-004425/resumo.txt)

O desktop atingiu a meta de desempenho de 90. No mobile, o LCP ficou acima de 4 s e o TBT permaneceu elevado. A auditoria apontou custo de execução de JavaScript na inicialização, incluindo o bundle dos mocks. Os ajustes incluíram carregamento por rota, inicialização paralela do roteador e dos mocks e reserva de espaço no Detalhe para reduzir o deslocamento do rodapé.
<!-- kurio-validacao-entrega:end -->

<!-- kurio-roteiro-compra -->
## Como testar uma compra simulada

Você pode usar a aplicação publicada ou iniciar a versão local com
`npm ci` e `VITE_ENABLE_MOCKS=true npm run dev`.

1. No catálogo, abra **Emerald Ape #042** e clique em **Comprar**.
2. No carrinho, clique em **Conectar e finalizar**.
3. Entre com `colecionador@kurio.test` e a senha `KurioDemo123`.
4. Preencha o formulário com os dados de exemplo abaixo.
5. Clique em **Confirmar compra** para revisar e depois em **Confirmar pedido**.
6. Após aparecer o comprovante, pressione **F5** para testar a recuperação.
   A compra também pode ser consultada em **Minha conta → Compras**.

| Campo | Valor de exemplo |
|---|---|
| Nome de exibição | Colecionador de teste |
| Nome de usuário | colecionadorteste |
| Nome do perfil | Coleção de teste |
| E-mail, se não estiver preenchido | `colecionador@kurio.test` |
| Rede | Ethereum |
| Endereço da carteira | `0x1111111111111111111111111111111111111111` |
| Tipo de carteira | Extensão |
| Carteira na confirmação | MetaMask |
| Código de indicação | `DEMO` |
| Nome ENS | `colecionador`, com o sufixo `.eth` selecionado |

Deixe **Usar outra carteira?** desmarcado nesse roteiro. O endereço é fictício.
A demonstração simula a compra sem exigir extensão, carteira real ou pagamento.

Para testar o desconto, aplique `KURIO10` no carrinho. Para testar o erro,
use `EXPIRADO`. Para repetir o fluxo com o estado inicial, abra uma nova
sessão em janela anônima.
