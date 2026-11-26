import { http, HttpResponse } from 'msw'
import type { CheckoutSession, Receipt } from './checkoutHandlers'
import { emitOrderUpdate } from './checkoutSocket'

type Scenario = 'pending-then-confirmed' | 'pending-realtime' | 'declined'

interface Outcome {
  scenario: Scenario
  body: string
  token: string
  readyAt: number
  orderId?: string
}

const scenarioKey = 'kurio:checkout-scenario'
const sessionKey = 'kurio:checkout-session'
const outcomePrefix = 'kurio:checkout-outcome:'
const settlements = new Map<string, Promise<string | null>>()

function authorizedSession(request: Request): CheckoutSession | null {
  try {
    const session = JSON.parse(
      sessionStorage.getItem(sessionKey) ?? 'null',
    ) as CheckoutSession | null

    if (
      !session ||
      session.expiresAt <= Date.now() ||
      request.headers.get('Authorization') !== `Bearer ${session.token}`
    ) {
      return null
    }

    return session
  } catch {
    return null
  }
}

function readOutcome(storageKey: string): Outcome | null {
  try {
    return JSON.parse(
      sessionStorage.getItem(storageKey) ?? 'null',
    ) as Outcome | null
  } catch {
    return null
  }
}

function isScenario(value: string | null): value is Scenario {
  return (
    value === 'pending-then-confirmed' ||
    value === 'pending-realtime' ||
    value === 'declined'
  )
}

function pendingResponse() {
  return HttpResponse.json(
    {
      status: 'pending',
      message: 'Pedido pendente. Consulte novamente em alguns instantes.',
    },
    { status: 202 },
  )
}

function settleOrder(storageKey: string, attemptKey: string, outcome: Outcome) {
  const inFlight = settlements.get(storageKey)
  if (inFlight) return inFlight

  const settlement = (async () => {
    const response = await fetch('/api/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outcome.token}`,
        'Idempotency-Key': attemptKey,
      },
      body: outcome.body,
    })

    if (!response.ok || response.status === 202) return null

    const receipt = await response.json() as Partial<Receipt>
    if (receipt.status !== 'confirmed' || typeof receipt.id !== 'string') {
      return null
    }

    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ ...outcome, orderId: receipt.id }),
    )

    emitOrderUpdate(outcome.token, {
      eventId: `${receipt.id}:confirmed:1`,
      attemptKey,
      orderId: receipt.id,
      version: 1,
    })

    return receipt.id
  })().finally(() => {
    settlements.delete(storageKey)
  })

  settlements.set(storageKey, settlement)
  return settlement
}

export const checkoutOutcomeHandlers = [
  http.post('/api/checkout/orders', async ({ request }) => {
    const session = authorizedSession(request)
    const attemptKey = request.headers.get('Idempotency-Key')
    if (!session || !attemptKey || attemptKey.length > 80) return

    const storageKey = `${outcomePrefix}${session.email}:${attemptKey}`
    const body = await request.clone().text()
    let outcome = readOutcome(storageKey)

    if (!outcome) {
      const scenario = sessionStorage.getItem(scenarioKey)
      if (!isScenario(scenario)) return

      const created: Outcome = {
        scenario,
        body,
        token: session.token,
        readyAt: Date.now() + 1_500,
      }

      sessionStorage.setItem(storageKey, JSON.stringify(created))
      sessionStorage.removeItem(scenarioKey)
      outcome = created

      if (scenario === 'pending-realtime') {
        window.setTimeout(() => {
          void settleOrder(storageKey, attemptKey, created).catch(() => {
            // A consulta REST pode tentar recuperar o pedido.
          })
        }, 1_600)

        return pendingResponse()
      }
    }

    if (outcome.token !== session.token || outcome.body !== body) {
      return HttpResponse.json(
        { message: 'Esta tentativa já foi usada com outros dados ou outra sessão.' },
        { status: 409 },
      )
    }

    if (outcome.scenario === 'declined') {
      return HttpResponse.json(
        {
          status: 'declined',
          message: 'Pagamento recusado. Seus itens continuam no carrinho.',
        },
        { status: 422 },
      )
    }

    if (Date.now() < outcome.readyAt) return pendingResponse()

    // O handler principal valida a cotação e grava ou recupera o pedido.
    return
  }),

  http.get('/api/checkout/attempts/:key', async ({ request, params }) => {
    const session = authorizedSession(request)

    if (!session) {
      return HttpResponse.json(
        { message: 'Entre para consultar o pedido.' },
        { status: 401 },
      )
    }

    const attemptKey = String(params.key)
    const storageKey = `${outcomePrefix}${session.email}:${attemptKey}`
    const outcome = readOutcome(storageKey)

    if (outcome?.scenario !== 'pending-realtime' || outcome.token !== session.token) {
      return HttpResponse.json(
        { message: 'Tentativa não encontrada.' },
        { status: 404 },
      )
    }

    if (outcome.orderId) {
      return HttpResponse.json({ status: 'confirmed', orderId: outcome.orderId })
    }

    if (Date.now() < outcome.readyAt) {
      return HttpResponse.json({ status: 'pending' })
    }

    const orderId = await settleOrder(storageKey, attemptKey, outcome)

    if (!orderId) {
      return HttpResponse.json(
        { message: 'Não foi possível confirmar o pedido. Revise o carrinho.' },
        { status: 409 },
      )
    }

    return HttpResponse.json({ status: 'confirmed', orderId })
  }),
]