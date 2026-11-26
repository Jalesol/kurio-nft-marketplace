import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { Collection } from '@/features/catalog/types'

const newsletterKey = 'kurio:demo-newsletter'

const highlights = [
  {
    initial: 'W',
    title: 'Segurança da carteira',
    description:
      'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    initial: 'C',
    title: 'Criadores em destaque',
    description:
      'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    initial: 'D',
    title: 'Alertas de lançamentos',
    description:
      'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const profileItems = [
  'Meu perfil',
  'Minha coleção',
  'Atividade',
  'Estúdio do criador',
  'Lista de interesse',
]

const helpItems = [
  'Central de ajuda',
  'Como comprar NFTs',
  'Carteira e segurança',
  'Política do mercado',
  'Denunciar item',
]

const footerCollections: Collection[] = [
  'Arte digital',
  'Fotografia',
  'Música',
  'Arte 3D',
  'Utilidade',
]

const socialNetworks = [
  { name: 'Facebook', mark: 'f' },
  { name: 'Instagram', mark: 'IG' },
  { name: 'Twitter', mark: 'X' },
  { name: 'LinkedIn', mark: 'in' },
  { name: 'YouTube', mark: '▶' },
]

const focusClass =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efae75]'

function FooterTextColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-2 space-y-2 text-xs text-[#e4d2bf]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export default function SiteFooter() {
  const [feedback, setFeedback] = useState<{
    message: string
    error: boolean
  }>()

  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const email = String(new FormData(form).get('email') ?? '').trim()

    try {
      const savedEmail = localStorage.getItem(newsletterKey)

      if (savedEmail?.toLowerCase() === email.toLowerCase()) {
        setFeedback({ message: 'Este e-mail já está inscrito neste navegador.', error: false })
        return
      }

      localStorage.setItem(newsletterKey, email)
      form.reset()
      setFeedback({ message: 'Inscrição salva neste navegador.', error: false })
    } catch {
      setFeedback({ message: 'Não foi possível salvar a inscrição. Tente novamente.', error: true })
    }
  }

  return (
    <footer className="font-mono text-[#f5eee8]">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-12">
        <div className="bg-[#241711]">
          <div className="grid gap-y-6 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1fr_1fr_1fr_1.35fr] lg:gap-y-0">
            {highlights.map((highlight) => (
              <div
                key={highlight.title}
                className="px-2 sm:px-3 lg:border-r lg:border-[#80532f]"
              >
                <span
                  aria-hidden="true"
                  className="mb-3 grid size-11 place-items-center rounded-full bg-[#d88e4f] font-bold text-[#160f0b]"
                >
                  {highlight.initial}
                </span>
                <h2 className="text-sm font-bold">{highlight.title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-[#ceb08d]">
                  {highlight.description}
                </p>
              </div>
            ))}

            <div className="min-w-0 px-2 sm:px-3">
              <h2 className="mb-3 text-sm leading-tight font-bold">
                Antecipe-se ao próximo lançamento
              </h2>

              <form onSubmit={subscribe} className="flex flex-wrap gap-2 xl:flex-nowrap">
                <label htmlFor="kurio-newsletter-email" className="sr-only">
                  Seu e-mail
                </label>
                <input
                  id="kurio-newsletter-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Digite seu e-mail..."
                  aria-describedby="kurio-newsletter-description"
                  className={`min-w-0 flex-[1_1_9rem] rounded bg-[#382411] px-3 py-2 text-xs placeholder:text-[#ceb08d] xl:flex-1 ${focusClass}`}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#d88e4f] font-bold text-[#160f0b] hover:bg-[#eda66a]"
                >
                  Enviar
                </Button>
              </form>

              <p
                id="kurio-newsletter-description"
                className="mt-2 text-xs leading-relaxed text-[#ceb08d]"
              >
                Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
              </p>

              {feedback && (
                <p
                  role={feedback.error ? 'alert' : 'status'}
                  className="mt-2 text-xs text-[#efae75]"
                >
                  {feedback.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 bg-[#382411] px-6 py-5 text-xs sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
            <Link
              to="/"
              search={{}}
              className={`w-fit font-bold tracking-[0.2em] ${focusClass}`}
            >
              KURIO
            </Link>
            <p>Feito para colecionadores, criadores e cultura</p>
            <p>contato@email.com</p>
            <p>+55 11 4002 8922</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-6 px-6 py-6 text-sm lg:grid-cols-4">
            <FooterTextColumn title="Meu perfil" items={profileItems} />
            <FooterTextColumn title="Central de ajuda" items={helpItems} />

            <div>
              <h3 className="font-bold">Coleções</h3>
              <ul className="mt-2 space-y-2 text-xs text-[#e4d2bf]">
                {footerCollections.map((collection) => (
                  <li key={collection}>
                    <Link
                      to="/"
                      search={{ collection }}
                      hash="mercado"
                      className={`hover:text-[#efae75] hover:underline ${focusClass}`}
                    >
                      {collection}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold">Redes sociais</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {socialNetworks.map(({ name, mark }) => (
                  <li key={name}>
                    <span
                      title={name}
                      className="grid size-6 place-items-center rounded border border-[#80532f] text-xs font-bold text-[#efae75]"
                    >
                      <span aria-hidden="true">{mark}</span>
                      <span className="sr-only">{name}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <h3 className="mt-4 font-bold">Carteiras compatíveis</h3>
              <p className="mt-2 inline-block rounded bg-[#382411] px-2 py-1 text-[10px] text-[#efae75]">
                MetaMask · WalletConnect · Coinbase
              </p>
            </div>
          </div>
        </div>

        <p className="py-4 text-center text-xs text-[#ceb08d]">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </div>
    </footer>
  )
}