import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCartItem,
  changeCartQuantity,
  getCart,
  removeCartItem,
  setCartCoupon,
} from '@/services/cartApi'
import type { CartItemInput } from './types'

const cartKey = ['cart', 'guest'] as const

type CartAction =
  | { type: 'add' | 'change'; item: CartItemInput }
  | { type: 'remove'; item: Pick<CartItemInput, 'nftId' | 'editionId'> }
  | { type: 'coupon'; code: string | null }

export function useCart() {
  return useQuery({
    queryKey: cartKey,
    queryFn: ({ signal }) => getCart(signal),
    retry: false,
  })
}

export function useCartMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: 'guest-cart' },
    mutationFn: (action: CartAction) => {
      switch (action.type) {
        case 'add':
          return addCartItem(action.item)
        case 'change':
          return changeCartQuantity(action.item)
        case 'remove':
          return removeCartItem(action.item)
        case 'coupon':
          return setCartCoupon(action.code)
      }
    },
    onSuccess: async (snapshot) => {
      await queryClient.cancelQueries({ queryKey: cartKey })
      queryClient.setQueryData(cartKey, snapshot)
    },
  })
}