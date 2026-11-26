import { isAxiosError } from 'axios'
import type { CartItemInput, CartSnapshot } from '@/features/cart/types'
import { api } from './api'

export async function getCart(signal: AbortSignal) {
  const { data } = await api.get<CartSnapshot>('/cart', { signal })

  if (!Array.isArray(data?.items)) {
    throw new Error('A API do carrinho retornou uma resposta inesperada.')
  }

  return data
}

export async function addCartItem(item: CartItemInput) {
  const { data } = await api.post<CartSnapshot>('/cart/items', item)
  return data
}

export async function changeCartQuantity(item: CartItemInput) {
  const { data } = await api.patch<CartSnapshot>('/cart/items', item)
  return data
}

export async function removeCartItem({
  nftId,
  editionId,
}: Pick<CartItemInput, 'nftId' | 'editionId'>) {
  const path = `/cart/items/${encodeURIComponent(nftId)}/${encodeURIComponent(editionId)}`
  const { data } = await api.delete<CartSnapshot>(path)

  return data
}

export async function setCartCoupon(code: string | null) {
  const { data } = await api.put<CartSnapshot>('/cart/coupon', { code })
  return data
}

export function cartErrorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return (
      error.response?.data?.message ??
      'Não foi possível acessar o carrinho. Tente novamente.'
    )
  }

  if (error instanceof Error) return error.message

  return 'Não foi possível atualizar o carrinho. Tente novamente.'
}