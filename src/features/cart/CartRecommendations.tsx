import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getCatalog } from '@/services/catalogApi'

const featuredIds = [
  'cosmic-bloom-118',
  'violet-nomad-314',
  'ivory-baron-088',
  'golden-beat-207',
  'golden-signal-160',
]

const groups = [
  { page: 2, featured: false },
  { page: 1, featured: true },
  { page: 3, featured: false },
]

const gridClass = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'
const shimmerClass =
  'aspect-square rounded bg-[linear-gradient(110deg,#241711_35%,#453023_50%,#241711_65%)] bg-size-[200%_100%] motion-safe:animate-[catalog-shimmer_1.4s_linear_infinite]'

export default function CartRecommendations() {
  const [activeGroup, setActiveGroup] = useState(1)
  const group = groups[activeGroup] ?? groups[1]!

  const catalog = useQuery({
    queryKey: ['cart-recommendations', group.page],
    queryFn: ({ signal }) => getCatalog({ page: group.page }, signal),
    staleTime: 30_000,
    retry: false,
  })

  const items = catalog.data?.items ?? []
  const cards = group.featured
    ? featuredIds.flatMap((id) => items.filter((item) => item.id === id))
    : items.slice(0, 5)

  return (
    <section aria-labelledby="cart-recommendations" className="mt-14 md:mt-20">
      <h2
        id="cart-recommendations"
        className="mb-5 border-b border-[#5b3b26] pb-2 text-sm font-bold text-[#efae75]"
      >
        Colecionadores também viram
      </h2>

      {catalog.isPending && (
        <div role="status">
          <span className="sr-only">Carregando recomendações…</span>
          <div aria-hidden="true" className={gridClass}>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className={shimmerClass} />
            ))}
          </div>
        </div>
      )}

      {catalog.isError && (
        <div className="space-y-2">
          <p role="alert" className="text-sm">
            Não foi possível carregar as recomendações.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void catalog.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {catalog.isSuccess && cards.length === 0 && (
        <p className="text-sm text-[#ceb08d]">Nenhuma recomendação neste grupo.</p>
      )}

      {cards.length > 0 && (
        <ul className={gridClass}>
          {cards.map((item) => (
            <li key={item.id}>
              <Link
                to="/nfts/$nftId"
                params={{ nftId: item.id }}
                className="group block rounded focus-visible:outline-2 focus-visible:outline-[#efae75]"
              >
                <div className="bg-[#241711] p-1.5">
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
                <p className="mt-1 text-xs font-bold text-[#efae75]">
                  {item.priceEth} ETH
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div
        role="group"
        aria-label="Grupos de recomendações"
        className="mt-3 flex justify-center"
      >
        {groups.map(({ page }, index) => (
          <button
            key={page}
            type="button"
            aria-label={`Recomendações ${index + 1} de ${groups.length}`}
            aria-pressed={activeGroup === index}
            onClick={() => setActiveGroup(index)}
            className="group grid size-9 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-[#efae75]"
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full border border-[#d88e4f] group-aria-pressed:bg-[#d88e4f]"
            />
          </button>
        ))}
      </div>
    </section>
  )
}