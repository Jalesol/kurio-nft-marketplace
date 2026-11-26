import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { getNft } from '@/services/catalogApi'
import { cartErrorMessage } from '@/services/cartApi'
import { useFavorites } from './useFavorites'

export default function FavoritesPanel() {
  const { favorites, change } = useFavorites()
  const ids = favorites.data ?? []
  const details = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['favorite-nft', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => getNft(id, signal),
    })),
  })

  return (
    <section aria-labelledby="favorites-title" className="space-y-4">
      <h2 id="favorites-title" className="text-sm font-bold">Lista de interesse</h2>

      {favorites.isPending && <p role="status">Carregando favoritos…</p>}
      {favorites.isError && (
        <div className="space-y-2">
          <p role="alert">{cartErrorMessage(favorites.error)}</p>
          <Button type="button" onClick={() => void favorites.refetch()}>Tentar novamente</Button>
        </div>
      )}
      {change.isError && <p role="alert">{cartErrorMessage(change.error)}</p>}
      {favorites.isSuccess && ids.length === 0 && <p>Você ainda não tem NFTs favoritos.</p>}

      <ul className="space-y-2">
        {ids.map((id, index) => {
          const nft = details[index]?.data

          return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-3 bg-[#241711] p-3">
              <Link to="/nfts/$nftId" params={{ nftId: id }} className="flex items-center gap-3 hover:underline">
                {nft && <img src={nft.imageUrl} alt="" className="size-12 rounded object-cover" />}
                <span>{nft?.name ?? id}</span>
              </Link>
              <Button
                type="button"
                variant="outline"
                disabled={change.isPending}
                aria-label={`Remover ${nft?.name ?? id} dos favoritos`}
                onClick={() => change.mutate({ nftId: id, saved: false })}
              >
                Remover
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
