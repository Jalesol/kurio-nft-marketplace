import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import type { ComponentProps, FormEvent } from 'react'
import ReceiptEnvelope from '@/components/layout/ReceiptEnvelope'
import SiteFooter from '@/components/layout/SiteFooter'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { CartSnapshot } from '@/features/cart/types'
import { useCart } from '@/features/cart/useCart'
import type { CheckoutDetails, CheckoutSession, Receipt } from '@/mocks/checkoutHandlers'
import { api } from '@/services/api'
import { cartErrorMessage } from '@/services/cartApi'

const sessionKey = ['checkout-session'] as const
const formId = 'checkout-profile'
const orderHashPrefix = 'pedido-'

const wallets = ['WalletConnect', 'MetaMask', 'Coinbase Wallet'] as const
const networks = ['Ethereum', 'Polygon', 'Solana'] as const
const walletTypes = ['Extensão', 'Aplicativo móvel', 'Carteira física'] as const

const fieldClass =
  'mt-1 block w-full min-w-0 rounded-sm border border-[#5b3b26] bg-transparent px-3 py-2 text-sm text-[#f5eee8] placeholder:text-[#bfa084] focus-visible:outline-2 focus-visible:outline-[#efae75]'
const primaryClass = 'bg-[#d88e4f] font-bold text-[#160f0b] hover:bg-[#eda66a]'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

interface Attempt {
  key: string
  details: CheckoutDetails
  cart: CartSnapshot
}

function dateKey(id: string) {
  return `kurio:receipt-date:${id}`
}

function rememberDate(id: string) {
  try {
    if (!localStorage.getItem(dateKey(id))) {
      localStorage.setItem(dateKey(id), new Date().toISOString())
    }
  } catch {
    // O pedido continua consultável se o navegador bloquear o armazenamento.
  }
}

function readDate(id: string) {
  try {
    const value = localStorage.getItem(dateKey(id))
    if (!value) return null

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

function Field({ label, ...props }: ComponentProps<'input'> & { label: string }) {
  return (
    <label className="block min-w-0 text-xs">
      {label}
      {props.required && <span aria-hidden="true" className="text-[#efae75]"> *</span>}
      <input {...props} className={fieldClass} />
    </label>
  )
}

function SelectField({
  label, name, options, placeholder, value,
}: {
  label: string
  name: string
  options: readonly string[]
  placeholder: string
  value?: string
}) {
  return (
    <label className="block min-w-0 text-xs">
      {label} <span aria-hidden="true" className="text-[#efae75]">*</span>
      <select name={name} required defaultValue={value ?? ''} className={fieldClass}>
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

function tokenLabel(id: string, edition: string) {
  const token = id.match(/\d+$/)?.[0]?.padStart(4, '0')
  return token ? `ID do token: #${token}` : `Edição ${edition}`
}

function Totals({ cart, compact = false }: { cart: CartSnapshot; compact?: boolean }) {
  return (
    <dl className="mt-3 space-y-2">
      {!compact && (
        <div className="flex justify-between gap-2">
          <dt>Subtotal</dt><dd>{cart.subtotalEth} ETH</dd>
        </div>
      )}
      {(!compact || cart.couponCode) && (
        <div className="flex justify-between gap-2">
          <dt>Desconto do lançamento</dt><dd>− {cart.discountEth} ETH</dd>
        </div>
      )}
      <div className="flex justify-between gap-2">
        <dt>Taxa de rede</dt>
        <dd className="text-right">
          {cart.networkFeeEth} ETH
          {!compact && <span className="block text-[11px] text-[#efae75]">Taxa estimada</span>}
        </dd>
      </div>
      <div className="flex justify-between gap-2 border-t border-[#5b3b26] pt-2 text-sm font-bold">
        <dt>Total</dt><dd className="text-[#efae75]">{cart.totalEth} ETH</dd>
      </div>
    </dl>
  )
}

function OrderSummary({ cart, showCoupon }: { cart: CartSnapshot; showCoupon: boolean }) {
  return (
    <section aria-labelledby="checkout-items-title" className="min-w-0 text-xs">
      <h2 id="checkout-items-title" className="text-sm font-bold">Seus NFTs</h2>
      <div className="mt-2 flex justify-between border-b border-[#5b3b26] pb-2 font-bold">
        <span>NFTs</span><span>Subtotal</span>
      </div>

      <ul className="mt-2 space-y-2">
        {cart.items.map((item) => (
          <li
            key={`${item.nftId}:${item.editionId}`}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 bg-[#241711] p-1"
          >
            <img src={item.imageUrl} alt="" className="size-12 rounded object-cover" />
            <div className="min-w-0">
              <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="font-bold hover:underline">
                {item.name}
              </Link>
              <p className="mt-1 text-[#ceb08d]">
                {tokenLabel(item.nftId, item.editionLabel)} · × {item.quantity}
              </p>
            </div>
            <strong className="whitespace-nowrap text-[#efae75]">{item.lineSubtotalEth} ETH</strong>
          </li>
        ))}
      </ul>

      {showCoupon && (
        <p className="my-3 text-center">
          {cart.couponCode ? `Cupom ${cart.couponCode} aplicado. ` : 'Tem um código promocional? '}
          <Link to="/cart" hash="cart-coupon" className="text-[#efae75] underline">
            {cart.couponCode ? 'Alterar cupom' : 'Aplique aqui'}
          </Link>
        </p>
      )}
      <Totals cart={cart} />
    </section>
  )
}

function ReceiptDialog({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  const [date] = useState(() => readDate(receipt.id))
  const shortId = `${receipt.id.slice(0, 8)}…${receipt.id.slice(-4)}`
  const columns = 'grid grid-cols-[minmax(0,1fr)_4rem_minmax(4.5rem,auto)] items-center gap-2 sm:gap-5'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="block max-h-[90dvh] gap-0 overflow-y-auto rounded-none border-0 border-b-8 border-[#d88e4f] bg-[#241711] p-0 font-mono text-[#f5eee8] sm:max-w-[42rem]">
        <header className="px-5 pt-8 pb-5 text-center">
          <ReceiptEnvelope className="mx-auto mb-4 h-[76px] w-[68px] text-[#d88e4f]" />
          <DialogTitle className="text-base font-bold text-[#e4bd94] sm:text-lg">
            Seus NFTs agora estão na sua carteira
          </DialogTitle>
          <DialogDescription className="sr-only">
            Comprovante da compra confirmada na simulação da Kurio.
          </DialogDescription>
        </header>

        <dl className="grid grid-cols-2 gap-3 border-y border-[#a56c3d] px-4 py-4 text-xs text-[#e4bd94] sm:grid-cols-4 sm:px-6">
          <div className="min-w-0 sm:border-r sm:border-[#80532f]">
            <dt className="font-bold">ID da transação</dt>
            <dd title={receipt.id}>
              <span aria-hidden="true">{shortId}</span>
              <span className="sr-only">{receipt.id}</span>
            </dd>
          </div>
          <div className="sm:border-r sm:border-[#80532f]">
            <dt>Data</dt>
            <dd>{date ? <time dateTime={date.toISOString()}>{dateFormatter.format(date)}</time> : 'Indisponível'}</dd>
          </div>
          <div className="sm:border-r sm:border-[#80532f]">
            <dt>Total</dt><dd>{receipt.cart.totalEth} ETH</dd>
          </div>
          <div>
            <dt className="font-bold">Carteira</dt><dd>{receipt.wallet}</dd>
          </div>
        </dl>

        <section aria-labelledby="receipt-details" className="px-4 pt-5 pb-8 text-xs sm:px-8 sm:text-sm">
          <h2 id="receipt-details" className="mb-3 font-bold">Detalhes da transação</h2>
          <div aria-hidden="true" className={`${columns} border-b border-[#5b3b26] pb-2 font-bold`}>
            <span>NFTs</span><span className="text-center">Edições</span><span className="text-right">Subtotal</span>
          </div>

          <ul className="mt-3 space-y-3">
            {receipt.cart.items.map((item) => (
              <li key={`${item.nftId}:${item.editionId}`} className={columns}>
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <img src={item.imageUrl} alt="" className="size-9 shrink-0 rounded-md object-cover sm:size-16" />
                  <div className="min-w-0">
                    <p className="font-bold">{item.name}</p>
                    <p className="mt-1 text-[10px] text-[#ceb08d] sm:text-xs">{tokenLabel(item.nftId, item.editionLabel)}</p>
                  </div>
                </div>
                <span className="text-center text-[#ceb08d]">
                  <span className="sr-only">Quantidade </span>× {item.quantity}
                </span>
                <strong className="text-right text-[#efae75]">{item.lineSubtotalEth} ETH</strong>
              </li>
            ))}
          </ul>

          <div className="mt-4 sm:ml-auto sm:w-2/3">
            <Totals cart={receipt.cart} compact />
          </div>

          <p className="mt-4 border-t border-[#5b3b26] pt-4 text-center leading-relaxed text-[#ceb08d]">
            Transação confirmada na simulação da rede {receipt.network}. Os itens deste pedido foram registrados para a carteira selecionada.
          </p>

          <details className="mt-5 text-center">
            <summary className={`inline-block cursor-pointer list-none rounded-md px-4 py-3 [&::-webkit-details-marker]:hidden ${primaryClass}`}>
              Ver no Etherscan
            </summary>
            <div className="mt-3 space-y-2 rounded border border-[#5b3b26] p-3 text-left">
              <p><strong>Comprador</strong> · {receipt.name}</p>
              <p className="break-all"><strong>ID completo</strong> · {receipt.id}</p>
              <p className="break-all"><strong>Endereço informado</strong> · {receipt.address}</p>
              <p><strong>Rede</strong> · {receipt.network}</p>
            </div>
          </details>
        </section>
      </DialogContent>
    </Dialog>
  )
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const hash = useLocation({ select: (location) => location.hash })
  const orderId = hash.startsWith(orderHashPrefix) ? hash.slice(orderHashPrefix.length) : ''
  const cart = useCart()
  const [attempt, setAttempt] = useState<Attempt>()
  const [draft, setDraft] = useState<CheckoutDetails>()
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const [formError, setFormError] = useState('')

  const session = useQuery({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ session: CheckoutSession | null }>('/checkout/session', { signal })
      if (!data || typeof data !== 'object' || !('session' in data)) {
        throw new Error('A API de sessão está indisponível.')
      }
      return data.session
    },
    retry: false,
  })

  const token = session.data?.token
  const recoveredOrder = useQuery({
    queryKey: ['checkout-receipt', token, orderId],
    enabled: Boolean(token && orderId),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ orders: Receipt[] }>('/account', {
        signal,
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!Array.isArray(data?.orders)) {
        throw new Error('Não foi possível consultar o histórico de compras.')
      }

      return data.orders.find((item) => item.id === orderId && item.status === 'confirmed') ?? null
    },
    retry: false,
  })

  const login = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await api.post<{ session: CheckoutSession }>('/checkout/session', credentials)
      if (!data?.session?.token) throw new Error('A API de login está indisponível.')
      return data.session
    },
    onSuccess: async (activeSession) => {
      await queryClient.cancelQueries({ queryKey: sessionKey })
      queryClient.setQueryData(sessionKey, activeSession)
    },
  })

  const order = useMutation({
    mutationFn: async ({ pending, sessionToken }: { pending: Attempt; sessionToken: string }) => {
      const { data } = await api.post<Receipt>(
        '/checkout/orders',
        { ...pending.details, quote: JSON.stringify(pending.cart) },
        { headers: { Authorization: `Bearer ${sessionToken}`, 'Idempotency-Key': pending.key } },
      )

      if (data?.status !== 'confirmed' || !data.id || !Array.isArray(data.cart?.items)) {
        throw new Error('A API não retornou um pedido confirmado.')
      }
      return data
    },
    onSuccess: async (receipt, { sessionToken }) => {
      rememberDate(receipt.id)
      queryClient.setQueryData(['checkout-receipt', sessionToken, receipt.id], receipt)
      await navigate({ to: '/checkout', hash: `${orderHashPrefix}${receipt.id}`, replace: true })
      setAttempt(undefined)
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: async (error) => {
      if (!isAxiosError(error)) return

      if (error.response?.status === 401) {
        await queryClient.cancelQueries({ queryKey: sessionKey })
        queryClient.setQueryData(sessionKey, null)
      }

      if (error.response?.status === 409) {
        setAttempt(undefined)
        await cart.refetch()
      }
    },
  })

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.isPending) return

    const data = new FormData(event.currentTarget)
    login.mutate({
      email: String(data.get('email') ?? '').trim().toLowerCase(),
      password: String(data.get('password') ?? ''),
    })
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cart.data?.items.length) return

    const data = new FormData(event.currentTarget)
    const read = (key: string) => String(data.get(key) ?? '').trim()
    const name = read('name')
    const profileName = read('profileName')
    const referralCode = read('referralCode')
    const address = read('address')
    const secondaryWallet = read('secondaryWallet')
    const wallet = wallets.find((option) => option === read('wallet'))
    const network = networks.find((option) => option === read('network'))
    const walletType = walletTypes.find((option) => option === read('walletType'))

    if (
      name.length < 2 || !profileName || !referralCode ||
      (useOtherWallet && !secondaryWallet) || !wallet || !network || !walletType
    ) {
      setFormError('Confira os campos obrigatórios e selecione a carteira e a rede.')
      return
    }

    const validAddress = network === 'Solana'
      ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
      : /^0x[a-fA-F0-9]{40}$/.test(address)

    if (!validAddress) {
      setFormError(`Informe um endereço de carteira válido para ${network}.`)
      return
    }

    const details: CheckoutDetails = {
      name, profileName, referralCode, address, secondaryWallet, wallet, network,
      walletType, useOtherWallet,
      username: read('username'),
      email: read('email'),
      ensName: `${read('ensName')}.eth`,
      note: read('note'),
    }

    setFormError('')
    setDraft(details)
    order.reset()
    setAttempt({ key: crypto.randomUUID(), details, cart: cart.data })
  }

  if (orderId && token && recoveredOrder.data) {
    return (
      <main className="min-h-[80vh] bg-[#160f0b]">
        <ReceiptDialog
          key={recoveredOrder.data.id}
          receipt={recoveredOrder.data}
          onClose={() => void navigate({ to: '/', search: {}, hash: 'mercado', replace: true })}
        />
      </main>
    )
  }

  const visibleCart = attempt?.cart ?? cart.data
  const ready = cart.isSuccess && session.isSuccess
  const needsLogin = session.isSuccess && !token && Boolean(orderId || visibleCart?.items.length)
  const canEdit = !orderId && ready && Boolean(token && cart.data?.items.length) && !attempt
  const showSummary = !orderId && visibleCart && visibleCart.items.length > 0

  return (
    <>
      <main className="bg-[#160f0b] font-mono text-[#f5eee8]">
        <div className="mx-auto max-w-[1200px] px-5 pt-6 pb-16 sm:px-8 md:pb-20 lg:px-12">
          <nav aria-label="Localização na página" className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold">
            <Link to="/" search={{}} className="hover:underline">Início</Link>
            <span aria-hidden="true">/</span>
            <Link to="/nfts/$nftId" params={{ nftId: 'emerald-ape-042' }} className="hover:underline">Mercado</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Pagamento</span>
          </nav>

          <h1 className="sr-only">Pagamento</h1>

          <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4 text-sm">
              {(session.isPending || (!orderId && cart.isPending) || (orderId && token && recoveredOrder.isPending)) && (
                <p role="status">{orderId ? 'Carregando comprovante…' : 'Carregando pagamento…'}</p>
              )}

              {(session.isError || (!orderId && cart.isError) || (orderId && token && recoveredOrder.isError)) && (
                <div className="space-y-2">
                  <p role="alert">{cartErrorMessage(session.error ?? (orderId ? recoveredOrder.error : cart.error))}</p>
                  <Button type="button" onClick={() => {
                    void session.refetch()
                    if (orderId && token) void recoveredOrder.refetch()
                    if (!orderId) void cart.refetch()
                  }}>
                    Tentar novamente
                  </Button>
                </div>
              )}

              {orderId && token && recoveredOrder.isSuccess && !recoveredOrder.data && (
                <p role="alert">Pedido não encontrado no histórico desta conta.</p>
              )}

              {order.isError && (
                <p role="alert" className="text-[#efae75]">{cartErrorMessage(order.error)}</p>
              )}

              {needsLogin ? (
                <form onSubmit={signIn} className="max-w-md space-y-4">
                  <h2 className="font-bold">{orderId ? 'Entre para ver seu comprovante' : 'Entre para finalizar'}</h2>
                  <Field label="E-mail" name="email" type="email" required autoComplete="username" />
                  <Field label="Senha" name="password" type="password" required autoComplete="current-password" />
                  {login.isError && <p role="alert">{cartErrorMessage(login.error)}</p>}
                  <Button type="submit" disabled={login.isPending} className={primaryClass}>
                    {login.isPending ? 'Entrando…' : 'Entrar'}
                  </Button>
                </form>
              ) : !orderId && ready && !visibleCart?.items.length ? (
                <p>Seu carrinho está vazio. <Link to="/cart" className="text-[#efae75] underline">Voltar ao carrinho</Link></p>
              ) : !orderId && ready && attempt && token ? (
                <section aria-label="Revisão do pedido" className="space-y-3">
                  <h2 className="font-bold">Revise seu pedido</h2>
                  <p>{attempt.details.name} · {attempt.details.wallet} · {attempt.details.network}</p>
                  <p className="break-all text-[#ceb08d]">{attempt.details.address}</p>
                  <p className="text-[#ceb08d]">A conexão e o pagamento são simulados.</p>
                  <Button type="button" variant="outline" disabled={order.isPending} onClick={() => {
                    setAttempt(undefined)
                    order.reset()
                  }}>
                    Editar dados
                  </Button>
                </section>
              ) : canEdit ? (
                <form id={formId} onSubmit={review}>
                  <h2 className="mb-3 text-sm font-bold">Perfil do colecionador</h2>
                  <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                    <Field label="Nome de exibição" name="name" required minLength={2} maxLength={80} defaultValue={draft?.name} autoComplete="section-collector name" />
                    <Field label="Nome de usuário" name="username" required minLength={2} maxLength={32} pattern={'[a-zA-Z0-9_.\\-]{2,32}'} defaultValue={draft?.username} autoComplete="off" />
                    <SelectField label="Rede" name="network" options={networks} placeholder="Selecione uma rede" value={draft?.network} />
                    <Field label="Nome do perfil" name="profileName" required maxLength={80} defaultValue={draft?.profileName} autoComplete="off" />
                    <Field label="Endereço da carteira" name="address" required maxLength={44} placeholder="Endereço da carteira" defaultValue={draft?.address} autoComplete="off" />
                    <Field
                      label={useOtherWallet ? 'ENS ou carteira secundária' : 'ENS ou carteira secundária (opcional)'}
                      name="secondaryWallet" required={useOtherWallet} maxLength={120}
                      placeholder="ENS ou carteira secundária" defaultValue={draft?.secondaryWallet}
                    />
                    <SelectField label="Tipo de carteira" name="walletType" options={walletTypes} placeholder="Selecione um tipo de carteira" value={draft?.walletType} />
                    <Field label="Código de indicação" name="referralCode" required maxLength={32} defaultValue={draft?.referralCode} />
                    <Field label="E-mail" name="email" type="email" required maxLength={120} defaultValue={draft?.email ?? session.data?.email} autoComplete="section-collector email" />

                    <div className="min-w-0 text-xs">
                      <label htmlFor="checkout-ens">Nome ENS <span aria-hidden="true" className="text-[#efae75]">*</span></label>
                      <div className="flex gap-2">
                        <select aria-label="Sufixo ENS" className={`${fieldClass} !w-auto`} defaultValue=".eth">
                          <option>.eth</option>
                        </select>
                        <input
                          id="checkout-ens" name="ensName" required maxLength={63}
                          pattern={'[a-zA-Z0-9\\-]{1,63}'}
                          defaultValue={draft?.ensName.replace(/\.eth$/, '')}
                          className={fieldClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 sm:col-span-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox" checked={useOtherWallet}
                          onChange={(event) => setUseOtherWallet(event.currentTarget.checked)}
                          className="accent-[#d88e4f]"
                        />
                        Usar outra carteira?
                      </label>
                      <label className="block text-xs sm:w-[calc(50%-0.625rem)]">
                        Observação do colecionador (opcional)
                        <textarea name="note" rows={5} maxLength={500} defaultValue={draft?.note} className={`${fieldClass} resize-y`} />
                      </label>
                    </div>
                  </div>

                  {formError && <p role="alert" className="mt-4 text-[#efae75]">{formError}</p>}
                </form>
              ) : null}
            </div>

            {showSummary && (
              <aside aria-label="Resumo do pagamento" className="min-w-0">
                <OrderSummary cart={visibleCart} showCoupon={!attempt} />

                {canEdit && (
                  <>
                    <fieldset className="mt-3 space-y-2">
                      <legend className="mb-2 w-full text-center text-sm font-bold">Carteira e rede</legend>
                      {wallets.map((wallet) => (
                        <label key={wallet} className="flex cursor-pointer items-center gap-2 rounded-sm border border-[#5b3b26] px-3 py-2 text-xs has-checked:border-[#d88e4f]">
                          <input
                            type="radio" form={formId} name="wallet" value={wallet} required
                            defaultChecked={draft?.wallet === wallet}
                            className="accent-[#d88e4f]"
                          />
                          {wallet}
                        </label>
                      ))}
                    </fieldset>
                    <Button type="submit" form={formId} className={`mt-4 w-full ${primaryClass}`}>
                      Confirmar compra
                    </Button>
                  </>
                )}

                {ready && token && attempt && (
                  <Button
                    type="button"
                    disabled={order.isPending}
                    className={`mt-4 w-full ${primaryClass}`}
                    onClick={() => {
                      if (!order.isPending) order.mutate({ pending: attempt, sessionToken: token })
                    }}
                  >
                    {order.isPending ? 'Confirmando…' : 'Confirmar pedido'}
                  </Button>
                )}
              </aside>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}