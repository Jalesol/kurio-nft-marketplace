import type { NftDetail } from '@/features/catalog/detailTypes'
import type { CatalogResponse, CatalogSearch } from '@/features/catalog/types'
import { api } from './api'

export async function getCatalog(
  filters: CatalogSearch,
  signal: AbortSignal,
): Promise<CatalogResponse> {
  const { data } = await api.get<CatalogResponse>('/nfts', {
    params: filters,
    signal,
  })

  return data
}

export async function getNft(
  nftId: string,
  signal: AbortSignal,
): Promise<NftDetail> {
  const { data } = await api.get<NftDetail>(
    `/nfts/${encodeURIComponent(nftId)}`,
    { signal },
  )

  return data
}