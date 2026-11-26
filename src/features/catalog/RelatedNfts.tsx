import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { getCatalog } from '@/services/catalogApi'

const emeraldRecommendations = [
  'cosmic-bloom-118',
  'violet-nomad-314',
  'ivory-baron-088',
  'golden-beat-207',
  'golden-signal-160',
]

const gridClass = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'

export default function RelatedNfts({ nftId }: { nftId: string }) {
  const catalog = useQuery({
    queryKey: ['catalog', {}],
    queryFn: ({ signal }) => getCatalog({}, signal),
    staleTime: 30_000,
    retry: false,
  })

  const catalogItems = catalog.data?.items ?? []
  const isEmeraldApe = nftId === 'emerald-ape-042'
  const items = isEmeraldApe
    ? emeraldRecommendations.flatMap((id) =>
        catalogItems.filter((item) => item.id === id),
      )
    : catalogItems.filter((item) => item.id !== nftId).slice(0, 5)

  return (
    <section aria-labelledby="related-nfts-title" className="mt-14">
      <h2
        id="related-nfts-title"
        className="mb-5 border-b border-[#5b3b26] pb-2 text-sm font-bold text-[#efae75]"
      >
        {isEmeraldApe ? 'Mais desta coleção' : 'Explore outros NFTs'}
      </h2>

      {catalog.isPending && (
        <>
          <p role="status" className="sr-only">Carregando recomendações…</p>
          <div aria-hidden="true" className={gridClass}>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index}>
                <div className="aspect-square rounded-md bg-[linear-gradient(110deg,#241711_35%,#453023_50%,#241711_65%)] bg-size-[200%_100%] motion-safe:animate-[catalog-shimmer_1.4s_linear_infinite]" />
                <div className="mt-2 h-4 w-3/4 rounded bg-[#241711]" />
                <div className="mt-1 h-4 w-1/3 rounded bg-[#241711]" />
              </div>
            ))}
          </div>
        </>
      )}

      {catalog.isError && (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-[#ceb08d]">
            Não foi possível atualizar as recomendações.
          </p>
          <Button type="button" variant="outline" onClick={() => void catalog.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {catalog.isSuccess && items.length === 0 && (
        <p className="text-sm text-[#ceb08d]">Nenhuma recomendação disponível.</p>
      )}

      {items.length > 0 && (
        <ul className={gridClass}>
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to="/nfts/$nftId"
                params={{ nftId: item.id }}
                className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efae75]"
              >
                <div className="rounded-sm bg-[#241711] p-1.5">
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full rounded-md object-cover"
                  />
                </div>
                <h3 className="mt-2 text-xs group-hover:text-[#efae75]">
                  {item.name}
                </h3>
                <p className="text-xs font-bold text-[#efae75]">{item.priceEth} ETH</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}