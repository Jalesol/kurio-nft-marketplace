import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import featuredArt from '@/assets/nfts02.jpg'
import { Button } from '@/components/ui/button'
import { getCatalog } from '@/services/catalogApi'
import {
  collections,
  maxCatalogPrice,
  minCatalogPrice,
  networks,
  parseCatalogSearch,
} from './types'
import type { CatalogResponse, CatalogSearch, CatalogView } from './types'

const homeRoute = getRouteApi('/')
const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:gap-x-6 lg:gap-y-9'
const focusClass =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efae75]'

const formatPrice = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const views: { value: CatalogView; label: string }[] = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
]

const rangeInputClass = [
  'pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent',
  '[&::-webkit-slider-thumb]:pointer-events-auto',
  '[&::-webkit-slider-thumb]:size-4',
  '[&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:cursor-ew-resize',
  '[&::-webkit-slider-thumb]:rounded-full',
  '[&::-webkit-slider-thumb]:border-2',
  '[&::-webkit-slider-thumb]:border-[#241711]',
  '[&::-webkit-slider-thumb]:bg-[#d88e4f]',
  '[&::-moz-range-thumb]:pointer-events-auto',
  '[&::-moz-range-thumb]:size-3',
  '[&::-moz-range-thumb]:cursor-ew-resize',
  '[&::-moz-range-thumb]:rounded-full',
  '[&::-moz-range-thumb]:border-2',
  '[&::-moz-range-thumb]:border-[#241711]',
  '[&::-moz-range-thumb]:bg-[#d88e4f]',
  focusClass,
].join(' ')

function FilterOptions<T extends string>({
  legend,
  name,
  allLabel,
  options,
  selected,
  counts,
}: {
  legend: string
  name: string
  allLabel: string
  options: readonly T[]
  selected?: T
  counts?: Partial<Record<T, number>>
}) {
  const optionClass =
    'flex cursor-pointer justify-between gap-2 rounded px-2 py-1 text-xs text-[#ceb08d] hover:bg-[#3a2619] peer-checked:bg-[#3a2619] peer-checked:font-bold peer-checked:text-[#efae75] peer-focus-visible:outline-2 peer-focus-visible:outline-[#efae75]'

  return (
    <fieldset className="space-y-1">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>

      <label className="block">
        <input
          type="radio"
          name={name}
          value=""
          defaultChecked={!selected}
          className="peer sr-only"
        />
        <span className={optionClass}>{allLabel}</span>
      </label>

      {options.map((option) => (
        <label key={option} className="block">
          <input
            type="radio"
            name={name}
            value={option}
            defaultChecked={option === selected}
            className="peer sr-only"
          />
          <span className={optionClass}>
            {option}
            {counts?.[option] !== undefined && <span>({counts[option]})</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

function CatalogFilters({
  filters,
  counts,
  onApply,
}: {
  filters: CatalogSearch
  counts?: Pick<CatalogResponse, 'collectionCounts' | 'networkCounts'>
  onApply: (filters: CatalogSearch) => void
}) {
  const [minPrice, setMinPrice] = useState(filters.minPrice ?? minCatalogPrice)
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ?? maxCatalogPrice)

  const range = maxCatalogPrice - minCatalogPrice
  const start = ((minPrice - minCatalogPrice) / range) * 100
  const end = ((maxPrice - minCatalogPrice) / range) * 100

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    onApply(parseCatalogSearch({ ...filters, ...values, minPrice, maxPrice }))
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-sm bg-[#241711] p-4">
      <label htmlFor="busca-nfts" className="sr-only">Buscar NFTs</label>
      <input
        id="busca-nfts"
        name="q"
        type="search"
        defaultValue={filters.q ?? ''}
        maxLength={80}
        placeholder="Buscar NFTs"
        className={`w-full rounded border border-[#5b3b26] bg-[#160f0b] px-2 py-2 text-sm text-[#f5eee8] placeholder:text-[#ceb08d] ${focusClass}`}
      />

      <FilterOptions
        legend="Coleções"
        name="collection"
        allLabel="Todas as coleções"
        options={collections}
        selected={filters.collection}
        counts={counts?.collectionCounts}
      />

      <fieldset>
        <legend className="mb-1 text-sm font-bold">Faixa de preço</legend>

        <div className="relative h-7">
          <div
            aria-hidden="true"
            className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 rounded"
            style={{
              background: `linear-gradient(to right, #5b3b26 ${start}%, #d88e4f ${start}%, #d88e4f ${end}%, #5b3b26 ${end}%)`,
            }}
          />

          <input
            type="range"
            aria-label="Preço mínimo"
            aria-valuetext={`${formatPrice.format(minPrice)} ETH`}
            min={minCatalogPrice}
            max={maxCatalogPrice}
            step={0.01}
            value={minPrice}
            onChange={(event) =>
              setMinPrice(Math.min(event.currentTarget.valueAsNumber, maxPrice))
            }
            className={`${rangeInputClass} ${maxPrice === maxCatalogPrice ? 'z-10' : 'z-0'}`}
          />

          <input
            type="range"
            aria-label="Preço máximo"
            aria-valuetext={`${formatPrice.format(maxPrice)} ETH`}
            min={minCatalogPrice}
            max={maxCatalogPrice}
            step={0.01}
            value={maxPrice}
            onChange={(event) =>
              setMaxPrice(Math.max(event.currentTarget.valueAsNumber, minPrice))
            }
            className={`${rangeInputClass} ${maxPrice === maxCatalogPrice ? 'z-0' : 'z-10'}`}
          />
        </div>

        <p className="mt-1 text-xs text-[#f5eee8]">
          Preço: {formatPrice.format(minPrice)} – {formatPrice.format(maxPrice)} ETH
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" className="bg-[#d88e4f] text-[#160f0b] hover:bg-[#eda66a]">
            Aplicar
          </Button>
          <Link
            to="/"
            search={{}}
            hash="mercado"
            resetScroll={false}
            className={`text-xs text-[#efae75] underline ${focusClass}`}
          >
            Limpar filtros
          </Link>
        </div>
      </fieldset>

      <FilterOptions
        legend="Rede"
        name="network"
        allLabel="Todas as redes"
        options={networks}
        selected={filters.network}
        counts={counts?.networkCounts}
      />
    </form>
  )
}

export default function CatalogGrid() {
  const filters = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()

  const catalog = useQuery({
    queryKey: ['catalog', filters],
    queryFn: ({ signal }) => getCatalog(filters, signal),
    staleTime: 30_000,
    retry: false,
  })

  const data = catalog.data
  const selectedView = filters.view ?? 'all'

  function updateCatalog(values: CatalogSearch) {
    void navigate({
      to: '/',
      search: { ...values, page: undefined },
      hash: 'mercado',
      resetScroll: false,
    })
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(190px,26%)_minmax(0,1fr)]">
      <aside aria-label="Filtros e NFT em destaque" className="space-y-4">
        <CatalogFilters
          key={JSON.stringify([
            filters.q, filters.collection, filters.network, filters.minPrice, filters.maxPrice,
          ])}
          filters={filters}
          counts={data}
          onApply={updateCatalog}
        />

        <Link
          to="/nfts/$nftId"
          params={{ nftId: 'sage-nomad-009' }}
          className={`hidden overflow-hidden rounded-md bg-[#241711] lg:block ${focusClass}`}
        >
          <div className="px-4 py-3 text-center text-sm font-bold uppercase">
            <p className="text-[#efae75]">NFT em destaque</p>
            <p className="mt-1">Oferta limitada</p>
          </div>
          <img
            src={featuredArt}
            alt="Sage Nomad, macaco de chapéu verde e moletom roxo"
            loading="lazy"
            className="aspect-[4/5] w-full rounded-md object-cover"
          />
        </Link>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Vitrines do catálogo" className="flex flex-wrap gap-x-3 gap-y-1">
            {views.map(({ value, label }) => (
              <Link
                key={value}
                to="/"
                search={{ ...filters, view: value === 'all' ? undefined : value, page: undefined }}
                hash="mercado"
                resetScroll={false}
                aria-current={selectedView === value ? 'page' : undefined}
                className={`border-b-2 border-transparent py-1 text-xs hover:text-[#efae75] aria-[current=page]:border-[#d88e4f] aria-[current=page]:font-bold aria-[current=page]:text-[#efae75] ${focusClass}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <label className="flex flex-wrap items-center gap-1 text-xs">
            Ordenar por:
            <select
              value={filters.sort ?? 'recent'}
              onChange={(event) =>
                updateCatalog(parseCatalogSearch({ ...filters, sort: event.currentTarget.value }))
              }
              className={`rounded bg-[#160f0b] text-[#f5eee8] ${focusClass}`}
            >
              <option value="recent">Listados recentemente</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </label>
        </div>

        <p role="status" className="sr-only">
          {catalog.isPending
            ? 'Carregando NFTs…'
            : data
              ? `${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}`
              : ''}
        </p>

        {catalog.isPending && (
          <div aria-hidden="true" className={gridClass}>
            {Array.from({ length: 9 }, (_, index) => (
              <div key={index}>
                <div className="aspect-square rounded-md bg-[linear-gradient(110deg,#241711_35%,#453023_50%,#241711_65%)] bg-size-[200%_100%] motion-safe:animate-[catalog-shimmer_1.4s_linear_infinite]" />
                <div className="mt-2 h-4 w-3/4 rounded bg-[#241711]" />
                <div className="mt-1 h-4 w-1/3 rounded bg-[#241711]" />
              </div>
            ))}
          </div>
        )}

        {catalog.isError && (
          <div className="mb-4 rounded-md bg-[#241711] p-4">
            <p role="alert">Não foi possível atualizar o catálogo.</p>
            <Button type="button" className="mt-3" onClick={() => void catalog.refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {data?.items.length === 0 && (
          <p className="py-6 text-sm text-[#ceb08d]">
            {data.total === 0
              ? 'Nenhum NFT corresponde aos filtros selecionados.'
              : 'Esta página não tem resultados. Escolha outra página abaixo.'}
          </p>
        )}

        {data && data.items.length > 0 && (
          <ul className={gridClass}>
            {data.items.map((nft) => (
              <li key={nft.id}>
                <Link
                  to="/nfts/$nftId"
                  params={{ nftId: nft.id }}
                  className={`group block rounded-sm ${focusClass}`}
                >
                  <div className="rounded-sm bg-[#241711] p-1 sm:p-2">
                    <img
                      src={nft.imageUrl}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  </div>
                  <h3 className="mt-2 text-xs group-hover:text-[#efae75] sm:text-sm">
                    {nft.name}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-[#efae75] sm:text-sm">
                    {nft.priceEth} ETH
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {data && (data.totalPages > 1 || data.page > 1) && (
          <nav aria-label="Paginação do catálogo" className="mt-8 flex flex-wrap justify-end gap-2">
            {Array.from({ length: data.totalPages }, (_, index) => {
              const page = index + 1

              return (
                <Link
                  key={page}
                  to="/"
                  search={{ ...filters, page: page === 1 ? undefined : page }}
                  hash="mercado"
                  resetScroll={false}
                  aria-label={`Página ${page}`}
                  aria-current={data.page === page ? 'page' : undefined}
                  className={`rounded border border-[#5b3b26] px-3 py-2 text-xs aria-[current=page]:bg-[#d88e4f] aria-[current=page]:text-[#160f0b] ${focusClass}`}
                >
                  {page}
                </Link>
              )
            })}

            {data.page < data.totalPages && (
              <Link
                to="/"
                search={{ ...filters, page: data.page + 1 }}
                hash="mercado"
                resetScroll={false}
                aria-label="Próxima página"
                className={`rounded border border-[#5b3b26] px-3 py-2 text-xs ${focusClass}`}
              >
                →
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  )
}