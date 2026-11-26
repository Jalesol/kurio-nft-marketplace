import { delay, http, HttpResponse } from 'msw'
import type { CartSnapshot } from '@/features/cart/types'

export const wallets = ['MetaMask', 'WalletConnect', 'Coinbase Wallet'] as const
export const networks = ['Ethereum', 'Polygon', 'Solana'] as const

export interface CheckoutSession {
  email: string
  token: string
  expiresAt: number
}

export interface CheckoutDetails {
  name: string
  username: string
  profileName: string
  email: string
  address: string
  walletType: 'Extensão' | 'Aplicativo móvel' | 'Carteira física'
  referralCode: string
  ensName: string
  secondaryWallet: string
  useOtherWallet: boolean
  note: string
  wallet: (typeof wallets)[number]
  network: (typeof networks)[number]
}

export interface Receipt extends CheckoutDetails {
  id: string
  status: 'confirmed'
  cart: CartSnapshot
}

export interface SavedOrder {
  key: string
  email: string
  input: string
  receipt: Receipt
}

interface CheckoutCart {
  read: () => CartSnapshot
  findOrder: (email: string, key: string) => SavedOrder | undefined
  confirm: (order: SavedOrder) => void
}

interface DemoAccount {
  username: string
  email: string
  salt: string
  passwordHash: string
}

const sessionKey = 'kurio:checkout-session'
const accountsKey = 'kurio:demo-accounts:v1'
const checkoutScenarioKey = 'kurio:checkout-scenario'
const demoEmails = ['colecionador@kurio.test', 'visitante@kurio.test']
const usernamePattern = /^[a-zA-Z0-9_.-]{2,32}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function readSession(): CheckoutSession | null {
  try {
    const saved = sessionStorage.getItem(sessionKey)
    const session = saved ? (JSON.parse(saved) as CheckoutSession) : null

    return session && session.expiresAt > Date.now() ? session : null
  } catch {
    return null
  }
}

function readAccounts(): DemoAccount[] {
  const saved = localStorage.getItem(accountsKey)
  return saved ? (JSON.parse(saved) as DemoAccount[]) : []
}

function errorResponse(message: string, status: number) {
  return HttpResponse.json({ message }, { status })
}

function startSession(email: string) {
  const session: CheckoutSession = {
    email,
    token: crypto.randomUUID(),
    expiresAt: Date.now() + 30 * 60 * 1000,
  }

  sessionStorage.setItem(sessionKey, JSON.stringify(session))
  return HttpResponse.json({ session })
}

async function hashPassword(password: string, salt: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    key,
    256,
  )

  return Array.from(new Uint8Array(bits), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null)
  return body && typeof body === 'object'
    ? (body as Record<string, unknown>)
    : {}
}

function readText(body: Record<string, unknown>, key: string) {
  const value = body[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readDetails(body: Record<string, unknown>): CheckoutDetails | null {
  const name = readText(body, 'name')
  const username = readText(body, 'username')
  const profileName = readText(body, 'profileName')
  const email = readText(body, 'email')
  const address = readText(body, 'address')
  const referralCode = readText(body, 'referralCode')
  const ensName = readText(body, 'ensName')
  const secondaryWallet = readText(body, 'secondaryWallet')
  const note = readText(body, 'note')
  const walletType = readText(body, 'walletType')
  const useOtherWallet = body.useOtherWallet === true
  const wallet = wallets.find((option) => option === body.wallet)
  const network = networks.find((option) => option === body.network)

  if (
    name.length < 2 || name.length > 80 ||
    !usernamePattern.test(username) ||
    !profileName || profileName.length > 80 ||
    !emailPattern.test(email) || email.length > 120 ||
    !referralCode || referralCode.length > 32 ||
    !/^[a-zA-Z0-9-]{1,63}\.eth$/.test(ensName) ||
    secondaryWallet.length > 120 || (useOtherWallet && !secondaryWallet) ||
    note.length > 500 || !wallet || !network ||
    (walletType !== 'Extensão' &&
      walletType !== 'Aplicativo móvel' &&
      walletType !== 'Carteira física')
  ) {
    return null
  }

  const validAddress = network === 'Solana'
    ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
    : /^0x[a-fA-F0-9]{40}$/.test(address)

  if (!validAddress) return null

  return {
    name,
    username,
    profileName,
    email,
    address,
    walletType,
    referralCode,
    ensName,
    secondaryWallet,
    useOtherWallet,
    note,
    wallet,
    network,
  }
}

export function createCheckoutHandlers(cart: CheckoutCart) {
  return [
    http.get('/api/checkout/session', () =>
      HttpResponse.json({ session: readSession() }),
    ),

    http.post('/api/checkout/session', async ({ request }) => {
      const body = await readBody(request)
      const email = readText(body, 'email').toLowerCase()
      const password = typeof body.password === 'string' ? body.password : ''

      if (demoEmails.includes(email) && password === 'KurioDemo123') {
        return startSession(email)
      }

      try {
        const account = readAccounts().find((item) => item.email === email)

        if (account && password.length <= 128) {
          const passwordHash = await hashPassword(password, account.salt)
          if (passwordHash === account.passwordHash) return startSession(email)
        }
      } catch {
        return errorResponse('Não foi possível acessar a conta de demonstração.', 500)
      }

      return errorResponse('E-mail ou senha incorretos.', 401)
    }),

    http.post('/api/checkout/register', async ({ request }) => {
      const body = await readBody(request)
      const username = readText(body, 'username')
      const email = readText(body, 'email').toLowerCase()
      const password = typeof body.password === 'string' ? body.password : ''

      if (!usernamePattern.test(username)) {
        return errorResponse(
          'Use de 2 a 32 letras, números, pontos, hífens ou sublinhados no nome de usuário.',
          400,
        )
      }

      if (!emailPattern.test(email) || email.length > 120) {
        return errorResponse('Informe um e-mail válido.', 400)
      }

      if (
        password.length < 8 ||
        password.length > 128 ||
        password !== body.confirmPassword
      ) {
        return errorResponse('Use entre 8 e 128 caracteres e confirme a mesma senha.', 400)
      }

      try {
        const salt = crypto.randomUUID()
        const passwordHash = await hashPassword(password, salt)
        const accounts = readAccounts()

        if (demoEmails.includes(email) || accounts.some((item) => item.email === email)) {
          return errorResponse('Já existe uma conta com esse e-mail.', 409)
        }

        if (accounts.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
          return errorResponse('Esse nome de usuário já está em uso.', 409)
        }

        localStorage.setItem(accountsKey, JSON.stringify([
          ...accounts,
          { username, email, salt, passwordHash },
        ]))

        return startSession(email)
      } catch {
        return errorResponse('Não foi possível salvar a conta de demonstração.', 500)
      }
    }),

    http.delete('/api/checkout/session', () => {
      sessionStorage.removeItem(sessionKey)
      return HttpResponse.json({ session: null })
    }),

    http.post('/api/checkout/orders', async ({ request }) => {
      const body = await readBody(request)
      const session = readSession()

      if (!session || request.headers.get('Authorization') !== `Bearer ${session.token}`) {
        return errorResponse('Sua sessão expirou. Entre novamente.', 401)
      }

      const key = request.headers.get('Idempotency-Key')
      const details = readDetails(body)
      const quote = body.quote

      if (!key || key.length > 80 || !details || typeof quote !== 'string') {
        return errorResponse(
          'Confira os dados do colecionador e o endereço da rede escolhida.',
          400,
        )
      }

      const input = JSON.stringify({ ...details, quote })
      const existing = cart.findOrder(session.email, key)

      if (existing) {
        return existing.input === input
          ? HttpResponse.json(existing.receipt)
          : errorResponse('Esta tentativa já foi usada com outros dados.', 409)
      }

      const snapshot = cart.read()

      if (
        !snapshot.items.length ||
        snapshot.items.some((item) => item.quantity > item.quantityLimit) ||
        JSON.stringify(snapshot) !== quote
      ) {
        return errorResponse(
          'O carrinho mudou. Confira os valores e revise o pedido novamente.',
          409,
        )
      }

      const receipt: Receipt = {
        ...details,
        id: crypto.randomUUID(),
        status: 'confirmed',
        cart: snapshot,
      }

      try {
        cart.confirm({ key, email: session.email, input, receipt })
      } catch {
        return errorResponse('Não foi possível salvar o pedido simulado. Tente novamente.', 500)
      }

      if (sessionStorage.getItem(checkoutScenarioKey) === 'timeout-after-confirm') {
        sessionStorage.removeItem(checkoutScenarioKey)
        await delay(9_000)
      }

      return HttpResponse.json(receipt, { status: 201 })
    }),
  ]
}