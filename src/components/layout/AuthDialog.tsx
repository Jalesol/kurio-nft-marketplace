import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import type { CheckoutSession } from '@/mocks/checkoutHandlers'
import { api } from '@/services/api'
import { cartErrorMessage } from '@/services/cartApi'

const sessionKey = ['checkout-session'] as const

const primaryClass =
  'bg-[#d88e4f] font-bold text-[#160f0b] hover:bg-[#eda66a]'

const fieldClass =
  'block h-10 w-full rounded-sm border border-[#5b3b26] bg-transparent px-3 text-xs text-[#f5eee8] placeholder:text-[#bfa084] focus-visible:outline-2 focus-visible:outline-[#efae75]'

const tabClass =
  'flex-none rounded-none border-0 bg-transparent px-2 text-sm text-[#f5eee8] after:hidden data-[state=active]:bg-transparent data-[state=active]:text-[#efae75] data-[state=active]:shadow-none'

type AuthMode = 'login' | 'register'

function CredentialsForm({
  mode,
  pending,
  error,
  onSubmit,
}: {
  mode: AuthMode
  pending: boolean
  error?: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const registering = mode === 'register'
  const passwordId = `auth-${mode}-password`

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {registering && (
        <label className="block">
          <span className="sr-only">Nome de usuário</span>
          <input
            name="username"
            placeholder="Nome de usuário"
            autoComplete="nickname"
            required
            minLength={2}
            maxLength={32}
            className={fieldClass}
          />
        </label>
      )}

      <label className="block">
        <span className="sr-only">E-mail</span>
        <input
          name="email"
          type="email"
          placeholder="Digite seu e-mail"
          autoComplete={registering ? 'email' : 'username'}
          required
          maxLength={120}
          className={fieldClass}
        />
      </label>

      <div className="relative">
        <label htmlFor={passwordId} className="sr-only">Senha</label>
        <input
          id={passwordId}
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Senha"
          autoComplete={registering ? 'new-password' : 'current-password'}
          required
          minLength={registering ? 8 : undefined}
          maxLength={128}
          className={`${fieldClass} pr-10`}
        />

        <button
          type="button"
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          aria-controls={passwordId}
          onClick={() => setShowPassword((visible) => !visible)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-[#efae75] focus-visible:outline-2 focus-visible:outline-[#efae75]"
        >
          {showPassword
            ? <EyeOff aria-hidden="true" size={16} />
            : <Eye aria-hidden="true" size={16} />}
        </button>
      </div>

      {registering && (
        <label className="block">
          <span className="sr-only">Confirmar senha</span>
          <input
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirmar senha"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            className={fieldClass}
          />
        </label>
      )}

      {!registering && (
        <p
          title="Recuperação de senha indisponível na demonstração"
          className="text-right text-xs text-[#ceb08d]"
        >
          Esqueceu a senha?
        </p>
      )}

      {error && <p role="alert" className="text-xs text-[#efae75]">{error}</p>}

      <Button type="submit" disabled={pending} className={`mt-2 w-full ${primaryClass}`}>
        {pending
          ? registering ? 'Criando conta…' : 'Entrando…'
          : registering ? 'Criar conta' : 'Entrar'}
      </Button>
    </form>
  )
}

export default function AuthDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('login')

  const session = useQuery({
    queryKey: sessionKey,
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

  const authenticate = useMutation({
    mutationFn: async ({
      mode,
      values,
    }: {
      mode: AuthMode
      values: Record<string, string>
    }) => {
      if (mode === 'register' && values.password !== values.confirmPassword) {
        throw new Error('As senhas precisam ser iguais.')
      }

      const path = mode === 'register' ? '/checkout/register' : '/checkout/session'
      const { data } = await api.post<{ session: CheckoutSession }>(path, values)

      if (!data?.session?.token) {
        throw new Error('A API de autenticação está indisponível.')
      }

      return data.session
    },
    onSuccess: async (activeSession) => {
      await queryClient.cancelQueries({ queryKey: sessionKey })
      queryClient.setQueryData(sessionKey, activeSession)
      setOpen(false)
    },
  })

  const logout = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<{ session: null }>('/checkout/session')
      if (data?.session !== null) throw new Error('Não foi possível encerrar a sessão.')
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: sessionKey })
      queryClient.setQueryData(sessionKey, null)
      setOpen(false)
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (authenticate.isPending) return

    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(
      Array.from(form, ([key, value]) => [key, String(value)]),
    )

    authenticate.mutate({ mode, values })
  }

  const activeSession = session.data

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (authenticate.isPending || logout.isPending) return
        if (nextOpen) {
          setMode('login')
          authenticate.reset()
          logout.reset()
          void session.refetch()
        }
        setOpen(nextOpen)
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" className={primaryClass}>
          <LogIn aria-hidden="true" size={16} />
          {activeSession ? 'Minha conta' : 'Entrar'}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-md border-0 border-b-8 border-[#d88e4f] bg-[#241711] px-6 py-8 font-mono text-[#f5eee8] sm:max-w-[410px] sm:px-12">
        <DialogTitle className="sr-only">
          {activeSession ? 'Minha conta' : 'Acesso à Kurio'}
        </DialogTitle>

        {activeSession ? (
          <div className="space-y-4 text-center">
            <h2 className="font-bold">Minha conta</h2>
            <DialogDescription className="break-all text-[#ceb08d]">
              {activeSession.email}
            </DialogDescription>
            {logout.isError && <p role="alert">{cartErrorMessage(logout.error)}</p>}
            <Button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              className={`w-full ${primaryClass}`}
            >
              {logout.isPending ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        ) : (
          <>
            <DialogDescription className="sr-only">
              Entre ou crie um perfil de colecionador na Kurio.
            </DialogDescription>

            <Tabs
              value={mode}
              onValueChange={(value) => {
                if (authenticate.isPending) return
                if (value === 'login' || value === 'register') {
                  authenticate.reset()
                  setMode(value)
                }
              }}
              className="gap-4"
            >
              <TabsList
                aria-label="Acesso à conta"
                className="mx-auto flex h-auto w-fit items-center justify-center rounded-none bg-transparent p-0"
              >
                <TabsTrigger value="login" className={tabClass}>Entrar</TabsTrigger>
                <span aria-hidden="true" className="h-4 border-l border-[#80532f]" />
                <TabsTrigger value="register" className={tabClass}>Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <p className="mb-5 text-center text-xs leading-relaxed text-[#e4d2bf]">
                  Entre na sua conta para acessar seu perfil de colecionador.
                </p>
                <CredentialsForm
                  mode="login"
                  onSubmit={submit}
                  pending={authenticate.isPending}
                  error={authenticate.isError ? cartErrorMessage(authenticate.error) : undefined}
                />
              </TabsContent>

              <TabsContent value="register">
                <p className="mb-5 text-center text-xs leading-relaxed text-[#e4d2bf]">
                  Crie seu perfil de colecionador e conecte uma carteira quando quiser.
                </p>
                <CredentialsForm
                  mode="register"
                  onSubmit={submit}
                  pending={authenticate.isPending}
                  error={authenticate.isError ? cartErrorMessage(authenticate.error) : undefined}
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <div className="mb-3 flex items-center gap-2 text-xs text-[#ceb08d]">
                <span aria-hidden="true" className="h-px flex-1 bg-[#5b3b26]" />
                Ou continue com
                <span aria-hidden="true" className="h-px flex-1 bg-[#5b3b26]" />
              </div>

              <Button
                type="button"
                variant="outline"
                disabled
                className="w-full border-[#5b3b26] bg-transparent text-xs text-[#e4d2bf] disabled:opacity-75"
              >
                <span aria-hidden="true" className="font-bold text-[#8ab4f8]">G</span>
                Continuar com Google
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled
                className="w-full border-[#5b3b26] bg-transparent text-xs text-[#e4d2bf] disabled:opacity-75"
              >
                <span aria-hidden="true" className="font-bold text-[#6d9bf4]">f</span>
                Continuar com Facebook
              </Button>

              <p className="pt-1 text-center text-[11px] text-[#ceb08d]">
                Login social indisponível na demonstração.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}