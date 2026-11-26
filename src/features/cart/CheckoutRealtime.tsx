import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import type { CheckoutSession } from '@/mocks/checkoutHandlers'
import { api, getPendingCheckout } from '@/services/api'

interface OrderUpdate {
  eventId: string
  attemptKey: string
  orderId: string
  version: number
}

interface AttemptStatus {
  status: 'pending' | 'confirmed'
  orderId?: string
}

export default function CheckoutRealtime() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const hash = useLocation({ select: (location) => location.hash })

  const { data: session } = useQuery({
    queryKey: ['checkout-session'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ session: CheckoutSession | null }>(
        '/checkout/session',
        { signal },
      )

      if (!data || typeof data !== 'object' || !('session' in data)) {
        throw new Error('A API de sessão está indisponível.')
      }

      return data.session
    },
    retry: false,
  })

  const token = session?.token

  useEffect(() => {
    if (!token || hash.startsWith('pedido-')) return

    const controller = new AbortController()
    const handledVersions = new Map<string, number>()
    let socket: Socket | undefined
    let openingReceipt = false

    async function reconcile(update?: OrderUpdate) {
      const attempt = getPendingCheckout()

      if (
        controller.signal.aborted ||
        openingReceipt ||
        !attempt ||
        attempt.token !== token ||
        (update && update.attemptKey !== attempt.key) ||
        (update && (handledVersions.get(attempt.key) ?? 0) >= update.version)
      ) {
        return
      }

      try {
        const { data } = await api.get<AttemptStatus>(
          `/checkout/attempts/${encodeURIComponent(attempt.key)}`,
          {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${token}` },
          },
        )

        const currentAttempt = getPendingCheckout()

        if (
          controller.signal.aborted ||
          openingReceipt ||
          currentAttempt?.key !== attempt.key ||
          currentAttempt.token !== token ||
          data?.status !== 'confirmed' ||
          typeof data.orderId !== 'string' ||
          (update && update.orderId !== data.orderId)
        ) {
          return
        }

        openingReceipt = true

        await navigate({
          to: '/checkout',
          hash: `pedido-${data.orderId}`,
          replace: true,
        })

        if (update) handledVersions.set(attempt.key, update.version)
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
      } catch {
        openingReceipt = false
        // A próxima conexão pode reconciliar o estado com a API.
      }
    }

    function onConnect() {
      socket?.emit('checkout.subscribe', token)
      void reconcile()
    }

    function onOrderUpdate(update: OrderUpdate) {
      if (
        typeof update?.eventId !== 'string' ||
        typeof update.attemptKey !== 'string' ||
        typeof update.orderId !== 'string' ||
        !Number.isSafeInteger(update.version)
      ) {
        return
      }

      void reconcile(update)
    }

    async function connect() {
      try {
        const { io } = await import('socket.io-client')
        if (controller.signal.aborted) return

        socket = io(window.location.origin, {
          path: '/kurio-realtime/',
          transports: ['websocket'],
          autoConnect: false,
          forceNew: true,
        })

        socket.on('connect', onConnect)
        socket.on('order.updated', onOrderUpdate)
        socket.connect()
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Não foi possível iniciar o Socket.IO do checkout.', error)
        }
      }
    }

    void connect()

    return () => {
      controller.abort()
      socket?.off('connect', onConnect)
      socket?.off('order.updated', onOrderUpdate)
      socket?.disconnect()
    }
  }, [hash, navigate, queryClient, token])

  return null
}