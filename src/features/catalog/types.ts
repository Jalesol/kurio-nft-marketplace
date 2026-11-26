export const collections = [
  'Arte digital',
  'Fotografia',
  'Música',
  'Arte 3D',
  'Colecionáveis',
  'Generativa',
  'Jogos',
  'Assinaturas',
  'Utilidade',
] as const

export const networks = ['Ethereum', 'Polygon', 'Solana'] as const
export const sortOptions = ['recent', 'price-asc', 'price-desc'] as const
export const catalogViews = ['all', 'new', 'trending'] as const

export const minCatalogPrice = 0.02
export const maxCatalogPrice = 12.3

export type Collection = (typeof collections)[number]
export type Network = (typeof networks)[number]
export type CatalogSort = (typeof sortOptions)[number]
export type CatalogView = (typeof catalogViews)[number]

export interface CatalogSearch {
  q?: string
  collection?: Collection
  network?: Network
  sort?: CatalogSort
  view?: CatalogView
  minPrice?: number
  maxPrice?: number
  page?: number
}

export interface CatalogNft {
  id: string
  name: string
  imageUrl: string
  priceEth: string
  collection: Collection
  network: Network
  isNew?: boolean
  isTrending?: boolean
}

export interface CatalogResponse {
  items: CatalogNft[]
  total: number
  page: number
  totalPages: number
  collectionCounts: Partial<Record<Collection, number>>
  networkCounts: Partial<Record<Network, number>>
}

function readNumber(value: unknown, fallback: number) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) return Number(value)
  return fallback
}

function readPrice(value: unknown, fallback: number) {
  const price = readNumber(value, fallback)
  if (!Number.isFinite(price)) return fallback

  const clamped = Math.min(maxCatalogPrice, Math.max(minCatalogPrice, price))
  return Math.round(clamped * 100) / 100
}

export function parseCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const q =
    typeof raw.q === 'string' || typeof raw.q === 'number'
      ? String(raw.q).trim().slice(0, 80)
      : ''
  const page = readNumber(raw.page, 1)
  const firstPrice = readPrice(raw.minPrice, minCatalogPrice)
  const secondPrice = readPrice(raw.maxPrice, maxCatalogPrice)
  const minPrice = Math.min(firstPrice, secondPrice)
  const maxPrice = Math.max(firstPrice, secondPrice)

  return {
    q: q || undefined,
    collection: collections.find((option) => option === raw.collection),
    network: networks.find((option) => option === raw.network),
    sort: sortOptions.find((option) => option === raw.sort && option !== 'recent'),
    view: catalogViews.find((option) => option === raw.view && option !== 'all'),
    minPrice: minPrice === minCatalogPrice ? undefined : minPrice,
    maxPrice: maxPrice === maxCatalogPrice ? undefined : maxPrice,
    page: Number.isSafeInteger(page) && page > 1 ? page : undefined,
  }
}