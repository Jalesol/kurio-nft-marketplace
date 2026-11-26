import axios, { AxiosError, isAxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
})

const pendingCheckoutKey = 'kurio:pending-checkout:v1'
const browserSessionKey = 'kurio:checkout-session'

export interface PendingCheckout {
  key: string
  token: string
  body: Record<string, unknown>
}

export function getPendingCheckout(): PendingCheckout | null {
  try {
    const saved = sessionStorage.getItem(pendingCheckoutKey)
    if (!saved) return null

    const attempt = JSON.parse(saved) as PendingCheckout
    const session = JSON.parse(
      sessionStorage.getItem(browserSessionKey) ?? 'null',
    ) as { token?: string; expiresAt?: number } | null

    if (
      !attempt?.key ||
      !attempt.body ||
      typeof attempt.body !== 'object' ||
      !session?.token ||
      session.token !== attempt.token ||
      typeof session.expiresAt !== 'number' ||
      session.expiresAt <= Date.now()
    ) {
      return null
    }

    return attempt
  } catch {
    return null
  }
}

export function clearPendingCheckout(key: string) {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(pendingCheckoutKey) ?? 'null',
    ) as PendingCheckout | null

    if (saved?.key === key) sessionStorage.removeItem(pendingCheckoutKey)
  } catch {
    // A recuperação depende de o navegador permitir o armazenamento da aba.
  }
}

api.interceptors.request.use((config) => {
  if (config.method !== 'post' || config.url !== '/checkout/orders') {
    return config
  }

  const key = config.headers.get('Idempotency-Key')
  const authorization = config.headers.get('Authorization')

  if (
    typeof key !== 'string' ||
    typeof authorization !== 'string' ||
    !authorization.startsWith('Bearer ') ||
    !config.data ||
    typeof config.data !== 'object'
  ) {
    return config
  }

  const attempt: PendingCheckout = {
    key,
    token: authorization.slice('Bearer '.length),
    body: config.data,
  }

  try {
    sessionStorage.setItem(pendingCheckoutKey, JSON.stringify(attempt))
  } catch {
    // O envio original pode seguir mesmo sem recuperação por F5.
  }

  return config
})

api.interceptors.response.use(
  (response) => {
    if (
      response.config.method === 'post' &&
      response.config.url === '/checkout/orders' &&
      response.status === 202 &&
      response.data?.status === 'pending'
    ) {
      throw new AxiosError(
        'Pedido pendente.',
        'ERR_CHECKOUT_PENDING',
        response.config,
        response.request,
        response,
      )
    }

    return response
  },
  (error: unknown) => {
    if (
      isAxiosError(error) &&
      error.config?.method === 'post' &&
      error.config.url === '/checkout/orders' &&
      (error.response?.status === 400 ||
        error.response?.status === 409 ||
        error.response?.status === 422)
    ) {
      const key = error.config.headers.get('Idempotency-Key')
      if (typeof key === 'string') clearPendingCheckout(key)
    }

    return Promise.reject(error)
  },
)