import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './features/catalog/catalog.css'

const queryClient = new QueryClient()
const root = createRoot(document.getElementById('root')!)

async function startMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start()
  }
}

async function startApp() {
  const [{ router }] = await Promise.all([
    import('@/app/router'),
    startMocks(),
  ])

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void startApp().catch((error: unknown) => {
  console.error('Erro ao iniciar a Kurio:', error)

  root.render(
    <main className="p-6">
      <p role="alert">Não foi possível iniciar a Kurio. Atualize a página.</p>
    </main>,
  )
})
