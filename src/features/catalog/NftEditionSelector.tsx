import { useFavorites } from '@/features/favorites/useFavorites'
import { useNavigate } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCartMutation } from '@/features/cart/useCart'
import { cartErrorMessage } from '@/services/cartApi'
import CollectorRating from './CollectorRating'
import type { NftDetail, NftEdition } from './detailTypes'

function getQuantityLimit(edition: NftEdition) {
  return Math.min(edition.availableSupply, edition.maxPerOrder)
}

export default function NftEditionSelector({ nft }: { nft: NftDetail }) {
  const navigate = useNavigate()
  const cartMutation = useCartMutation()
  const [selectedId, setSelectedId] = useState('one-of-fifty')
  const [quantity, setQuantity] = useState(1)
  const { session, favorites, change } = useFavorites()
  const isFavorite = favorites.data?.includes(nft.id) ?? false
  const [showFavoriteNotice, setShowFavoriteNotice] = useState(false)

  const available = nft.editions.filter((edition) => getQuantityLimit(edition) > 0)
  const selected =
    available.find((edition) => edition.id === selectedId) ?? available[0]
  const limit = selected ? getQuantityLimit(selected) : 0
  const currentQuantity = Math.min(quantity, limit)

  function buy() {
    if (!selected || cartMutation.isPending) return

    cartMutation.mutate(
      {
        type: 'add',
        item: {
          nftId: nft.id,
          editionId: selected.id,
          quantity: currentQuantity,
        },
      },
      {
        onSuccess: () => {
          void navigate({ to: '/cart' })
        },
      },
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h1 className="text-2xl leading-tight font-bold sm:text-3xl">
          {nft.name}
        </h1>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#5b3b26] pb-3">
          <p aria-live="polite" className="text-xl font-bold text-[#efae75]">
            {selected?.priceEth ?? nft.priceEth} ETH
          </p>

          <CollectorRating reviews={nft.reviews} />
        </div>
      </div>

      <section aria-label="Sobre este NFT" className="text-sm">
        <h2 className="font-bold">Sobre este NFT</h2>
        <p className="mt-1 leading-relaxed text-[#ceb08d]">{nft.description}</p>
      </section>

      <fieldset disabled={cartMutation.isPending}>
        <legend className="mb-2 text-sm font-bold">Edição</legend>

        <div className="flex flex-wrap gap-2">
          {nft.editions.map((edition) => {
            const soldOut = getQuantityLimit(edition) === 0

            return (
              <label key={edition.id} className="relative">
                <input
                  type="radio"
                  name={`edition-${nft.id}`}
                  value={edition.id}
                  disabled={soldOut}
                  checked={selected?.id === edition.id}
                  className="peer sr-only"
                  onChange={() => {
                    setSelectedId(edition.id)
                    setQuantity(1)
                    cartMutation.reset()
                  }}
                />
                <span className="block rounded-full border border-[#5b3b26] px-3 py-1.5 text-xs peer-checked:border-[#efae75] peer-checked:text-[#efae75] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#efae75] peer-enabled:cursor-pointer peer-disabled:text-[#ceb08d]">
                  {edition.label}
                  {soldOut && ' · Esgotada'}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {selected && (
          <div
            role="group"
            aria-label="Quantidade"
            className="flex items-center gap-2"
          >
            <Button
              type="button"
              size="icon"
              aria-label="Diminuir quantidade"
              disabled={cartMutation.isPending || currentQuantity <= 1}
              onClick={() => setQuantity(currentQuantity - 1)}
              className="rounded-full bg-[#d88e4f] text-[#160f0b] hover:bg-[#eda66a]"
            >
              −
            </Button>

            <output
              aria-label="Quantidade selecionada"
              className="min-w-5 text-center"
            >
              {currentQuantity}
            </output>

            <Button
              type="button"
              size="icon"
              aria-label="Aumentar quantidade"
              disabled={cartMutation.isPending || currentQuantity >= limit}
              onClick={() => setQuantity(currentQuantity + 1)}
              className="rounded-full bg-[#d88e4f] text-[#160f0b] hover:bg-[#eda66a]"
            >
              +
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={buy}
            disabled={!selected || cartMutation.isPending}
            className="bg-[#d88e4f] font-bold text-[#160f0b] hover:bg-[#eda66a]"
          >
            {cartMutation.isPending ? 'Adicionando…' : 'Comprar'}
          </Button>

          <Button
            type="button"
            variant="outline"
            aria-pressed={session.data ? isFavorite : undefined}
            aria-controls="favorite-notice"
            disabled={session.isPending || change.isPending || (Boolean(session.data) && favorites.isPending)}
            onClick={() => {
              if (session.isError) {
                void session.refetch()
                return
              }

              if (!session.data) {
                setShowFavoriteNotice(true)
                return
              }

              if (favorites.isError) {
                void favorites.refetch()
                return
              }

              change.mutate({ nftId: nft.id, saved: !isFavorite })
            }}
            className="border-[#d88e4f] bg-transparent text-[#efae75] hover:bg-[#241711] hover:text-[#f5eee8]"
          >
            <Heart aria-hidden="true" size={16} className={isFavorite ? 'fill-current' : undefined} />
            {isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
          </Button>
        </div>
      </div>

      <p role="status" className="text-xs text-[#ceb08d]">
        {selected
          ? `${selected.availableSupply} em estoque · limite de ${limit} por pedido`
          : 'Este NFT está esgotado.'}
      </p>

      <p
        id="favorite-notice"
        role="status"
        hidden={!showFavoriteNotice || Boolean(session.data)}
        className="text-sm text-[#ceb08d]"
      >
        Use o botão Entrar no menu para salvar seus favoritos.
      </p>

      {(change.isError || favorites.isError || session.isError) && (
        <p role="alert" className="text-sm text-[#efae75]">
          {cartErrorMessage(change.error ?? favorites.error ?? session.error)}
        </p>
      )}

      {cartMutation.isError && (
        <p role="alert" className="text-sm text-[#efae75]">
          {cartErrorMessage(cartMutation.error)}
        </p>
      )}
    </div>
  )
}