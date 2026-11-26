import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { Search, ShoppingCart, UserRound } from 'lucide-react'
import AuthDialog from '@/components/layout/AuthDialog'
import { Button } from '@/components/ui/button'
import { useCart } from '@/features/cart/useCart'
import type { CheckoutSession } from '@/mocks/checkoutHandlers'
import { api } from '@/services/api'

const navLink =
  'border-b-2 py-2 text-sm hover:text-[#efae75] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efae75]'
const activeNavLink = 'border-[#d88e4f] font-bold text-[#efae75]'
const inactiveNavLink = 'border-transparent'
const iconLink =
  'relative grid size-10 place-items-center rounded-md hover:bg-[#241711] focus-visible:outline-2 focus-visible:outline-[#efae75]'

export default function SiteHeader() {
  const location = useLocation()
  const cart = useCart()
  const session = useQuery({
    queryKey: ['checkout-session'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ session: CheckoutSession | null }>('/checkout/session', { signal })
      return data.session
    },
    retry: false,
  })

  const cartItems = cart.data?.items
  const quantity = Array.isArray(cartItems)
    ? cartItems.reduce((total, item) => total + item.quantity, 0)
    : undefined

  const atHome = location.pathname === '/' && !location.hash
  const atMarket =
    location.pathname === '/cart' ||
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/nfts/') ||
    (location.pathname === '/' &&
      (location.hash === 'mercado' || location.hash === 'busca-nfts'))

  return (
    <header className="bg-[#160f0b] font-mono text-[#f5eee8]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-[#3a2619] py-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Link
            to="/"
            search={{}}
            className="col-start-1 row-start-1 justify-self-start text-sm font-bold tracking-[0.2em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efae75]"
          >
            KURIO
          </Link>

          <nav
            aria-label="Menu principal"
            className="col-span-2 col-start-1 row-start-2 flex flex-wrap items-center justify-center gap-x-4 md:col-span-1 md:col-start-2 md:row-start-1 md:gap-x-6"
          >
            <Link
              to="/"
              search={{}}
              aria-current={atHome ? 'page' : undefined}
              className={`${navLink} ${atHome ? activeNavLink : inactiveNavLink}`}
            >
              Início
            </Link>

            <Link
              to="/nfts/$nftId"
              params={{ nftId: 'emerald-ape-042' }}
              aria-current={atMarket ? 'location' : undefined}
              className={`${navLink} ${atMarket ? activeNavLink : inactiveNavLink}`}
            >
              Mercado
            </Link>

            <span title="Página indisponível na demonstração" className="text-sm text-[#ceb08d]">Criadores</span>
            <span title="Página indisponível na demonstração" className="text-sm text-[#ceb08d]">Aprenda</span>
          </nav>

          <div className="col-start-2 row-start-1 flex items-center gap-1 justify-self-end md:col-start-3">
            <Link to="/" search={{}} hash="busca-nfts" aria-label="Buscar NFTs" className={iconLink}>
              <Search aria-hidden="true" size={18} />
            </Link>

            <Link
              to="/cart"
              aria-label={quantity === undefined ? 'Carrinho' : `Carrinho, ${quantity} ${quantity === 1 ? 'unidade' : 'unidades'}`}
              className={iconLink}
            >
              <ShoppingCart aria-hidden="true" size={18} />
              {quantity !== undefined && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 right-0 min-w-4 rounded-full bg-[#d88e4f] px-1 text-center text-[10px] font-bold text-[#160f0b]"
                >
                  {quantity}
                </span>
              )}
            </Link>

            {session.data ? (
              <Button asChild size="sm" className="bg-[#d88e4f] font-bold text-[#160f0b] hover:bg-[#eda66a]">
                <Link to="/profile" search={{ section: 'profile' }}>
                  <UserRound aria-hidden="true" size={16} />
                  Minha conta
                </Link>
              </Button>
            ) : (
              <AuthDialog />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}