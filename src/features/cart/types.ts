export interface CartItemInput {
  nftId: string
  editionId: string
  quantity: number
}

export interface CartItem extends CartItemInput {
  name: string
  imageUrl: string
  editionLabel: string
  unitPriceEth: string
  lineSubtotalEth: string
  quantityLimit: number
  availableSupply?: number
}

export interface CartSnapshot {
  items: CartItem[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
}