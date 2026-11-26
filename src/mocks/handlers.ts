import { delay, http, HttpResponse } from 'msw'
import emeraldApe from '@/assets/nfts01.jpg'
import sageNomad from '@/assets/nfts02.jpg'
import goldenBeat from '@/assets/nfts03.jpg'
import neonVessel from '@/assets/nfts04.jpg'
import type { NftDetail } from '@/features/catalog/detailTypes'
import { collections, networks, parseCatalogSearch } from '@/features/catalog/types'
import type { CatalogNft, CatalogResponse } from '@/features/catalog/types'
import { createCartHandlers } from './cartHandlers'
import { emitNftUpdate } from './checkoutSocket'
import { createMockEditions, readEditionUpdate, saveEditionUpdate } from './editions'
import { getMockReviews } from './reviews'

const pageSize = 9
const baseEditionId = 'one-of-fifty'

const featuredItems: CatalogNft[] = [
  { id: 'emerald-ape-042', name: 'Emerald Ape #042', imageUrl: emeraldApe, priceEth: '1.19', collection: 'Arte digital', network: 'Ethereum', isTrending: true },
  { id: 'sage-nomad-009', name: 'Sage Nomad #009', imageUrl: sageNomad, priceEth: '1.69', collection: 'Arte digital', network: 'Polygon', isNew: true },
  { id: 'neon-vessel-552', name: 'Neon Vessel #552', imageUrl: neonVessel, priceEth: '1.99', collection: 'Arte 3D', network: 'Ethereum', isTrending: true },
  { id: 'cosmic-bloom-118', name: 'Cosmic Bloom #118', imageUrl: sageNomad, priceEth: '1.29', collection: 'Arte 3D', network: 'Solana', isNew: true },
  { id: 'violet-nomad-314', name: 'Violet Nomad #314', imageUrl: sageNomad, priceEth: '1.39', collection: 'Arte digital', network: 'Ethereum' },
  { id: 'ivory-baron-088', name: 'Ivory Baron #088', imageUrl: neonVessel, priceEth: '1.79', collection: 'Arte 3D', network: 'Ethereum' },
  { id: 'golden-beat-207', name: 'Golden Beat #207', imageUrl: goldenBeat, priceEth: '0.99', collection: 'Música', network: 'Polygon', isTrending: true },
  { id: 'golden-frequency-071', name: 'Golden Frequency #071', imageUrl: goldenBeat, priceEth: '0.59', collection: 'Música', network: 'Solana', isNew: true },
  { id: 'golden-signal-160', name: 'Golden Signal #160', imageUrl: goldenBeat, priceEth: '0.39', collection: 'Música', network: 'Ethereum' },
]

const extraNames = [
  'Amber Horizon', 'Jade Echo', 'Velvet Orbit', 'Silver Atlas',
  'Copper Drift', 'Indigo Canvas', 'Forest Key', 'Moon Archive',
  'Cobalt Pass', 'Ruby Lantern', 'Ivory Garden', 'Sage Current',
  'Copper Arcade', 'Velvet Frame', 'Amber Portal', 'Jade Pattern',
  'Indigo Token', 'Silver Studio', 'Forest Beacon', 'Moon Capsule',
  'Ruby Orbit', 'Cobalt Garden', 'Jade Lantern', 'Amber Atlas',
  'Indigo Archive', 'Silver Gate', 'Copper Canvas',
]

const artwork = [emeraldApe, sageNomad, neonVessel, goldenBeat]

const catalog: CatalogNft[] = [
  ...featuredItems,
  ...extraNames.map((name, index): CatalogNft => {
    const number = 601 + index
    const cents = 45 + index * 21
    const priceEth = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

    return {
      id: `kurio-edition-${number}`,
      name: `${name} #${number}`,
      imageUrl: artwork[index % artwork.length]!,
      priceEth,
      collection: collections[index % collections.length]!,
      network: networks[(index + Math.floor(index / 9)) % networks.length]!,
      isNew: index % 4 === 0,
      isTrending: index % 5 === 0,
    }
  }),
]

function toWei(priceEth: string) {
  const [whole, fraction = ''] = priceEth.split('.')
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))
}

function withCurrentPrice(nft: CatalogNft): CatalogNft {
  const update = readEditionUpdate(nft.id)
  return update ? { ...nft, priceEth: update.priceEth } : nft
}

const collectionCounts = Object.fromEntries(
  collections.map((collection) => [
    collection,
    catalog.filter((nft) => nft.collection === collection).length,
  ]),
)

const networkCounts = Object.fromEntries(
  networks.map((network) => [
    network,
    catalog.filter((nft) => nft.network === network).length,
  ]),
)

export const handlers = [
  ...createCartHandlers(catalog),

  http.post('/api/mock/nfts/:nftId/update', async ({ request, params }) => {
    const nft = catalog.find((item) => item.id === params.nftId)
    if (!nft) return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })

    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return HttpResponse.json({ message: 'Informe o preço ou o estoque.' }, { status: 400 })
    }

    const next = body as Record<string, unknown>
    const current = createMockEditions(nft.priceEth, nft.id).find(
      (edition) => edition.id === baseEditionId,
    )!

    const priceEth = next.priceEth ?? current.priceEth
    const availableSupply = next.availableSupply ?? current.availableSupply

    if (
      typeof priceEth !== 'string' ||
      !/^\d{1,2}(?:\.\d{1,2})?$/.test(priceEth) ||
      toWei(priceEth) <= 0n ||
      typeof availableSupply !== 'number' ||
      !Number.isSafeInteger(availableSupply) ||
      availableSupply < 0 ||
      availableSupply > 50
    ) {
      return HttpResponse.json({ message: 'Preço ou estoque inválido.' }, { status: 400 })
    }

    const version = (readEditionUpdate(nft.id)?.version ?? 0) + 1
    saveEditionUpdate(nft.id, { priceEth, availableSupply, version })

    const event = {
      eventId: `${nft.id}:${baseEditionId}:${version}`,
      nftId: nft.id,
      version,
    }
    emitNftUpdate(event)

    return HttpResponse.json({ ...event, priceEth, availableSupply })
  }),

  http.get('/api/nfts/:nftId', async ({ params }) => {
    await delay(500)

    const nft = catalog.find((item) => item.id === params.nftId)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    }

    const detail: NftDetail = {
      ...withCurrentPrice(nft),
      editions: createMockEditions(nft.priceEth, nft.id),
      description:
        nft.id === 'emerald-ape-042'
          ? 'Um colecionável digital finalizado à mão da coleção Kurio Editions, com arte desbloqueável e acesso para colecionadores.'
          : `${nft.name} é um colecionável digital na rede ${nft.network}.`,
      reviews: getMockReviews(nft.id),
    }

    return HttpResponse.json(detail)
  }),

  http.get('/api/nfts', async ({ request }) => {

    if (sessionStorage.getItem('kurio:catalog-fail-once') === '1') {
      sessionStorage.removeItem('kurio:catalog-fail-once')
      await delay(1800)
      return HttpResponse.json(
        { message: 'Catálogo temporariamente indisponível.' },
        { status: 503 },
      )
    }

    const url = new URL(request.url)
    const filters = parseCatalogSearch(Object.fromEntries(url.searchParams))
    const q = filters.q?.toLocaleLowerCase('pt-BR')
    const min = filters.minPrice === undefined ? undefined : toWei(filters.minPrice.toFixed(2))
    const max = filters.maxPrice === undefined ? undefined : toWei(filters.maxPrice.toFixed(2))
    const page = filters.page ?? 1

    await delay(500)

    const filtered = catalog.map(withCurrentPrice).filter((nft) => {
      const price = toWei(nft.priceEth)

      return (
        (!q || nft.name.toLocaleLowerCase('pt-BR').includes(q)) &&
        (!filters.collection || nft.collection === filters.collection) &&
        (!filters.network || nft.network === filters.network) &&
        (min === undefined || price >= min) &&
        (max === undefined || price <= max) &&
        (filters.view !== 'new' || nft.isNew) &&
        (filters.view !== 'trending' || nft.isTrending)
      )
    })

    if (filters.sort) {
      filtered.sort((left, right) => {
        const difference = toWei(left.priceEth) - toWei(right.priceEth)
        if (difference === 0n) return 0
        const ascending = difference < 0n ? -1 : 1
        return filters.sort === 'price-asc' ? ascending : -ascending
      })
    }

    const offset = (page - 1) * pageSize
    const response: CatalogResponse = {
      items: filtered.slice(offset, offset + pageSize),
      total: filtered.length,
      page,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      collectionCounts,
      networkCounts,
    }

    return HttpResponse.json(response)
  }),
]