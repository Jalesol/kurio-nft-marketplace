import type { CatalogNft } from './types'

export interface NftEdition {
  id: string
  label: string
  priceEth: string
  availableSupply: number
  maxPerOrder: number
}

export interface CollectorReview {
  id: string
  collector: string
  rating: number
  comment: string
}

export interface NftDetail extends CatalogNft {
  editions: NftEdition[]
  description: string
  reviews: CollectorReview[]
}