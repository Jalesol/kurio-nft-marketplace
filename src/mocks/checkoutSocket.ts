import { ws } from 'msw'
import type { CheckoutSession } from './checkoutHandlers'

interface OrderUpdate {
  eventId: string
  attemptKey: string
  orderId: string
  version: number
}

interface NftUpdate {
  eventId: string
  nftId: string
  version: number
}

type SendOrderUpdate = (token: string, update: OrderUpdate) => void
type SendNftUpdate = (update: NftUpdate) => void

const url = new URL('/kurio-realtime/', window.location.href)
url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

const socketLink = ws.link(url.href)
const orderSubscribers = new Set<SendOrderUpdate>()
const nftSubscribers = new Set<SendNftUpdate>()
const pingInterval = 25_000
const pingTimeout = 20_000
const disconnectScenarioKey = 'kurio:disconnect-before-order-update'

function activeToken() {
  try {
    const session = JSON.parse(
      sessionStorage.getItem('kurio:checkout-session') ?? 'null',
    ) as CheckoutSession | null

    return session && session.expiresAt > Date.now() ? session.token : undefined
  } catch {
    return undefined
  }
}

export function emitOrderUpdate(token: string, update: OrderUpdate) {
  if (activeToken() !== token) return

  for (const send of orderSubscribers) {
    send(token, update)
  }
}

function broadcastNftUpdate(update: NftUpdate) {
  for (const send of nftSubscribers) {
    send(update)
  }
}

export function emitNftUpdate(update: NftUpdate) {
  broadcastNftUpdate(update)

  const scenarioKey = 'kurio:replay-nft-update'
  if (sessionStorage.getItem(scenarioKey) !== 'armed') return

  sessionStorage.setItem(scenarioKey, 'running')

  window.setTimeout(() => broadcastNftUpdate(update), 1200)

  window.setTimeout(() => {
    broadcastNftUpdate({
      ...update,
      eventId: crypto.randomUUID(),
      version: update.version - 1,
    })
  }, 2000)

  // Dá tempo para o cliente processar o último pacote antes de encerrar o cenário.
  window.setTimeout(() => sessionStorage.setItem(scenarioKey, 'done'), 2500)
}

export const checkoutSocketHandler = socketLink.addEventListener(
  'connection',
  ({ client }) => {
    let connected = false
    let subscribedToken: string | undefined

    const sendOrder: SendOrderUpdate = (token, update) => {
      if (!connected || subscribedToken !== token) return

      if (sessionStorage.getItem(disconnectScenarioKey) === 'armed') {
        sessionStorage.setItem(disconnectScenarioKey, 'triggered')
        connected = false
        subscribedToken = undefined
        client.close(1012, 'Reconexão simulada')
        return
      }

      client.send(`42${JSON.stringify(['order.updated', update])}`)
    }

    const sendNft: SendNftUpdate = (update) => {
      if (connected) {
        client.send(`42${JSON.stringify(['nft.updated', update])}`)
      }
    }

    client.addEventListener('message', (event) => {
      const packet = event.data
      if (typeof packet !== 'string') return

      if (packet === '40' || packet.startsWith('40{')) {
        connected = true
        client.send(`40${JSON.stringify({ sid: crypto.randomUUID() })}`)
        return
      }

      if (packet === '41') {
        connected = false
        subscribedToken = undefined
        return
      }

      if (!connected || !packet.startsWith('42')) return

      try {
        const payload: unknown = JSON.parse(packet.slice(2))
        if (!Array.isArray(payload) || payload[0] !== 'checkout.subscribe') return

        const token: unknown = payload[1]
        subscribedToken =
          typeof token === 'string' && token === activeToken() ? token : undefined
      } catch {
        subscribedToken = undefined
      }
    })

    orderSubscribers.add(sendOrder)
    nftSubscribers.add(sendNft)

    const handshake = window.setTimeout(() => {
      client.send(`0${JSON.stringify({
        sid: crypto.randomUUID(),
        upgrades: [],
        pingInterval,
        pingTimeout,
        maxPayload: 1_000_000,
      })}`)
    }, 0)

    const heartbeat = window.setInterval(() => {
      if (connected) client.send('2')
    }, pingInterval)

    client.addEventListener('close', () => {
      window.clearTimeout(handshake)
      window.clearInterval(heartbeat)
      orderSubscribers.delete(sendOrder)
      nftSubscribers.delete(sendNft)
    })
  },
)