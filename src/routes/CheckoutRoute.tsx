import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Receipt } from '@/mocks/checkoutHandlers'
import {
  api,
  clearPendingCheckout,
  getPendingCheckout,
} from '@/services/api'
import { cartErrorMessage } from '@/services/cartApi'
import CheckoutPage from './CheckoutPage'

const receiptPrefix = 'pedido-'

export default function CheckoutRoute() {
  const hash = useLocation({ select: (location) => location.hash })
  const queryClient = useQueryClient()
  const [pending] = useState(() => hash ? null : getPendingCheckout())

  const recovery = useQuery({
    queryKey: ['checkout-recovery', pending?.token, pending?.key],
    enabled: Boolean(pending && !hash),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      if (!pending || getPendingCheckout()?.key !== pending.key) {
        throw new Error('Esta tentativa não está mais disponível para recuperação.')
      }

      const { data } = await api.post<Receipt>('/checkout/orders', pending.body, {
        headers: {
          Authorization: `Bearer ${pending.token}`,
          'Idempotency-Key': pending.key,
        },
      })

      if (data?.status !== 'confirmed' || !data.id || !Array.isArray(data.cart?.items)) {
        throw new Error('A API não retornou um pedido confirmado.')
      }

      queryClient.setQueryData(['checkout-receipt', pending.token, data.id], data)
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      return data
    },
  })

  useEffect(() => {
    if (!hash.startsWith(receiptPrefix)) return

    const attempt = getPendingCheckout()
    if (attempt) clearPendingCheckout(attempt.key)
  }, [hash])

  if (hash || !pending) return <CheckoutPage />

  if (recovery.data) {
    return (
      <Navigate
        to="/checkout"
        hash={`${receiptPrefix}${recovery.data.id}`}
        replace
      />
    )
  }

  const status = isAxiosError(recovery.error) ? recovery.error.response?.status : undefined
  const cannotRetry = status === 400 || status === 401 || status === 409

  return (
    <main className="mx-auto min-h-[65vh] max-w-[1200px] px-5 py-8 font-mono text-[#f5eee8] sm:px-8 lg:px-12">
      <h1 className="text-lg font-bold">Pagamento</h1>

      {recovery.isPending && (
        <p role="status" className="mt-4 text-sm text-[#ceb08d]">
          Recuperando seu pedido…
        </p>
      )}

      {recovery.isError && (
        <div className="mt-4 space-y-3 text-sm">
          <p role="alert">{cartErrorMessage(recovery.error)}</p>

          {!cannotRetry && (
            <Button
              type="button"
              disabled={recovery.isFetching}
              onClick={() => void recovery.refetch()}
            >
              Tentar novamente
            </Button>
          )}

          {cannotRetry && (
            <Link to="/cart" className="block text-[#efae75] underline">
              Voltar ao carrinho
            </Link>
          )}
        </div>
      )}
    </main>
  )
}