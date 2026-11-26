import type { NftEdition } from '@/features/catalog/detailTypes'

export interface EditionUpdate {
  priceEth: string
  availableSupply: number
  version: number
}

const updateKeyPrefix = 'kurio:nft-edition:v1:'

export function readEditionUpdate(nftId: string): EditionUpdate | null {
  try {
    const saved = localStorage.getItem(`${updateKeyPrefix}${nftId}`)
    return saved ? JSON.parse(saved) as EditionUpdate : null
  } catch {
    return null
  }
}

export function saveEditionUpdate(nftId: string, update: EditionUpdate) {
  localStorage.setItem(`${updateKeyPrefix}${nftId}`, JSON.stringify(update))
}

export function createMockEditions(basePriceEth: string, nftId?: string): NftEdition[] {
  const update = nftId ? readEditionUpdate(nftId) : null

  return [
    {
      id: 'one-of-one',
      label: '1/1',
      priceEth: '2.90',
      availableSupply: 1,
      maxPerOrder: 1,
    },
    {
      id: 'one-of-ten',
      label: '1/10',
      priceEth: '2.10',
      availableSupply: 0,
      maxPerOrder: 2,
    },
    {
      id: 'one-of-fifty',
      label: '1/50',
      priceEth: update?.priceEth ?? basePriceEth,
      availableSupply: update?.availableSupply ?? 5,
      maxPerOrder: 3,
    },
    {
      id: 'open',
      label: 'Aberta',
      priceEth: '0.35',
      availableSupply: 30,
      maxPerOrder: 10,
    },
  ]
}