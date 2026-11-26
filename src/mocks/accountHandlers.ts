import { delay, http, HttpResponse } from 'msw'
import type { CheckoutSession, SavedOrder } from './checkoutHandlers'

interface AccountProfile {
  name: string
  username: string
  email: string
  ens: string
  walletLabel: string
  avatar: string
}

interface Wallet {
  label: string
  address: string
  network: string
  provider: string
}

interface DemoAccount {
  username: string
  email: string
  salt: string
  passwordHash: string
}

interface AccountData {
  favoriteIds?: string[]
  profile?: AccountProfile
  primary?: Wallet
  secondary?: Wallet
}

const accountsKey = 'kurio:demo-accounts:v1'
const sessionKey = 'kurio:checkout-session'
const demoEmails = ['colecionador@kurio.test', 'visitante@kurio.test']
const demoPassword = 'KurioDemo123'

function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T ?? fallback
  } catch {
    return fallback
  }
}

function errorResponse(message: string, status = 400) {
  return HttpResponse.json({ message }, { status })
}

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

function accountKey(email: string) {
  return `kurio:account-details:v1:${email}`
}

function readAccount(email: string) {
  return readStored<AccountData>(accountKey(email), {})
}

function writeAccount(email: string, data: AccountData) {
  localStorage.setItem(accountKey(email), JSON.stringify(data))
}

function profileFor(email: string): AccountProfile {
  const account = readStored<DemoAccount[]>(accountsKey, [])
    .find((item) => item.email === email)

  return readAccount(email).profile ?? {
    name: '',
    username: account?.username ?? email.split('@')[0] ?? '',
    email,
    ens: '',
    walletLabel: '',
    avatar: '',
  }
}

async function readBody(request: Request) {
  const value: unknown = await request.json().catch(() => null)
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
}

function readText(body: Record<string, unknown>, key: string) {
  const value = body[key]
  return typeof value === 'string' ? value.trim() : ''
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

  return Array.from(
    new Uint8Array(bits),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')
}

async function passwordMatches(email: string, password: string) {
  const account = readStored<DemoAccount[]>(accountsKey, [])
    .find((item) => item.email === email)

  if (account) {
    return await hashPassword(password, account.salt) === account.passwordHash
  }

  return demoEmails.includes(email) && password === demoPassword
}

async function updatePassword(
  email: string,
  username: string,
  body: Record<string, unknown>,
) {
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const next = typeof body.newPassword === 'string' ? body.newPassword : ''
  const confirmation = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

  if (!current && !next && !confirmation) return null

  if (
    !current ||
    current.length > 128 ||
    next.length < 8 ||
    next.length > 128 ||
    next !== confirmation
  ) {
    return errorResponse('Informe a senha atual e confirme uma nova senha de 8 a 128 caracteres.')
  }

  if (!(await passwordMatches(email, current))) {
    return errorResponse('A senha atual está incorreta.')
  }

  const salt = crypto.randomUUID()
  const passwordHash = await hashPassword(next, salt)
  const accounts = readStored<DemoAccount[]>(accountsKey, [])

  localStorage.setItem(accountsKey, JSON.stringify([
    ...accounts.filter((account) => account.email !== email),
    { email, username, salt, passwordHash },
  ]))

  return null
}

function readWallet(body: Record<string, unknown>): Wallet | null {
  const label = readText(body, 'label')
  const address = readText(body, 'address')
  const network = readText(body, 'network')
  const provider = readText(body, 'provider')

  if (
    !label ||
    label.length > 60 ||
    !['Ethereum', 'Polygon', 'Solana'].includes(network) ||
    !['MetaMask', 'WalletConnect', 'Coinbase Wallet'].includes(provider)
  ) {
    return null
  }

  const validAddress = network === 'Solana'
    ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
    : /^0x[a-fA-F0-9]{40}$/.test(address)

  return validAddress ? { label, address, network, provider } : null
}

const favoriteFailureKey = 'kurio:fail-next-favorite'

async function updateFavorite(request: Request, nftId: string, saved: boolean) {
  const initialSession = authorizedSession(request)
  if (!initialSession) return errorResponse('Entre para acessar seus favoritos.', 401)
  if (!/^[a-z0-9-]+$/.test(nftId)) return errorResponse('Identificador de NFT inválido.')

  await delay(450)

  const session = authorizedSession(request)
  if (!session || session.token !== initialSession.token) {
    return errorResponse('Sua sessão expirou. Entre novamente.', 401)
  }

  if (sessionStorage.getItem(favoriteFailureKey) === '1') {
    sessionStorage.removeItem(favoriteFailureKey)
    return errorResponse('Não foi possível atualizar seus favoritos. Tente novamente.', 503)
  }

  const account = readAccount(session.email)
  const current = account.favoriteIds ?? []
  const ids = saved ? [...new Set([...current, nftId])] : current.filter((id) => id !== nftId)
  writeAccount(session.email, { ...account, favoriteIds: ids })
  return HttpResponse.json({ ids })
}

export const accountHandlers = [
  http.get('/api/account/favorites', ({ request }) => {
    const session = authorizedSession(request)
    if (!session) return errorResponse('Entre para acessar seus favoritos.', 401)

    return HttpResponse.json({ ids: readAccount(session.email).favoriteIds ?? [] })
  }),

  http.put('/api/account/favorites/:nftId', ({ request, params }) =>
    updateFavorite(request, String(params.nftId ?? ''), true),
  ),

  http.delete('/api/account/favorites/:nftId', ({ request, params }) =>
    updateFavorite(request, String(params.nftId ?? ''), false),
  ),

  // Esta regra vem antes do login atual para respeitar a troca de senha
  // das duas contas que já vêm prontas na demonstração.
  http.post('/api/checkout/session', async ({ request }) => {
    const body = await readBody(request.clone())
    const email = readText(body, 'email').toLowerCase()
    const account = readStored<DemoAccount[]>(accountsKey, [])
      .find((item) => item.email === email)

    if (!demoEmails.includes(email) || !account) return

    const password = typeof body.password === 'string' ? body.password : ''

    if (!password || password.length > 128 || !(await passwordMatches(email, password))) {
      return errorResponse('E-mail ou senha incorretos.', 401)
    }

    const session: CheckoutSession = {
      email,
      token: crypto.randomUUID(),
      expiresAt: Date.now() + 30 * 60 * 1000,
    }

    sessionStorage.setItem(sessionKey, JSON.stringify(session))
    return HttpResponse.json({ session })
  }),

  http.get('/api/account', ({ request }) => {
    const session = authorizedSession(request)
    if (!session) return errorResponse('Entre para acessar seu perfil.', 401)

    const account = readAccount(session.email)
    const cart = readStored<{ orders?: SavedOrder[] }>('kurio:guest-cart:v1', {})

    const orders = (cart.orders ?? [])
      .filter((order) => order.email === session.email)
      .map(({ receipt }) => receipt)
      .reverse()

    return HttpResponse.json({
      profile: profileFor(session.email),
      primary: account.primary ?? null,
      secondary: account.secondary ?? null,
      orders,
    })
  }),

  http.put('/api/account/profile', async ({ request }) => {
    const body = await readBody(request)
    const session = authorizedSession(request)
    if (!session) return errorResponse('Sua sessão expirou. Entre novamente.', 401)

    const profile: AccountProfile = {
      name: readText(body, 'name'),
      username: readText(body, 'username'),
      email: readText(body, 'email').toLowerCase(),
      ens: readText(body, 'ens'),
      walletLabel: readText(body, 'walletLabel'),
      avatar: readText(body, 'avatar'),
    }

    if (
      profile.name.length < 2 ||
      profile.name.length > 80 ||
      !/^[a-zA-Z0-9_.-]{2,32}$/.test(profile.username) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ||
      profile.email.length > 120 ||
      !/^[a-zA-Z0-9-]{1,63}$/.test(profile.ens) ||
      !profile.walletLabel ||
      profile.walletLabel.length > 60
    ) {
      return errorResponse('Confira o nome, o usuário, o e-mail, o ENS e o apelido da carteira.')
    }

    if (
      profile.avatar.length > 750_000 ||
      (profile.avatar && !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(profile.avatar))
    ) {
      return errorResponse('Use um avatar PNG, JPG ou WebP de até 500 KB.')
    }

    const passwordError = await updatePassword(session.email, profile.username, body)
    if (passwordError) return passwordError

    writeAccount(session.email, { ...readAccount(session.email), profile })
    return HttpResponse.json({ profile })
  }),

  http.put('/api/account/wallets/:slot', async ({ request, params }) => {
    const body = await readBody(request)
    const session = authorizedSession(request)
    if (!session) return errorResponse('Sua sessão expirou. Entre novamente.', 401)

    const slot = params.slot
    if (slot !== 'primary' && slot !== 'secondary') {
      return errorResponse('Carteira não encontrada.', 404)
    }

    const wallet = readWallet(body)
    if (!wallet) return errorResponse('Confira o apelido, a rede, a carteira e o endereço.')

    writeAccount(session.email, { ...readAccount(session.email), [slot]: wallet })
    return HttpResponse.json({ wallet })
  }),
]