import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import SiteFooter from '@/components/layout/SiteFooter'
import { Button } from '@/components/ui/button'
import CartRecommendations from '@/features/cart/CartRecommendations'
import type { CartItem } from '@/features/cart/types'
import { useCart, useCartMutation } from '@/features/cart/useCart'
import { cartErrorMessage } from '@/services/cartApi'

const desktopColumns =
  'md:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_36px]'
const primaryClass = 'bg-[#d88e4f] font-bold text-[#160f0b] hover:bg-[#eda66a]'
const quantityButton = `size-8 rounded-full ${primaryClass}`
const shimmer =
  'rounded bg-[linear-gradient(110deg,#241711_35%,#453023_50%,#241711_65%)] bg-size-[200%_100%] motion-safe:animate-[catalog-shimmer_1.4s_linear_infinite]'

export default function CartPage() {
  const cart = useCart()
  const mutation = useCartMutation()
  const data = cart.data
  const items = data?.items ?? []
  const couponError = mutation.isError && mutation.variables?.type === 'coupon'
  const canCheckout = items.length > 0 && !cart.isError && !mutation.isPending

  function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('coupon') ?? '').trim()
    if (code && !mutation.isPending) mutation.mutate({ type: 'coupon', code })
  }

  function changeQuantity(item: CartItem, quantity: number) {
    mutation.mutate({
      type: 'change',
      item: { nftId: item.nftId, editionId: item.editionId, quantity },
    })
  }

  return (
    <>
      <main className="bg-[#160f0b] font-mono text-[#f5eee8]">
        <div className="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-14 sm:px-8 lg:px-12">
          <nav aria-label="Localização na página" className="mb-2 text-xs font-bold">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link to="/" search={{}} className="hover:underline">Início</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link to="/" search={{}} hash="mercado" className="hover:underline">Mercado</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Carrinho</li>
            </ol>
          </nav>

          <h1 className="sr-only">Carrinho de NFTs</h1>

          {cart.isError && (
            <div className="my-4 rounded bg-[#241711] p-4">
              <p role="alert">{cartErrorMessage(cart.error)}</p>
              <Button type="button" className="mt-2" onClick={() => void cart.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {mutation.isError && !couponError && (
            <p role="alert" className="my-4 text-sm text-[#efae75]">
              {cartErrorMessage(mutation.error)}
            </p>
          )}

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2.35fr)_minmax(0,1fr)] lg:gap-12">
            <section aria-label="Itens do carrinho" className="min-w-0">
              <div
                aria-hidden="true"
                className={`hidden items-center gap-x-3 border-b border-[#5b3b26] px-2 pb-2 text-xs font-bold md:grid ${desktopColumns}`}
              >
                <span>NFTs</span>
                <span>Preço</span>
                <span>Edições</span>
                <span>Total</span>
              </div>

              {cart.isPending && (
                <div role="status" className="mt-2 space-y-2">
                  <span className="sr-only">Carregando itens do carrinho…</span>
                  {[0, 1, 2].map((index) => (
                    <div key={index} aria-hidden="true" className={`h-16 ${shimmer}`} />
                  ))}
                </div>
              )}

              {data && items.length === 0 && (
                <p className="mt-3 rounded bg-[#241711] p-4 text-sm text-[#ceb08d]">
                  Seu carrinho está vazio.
                </p>
              )}

              {items.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {items.map((item) => {
                    const token = item.nftId.match(/\d+$/)?.[0]?.padStart(4, '0')

                    return (
                      <li
                        key={`${item.nftId}:${item.editionId}`}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 bg-[#241711] px-2 py-1.5 text-xs ${desktopColumns}`}
                      >
                        <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                          <img src={item.imageUrl} alt="" className="size-14 shrink-0 rounded object-cover" />
                          <div className="min-w-0">
                            <Link
                              to="/nfts/$nftId"
                              params={{ nftId: item.nftId }}
                              className="font-bold hover:text-[#efae75] hover:underline"
                            >
                              {item.name}
                            </Link>
                            <p className="mt-0.5 text-[#ceb08d]">
                              {token ? `ID do token: #${token}` : `Edição ${item.editionLabel}`}
                            </p>
                          </div>
                        </div>

                        <p className="text-[#ceb08d]">
                          <span className="sr-only">Preço por unidade: </span>
                          {item.unitPriceEth} ETH
                        </p>

                        <div
                          role="group"
                          aria-label={`Quantidade de ${item.name}, edição ${item.editionLabel}`}
                          className="flex items-center gap-1.5"
                        >
                          <Button
                            type="button"
                            size="icon"
                            aria-label="Diminuir quantidade"
                            disabled={mutation.isPending || item.quantity <= 1}
                            onClick={() => changeQuantity(item, item.quantity - 1)}
                            className={quantityButton}
                          >
                            <Minus aria-hidden="true" size={14} />
                          </Button>
                          <span>{item.quantity}</span>
                          <Button
                            type="button"
                            size="icon"
                            aria-label="Aumentar quantidade"
                            disabled={mutation.isPending || item.quantity >= item.quantityLimit}
                            onClick={() => changeQuantity(item, item.quantity + 1)}
                            className={quantityButton}
                          >
                            <Plus aria-hidden="true" size={14} />
                          </Button>
                        </div>

                        <p className="font-bold text-[#efae75]">
                          <span className="sr-only">Total do item: </span>
                          {item.lineSubtotalEth} ETH
                        </p>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remover ${item.name}, edição ${item.editionLabel}`}
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ type: 'remove', item })}
                          className="justify-self-end text-[#ceb08d] hover:bg-[#3a2619] hover:text-[#efae75]"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <aside aria-labelledby="wallet-summary" className="min-w-0">
              <h2 id="wallet-summary" className="border-b border-[#5b3b26] pb-2 text-sm font-bold">
                Resumo da carteira
              </h2>

              {cart.isPending && (
                <div role="status" className="mt-4 space-y-3">
                  <span className="sr-only">Carregando resumo da carteira…</span>
                  <div aria-hidden="true" className={`h-9 ${shimmer}`} />
                  <div aria-hidden="true" className={`h-28 ${shimmer}`} />
                </div>
              )}

              {data && (
                <>
                  <form onSubmit={applyCoupon} className="mt-4">
                    <label htmlFor="cart-coupon" className="mb-1 block text-xs font-bold">
                      Código promocional
                    </label>
                    <div className="flex">
                      <input
                        id="cart-coupon"
                        key={data.couponCode ?? 'no-coupon'}
                        name="coupon"
                        defaultValue={data.couponCode ?? ''}
                        maxLength={32}
                        required
                        placeholder="Digite o código promocional…"
                        disabled={mutation.isPending || items.length === 0}
                        aria-describedby={couponError ? 'cart-coupon-error' : undefined}
                        className="min-w-0 flex-1 rounded-l border border-[#80532f] bg-transparent px-2 py-2 text-xs placeholder:text-[#ceb08d] focus-visible:outline-2 focus-visible:outline-[#efae75]"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={mutation.isPending || items.length === 0}
                        className={`h-auto rounded-l-none ${primaryClass}`}
                      >
                        Aplicar
                      </Button>
                    </div>

                    {couponError && (
                      <p id="cart-coupon-error" role="alert" className="mt-2 text-xs text-[#efae75]">
                        {cartErrorMessage(mutation.error)}
                      </p>
                    )}
                  </form>

                  {data.couponCode && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#efae75]">
                      <p role="status">Cupom {data.couponCode} aplicado.</p>
                      <button
                        type="button"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ type: 'coupon', code: null })}
                        className="cursor-pointer underline disabled:cursor-default"
                      >
                        Remover cupom
                      </button>
                    </div>
                  )}

                  <dl className="mt-5 space-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt>Subtotal</dt><dd>{data.subtotalEth} ETH</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Desconto do lançamento</dt><dd>− {data.discountEth} ETH</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Taxa de rede</dt>
                      <dd className="text-right">
                        {data.networkFeeEth} ETH
                        <span className="mt-1 block text-[10px] text-[#efae75]">Taxa estimada</span>
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 pt-3 text-sm font-bold">
                      <dt>Total</dt>
                      <dd aria-live="polite" className="text-[#efae75]">{data.totalEth} ETH</dd>
                    </div>
                  </dl>
                </>
              )}

              {canCheckout ? (
                <Button asChild className={`mt-4 w-full ${primaryClass}`}>
                  <Link to="/checkout">Conectar e finalizar</Link>
                </Button>
              ) : (
                <Button type="button" disabled className={`mt-4 w-full ${primaryClass}`}>
                  Conectar e finalizar
                </Button>
              )}

              <Link
                to="/"
                search={{}}
                hash="mercado"
                className="mt-3 block text-center text-xs text-[#efae75] hover:underline"
              >
                Continuar explorando
              </Link>
            </aside>
          </div>

          <CartRecommendations />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}