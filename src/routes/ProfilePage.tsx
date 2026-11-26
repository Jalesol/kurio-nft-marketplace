import FavoritesPanel from '@/features/favorites/FavoritesPanel'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { Camera, Heart, LogOut, ShoppingBag, UserRound, Wallet } from 'lucide-react'
import { useState } from 'react'
import type { ComponentProps, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { CheckoutSession, Receipt } from '@/mocks/checkoutHandlers'
import { api } from '@/services/api'
import { cartErrorMessage } from '@/services/cartApi'

const profileRoute = getRouteApi('/profile')
const sessionKey = ['checkout-session'] as const
const primaryClass = 'bg-[#d88e4f] font-bold text-[#160f0b] hover:bg-[#eda66a]'
const fieldClass =
  'mt-1 block w-full min-w-0 rounded-sm border border-[#5b3b26] bg-[#160f0b] px-3 py-2 text-sm text-[#f5eee8] focus-visible:outline-2 focus-visible:outline-[#efae75]'

const sections = [
  { id: 'profile', label: 'Dados do perfil', icon: UserRound },
  { id: 'wallets', label: 'Carteiras', icon: Wallet },
  { id: 'orders', label: 'Compras', icon: ShoppingBag },
] as const

interface Profile {
  name: string
  username: string
  email: string
  ens: string
  walletLabel: string
  avatar: string
}

interface SavedWallet {
  label: string
  address: string
  network: string
  provider: string
}

interface AccountResponse {
  profile: Profile
  primary: SavedWallet | null
  secondary: SavedWallet | null
  orders: Receipt[]
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

function ProfileForm({
  profile,
  save,
  pending,
}: {
  profile: Profile
  save: (values: Record<string, string>) => Promise<void>
  pending: boolean
}) {
  const [avatar, setAvatar] = useState(profile.avatar)
  const [avatarPending, setAvatarPending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [failed, setFailed] = useState(false)

  function selectAvatar(file: File | undefined) {
    if (!file) return

    setFeedback('')
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 500 * 1024
    ) {
      setFailed(true)
      setFeedback('Escolha um PNG, JPG ou WebP de até 500 KB.')
      return
    }

    const reader = new FileReader()
    setAvatarPending(true)

    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatar(reader.result)
    }
    reader.onerror = () => {
      setFailed(true)
      setFeedback('Não foi possível carregar a imagem.')
    }
    reader.onloadend = () => setAvatarPending(false)
    reader.readAsDataURL(file)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(
      Array.from(new FormData(form), ([key, value]) => [key, String(value)]),
    )

    setFeedback('')

    try {
      await save({ ...values, avatar })
      for (const input of form.querySelectorAll<HTMLInputElement>('input[type="password"]')) {
        input.value = ''
      }
      setFailed(false)
      setFeedback('Dados do perfil salvos.')
    } catch (error) {
      setFailed(true)
      setFeedback(cartErrorMessage(error))
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      <h1 className="text-sm font-bold">Perfil do colecionador</h1>

      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="Nome de exibição" name="name" defaultValue={profile.name} required minLength={2} maxLength={80} />
        <Field label="Nome de usuário" name="username" defaultValue={profile.username} required minLength={2} maxLength={32} />
        <Field label="E-mail" name="email" type="email" defaultValue={profile.email} required maxLength={120} />

        <div className="min-w-0 text-xs">
          <label htmlFor="profile-ens">Nome ENS <span className="text-[#efae75]">*</span></label>
          <div className="flex items-end gap-2">
            <span className="rounded-sm border border-[#5b3b26] px-3 py-2 text-sm">.eth</span>
            <input id="profile-ens" name="ens" defaultValue={profile.ens} required maxLength={63} className={fieldClass} />
          </div>
        </div>

        <Field label="Apelido da carteira" name="walletLabel" defaultValue={profile.walletLabel} required maxLength={60} />

        <div>
          <p className="mb-2 text-xs">Avatar</p>
          <div className="flex flex-wrap items-center gap-2">
            {avatar ? (
              <img src={avatar} alt="Avatar do colecionador" className="size-10 rounded-full object-cover" />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-[#382411] text-[#efae75]">
                <Camera aria-hidden="true" size={16} />
              </span>
            )}

            <label className={`cursor-pointer rounded px-3 py-2 text-xs ${primaryClass} focus-within:outline-2`}>
              Alterar
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  selectAvatar(event.currentTarget.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
            </label>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!avatar || avatarPending}
              onClick={() => setAvatar('')}
            >
              Remover
            </Button>
          </div>
        </div>
      </div>

      <fieldset className="grid gap-3 sm:w-[calc(50%-0.625rem)]">
        <legend className="mb-2 text-sm font-bold">Alterar senha</legend>
        <Field label="Senha atual" name="currentPassword" type="password" autoComplete="current-password" maxLength={128} />
        <Field label="Nova senha" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} />
        <Field label="Confirmar nova senha" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} />
      </fieldset>

      {feedback && <p role={failed ? 'alert' : 'status'} className="text-xs text-[#efae75]">{feedback}</p>}
      <Button type="submit" disabled={pending || avatarPending} className={primaryClass}>
        {pending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function WalletForm({
  wallet,
  save,
  pending,
}: {
  wallet: SavedWallet | null
  save: (values: Record<string, string>) => Promise<void>
  pending: boolean
}) {
  const [feedback, setFeedback] = useState('')
  const [failed, setFailed] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(
      Array.from(new FormData(event.currentTarget), ([key, value]) => [key, String(value)]),
    )

    try {
      await save(values)
      setFailed(false)
      setFeedback('Carteira salva.')
    } catch (error) {
      setFailed(true)
      setFeedback(cartErrorMessage(error))
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="Apelido da carteira" name="label" defaultValue={wallet?.label} required maxLength={60} />

        <label className="text-xs">
          Tipo de carteira *
          <select name="provider" className={fieldClass} defaultValue={wallet?.provider ?? ''} required>
            <option value="" disabled>Selecione uma carteira</option>
            <option>MetaMask</option>
            <option>WalletConnect</option>
            <option>Coinbase Wallet</option>
          </select>
        </label>

        <label className="text-xs">
          Rede *
          <select name="network" className={fieldClass} defaultValue={wallet?.network ?? ''} required>
            <option value="" disabled>Selecione uma rede</option>
            <option>Ethereum</option>
            <option>Polygon</option>
            <option>Solana</option>
          </select>
        </label>

        <Field label="Endereço da carteira" name="address" defaultValue={wallet?.address} required maxLength={44} />
      </div>

      {feedback && <p role={failed ? 'alert' : 'status'} className="text-xs text-[#efae75]">{feedback}</p>}
      <Button type="submit" disabled={pending} className={primaryClass}>
        {pending ? 'Salvando…' : 'Salvar carteira'}
      </Button>
    </form>
  )
}

function WalletsPanel({
  data,
  pending,
  save,
}: {
  data: AccountResponse
  pending: boolean
  save: (slot: 'primary' | 'secondary', values: Record<string, string>) => Promise<void>
}) {
  const [showSecondary, setShowSecondary] = useState(Boolean(data.secondary))

  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <div>
          <h1 className="text-sm font-bold">Carteira principal</h1>
          <p className="mt-1 text-xs text-[#ceb08d]">
            Cadastre o endereço da carteira principal do seu perfil.
          </p>
        </div>
        <WalletForm wallet={data.primary} pending={pending} save={(values) => save('primary', values)} />
      </section>

      <section className="space-y-4 border-t border-[#5b3b26] pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Carteira secundária</h2>
            {!showSecondary && <p className="mt-1 text-xs text-[#ceb08d]">Você ainda não cadastrou uma carteira secundária.</p>}
          </div>
          {!showSecondary && (
            <Button type="button" variant="ghost" onClick={() => setShowSecondary(true)} className="text-[#efae75]">
              Adicionar
            </Button>
          )}
        </div>

        {showSecondary && (
          <WalletForm wallet={data.secondary} pending={pending} save={(values) => save('secondary', values)} />
        )}
      </section>
    </div>
  )
}

function OrdersPanel({ orders }: { orders: Receipt[] }) {
  return (
    <section>
      <h1 className="text-sm font-bold">Minhas compras</h1>
      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-[#ceb08d]">Você ainda não tem compras confirmadas.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="space-y-3 rounded-sm bg-[#241711] p-4">
              <div className="flex flex-wrap justify-between gap-2 text-xs">
                <p className="break-all">Pedido {order.id}</p>
                <strong className="text-[#efae75]">{order.cart.totalEth} ETH</strong>
              </div>
              <p className="text-xs text-[#ceb08d]">
                Confirmado · {order.wallet} · {order.network}
              </p>
              <ul className="space-y-2 border-t border-[#5b3b26] pt-3">
                {order.cart.items.map((item) => (
                  <li key={`${item.nftId}:${item.editionId}`} className="flex items-center gap-3 text-xs">
                    <img src={item.imageUrl} alt="" className="size-10 shrink-0 rounded object-cover" />
                    <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="min-w-0 flex-1 hover:underline">
                      {item.name} · {item.editionLabel} × {item.quantity}
                    </Link>
                    <span className="text-[#efae75]">{item.lineSubtotalEth} ETH</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function ProfilePage() {
  const { section: routeSection } = profileRoute.useSearch()
  const [showFavorites, setShowFavorites] = useState(false)
  const section = showFavorites ? 'favorites' : routeSection
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const session = useQuery({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ session: CheckoutSession | null }>('/checkout/session', { signal })
      return data.session
    },
    retry: false,
  })

  const token = session.data?.token
  const accountKey = ['account', token] as const
  const account = useQuery({
    queryKey: accountKey,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<AccountResponse>('/account', {
        signal,
        headers: { Authorization: `Bearer ${token}` },
      })
      return data
    },
    enabled: Boolean(token),
    retry: false,
  })

  const saveAccount = useMutation({
    mutationFn: async ({ path, values }: { path: string; values: Record<string, string> }) => {
      await api.put(path, values, { headers: { Authorization: `Bearer ${token}` } })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountKey })
    },
  })

  const logout = useMutation({
    mutationFn: async () => {
      await api.delete('/checkout/session')
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: sessionKey })
      await queryClient.cancelQueries({ queryKey: ['account'] })
      await queryClient.cancelQueries({ queryKey: ['favorites'] })
      queryClient.removeQueries({ queryKey: ['favorites'] })
      queryClient.removeQueries({ queryKey: ['account'] })
      queryClient.setQueryData(sessionKey, null)
      await navigate({ to: '/', search: {}, replace: true })
    },
  })

  const data = account.data

  return (
    <main className="min-h-[75vh] bg-[#160f0b] font-mono text-[#f5eee8]">
      <div className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8 lg:px-12">
        {session.isPending && <p role="status">Carregando sessão…</p>}
        {session.isError && <p role="alert">{cartErrorMessage(session.error)}</p>}

        {session.isSuccess && !token && (
          <div className="space-y-3">
            <h1 className="text-lg font-bold">Meu perfil</h1>
            <p>Use o botão <strong>Entrar</strong> no cabeçalho para acessar sua conta.</p>
          </div>
        )}

        {token && (
          <div className="grid items-start gap-6 lg:grid-cols-[225px_minmax(0,1fr)]">
            <aside className="bg-[#241711]">
              <h2 className="px-4 pt-4 pb-2 text-sm font-bold">Meu perfil</h2>
              <nav aria-label="Menu do perfil">
                {sections.map(({ id, label, icon: Icon }) => (
                  <Link
                    key={id}
                    to="/profile"
                    search={{ section: id }}
                  onClick={() => setShowFavorites(false)}
                    aria-current={section === id ? 'page' : undefined}
                    className="flex items-center gap-3 border-l-4 border-transparent px-3 py-2.5 text-xs text-[#efae75] hover:bg-[#382411] aria-[current=page]:border-[#d88e4f] aria-[current=page]:bg-[#382411]"
                  >
                    <Icon aria-hidden="true" size={15} />
                    {label}
                  </Link>
                ))}

                <button
                type="button"
                aria-current={showFavorites ? 'page' : undefined}
                onClick={() => setShowFavorites(true)}
                className="flex w-full items-center gap-3 border-l-4 border-transparent px-3 py-2.5 text-xs text-[#efae75] hover:bg-[#382411] aria-[current=page]:border-[#d88e4f] aria-[current=page]:bg-[#382411]"
              >
                <Heart aria-hidden="true" size={15} />
                Lista de interesse
              </button>

              <div className="space-y-3 px-4 py-2 text-xs text-[#ceb08d]">
                  
                  <p>Ofertas</p>
                  <p>Arquivos baixados</p>
                  <p>Suporte</p>
                </div>
              </nav>

              <button
                type="button"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
                className="flex w-full items-center gap-3 border-t border-[#5b3b26] px-4 py-3 text-left text-xs font-bold text-[#efae75] hover:bg-[#382411] focus-visible:outline-2"
              >
                <LogOut aria-hidden="true" size={15} />
                {logout.isPending ? 'Saindo…' : 'Sair'}
              </button>

              {logout.isError && <p role="alert" className="p-3 text-xs">{cartErrorMessage(logout.error)}</p>}
            </aside>

            <div className="min-w-0">
              {account.isPending && <p role="status">Carregando seu perfil…</p>}
              {account.isError && (
                <div className="space-y-3">
                  <p role="alert">{cartErrorMessage(account.error)}</p>
                  <Button type="button" onClick={() => {
                    void session.refetch()
                    void account.refetch()
                  }}>
                    Tentar novamente
                  </Button>
                </div>
              )}

              {data && section === 'profile' && (
                <ProfileForm
                  key={token}
                  profile={data.profile}
                  pending={saveAccount.isPending}
                  save={async (values) => {
                    await saveAccount.mutateAsync({ path: '/account/profile', values })
                  }}
                />
              )}

              {data && section === 'wallets' && (
                <WalletsPanel
                  key={token}
                  data={data}
                  pending={saveAccount.isPending}
                  save={async (slot, values) => {
                    await saveAccount.mutateAsync({ path: `/account/wallets/${slot}`, values })
                  }}
                />
              )}

              {data && section === 'favorites' && <FavoritesPanel key={token} />}
            {data && section === 'orders' && <OrdersPanel orders={data.orders} />}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}