import { http, HttpResponse } from 'msw'
import type { CartItem, CartItemInput, CartSnapshot } from '@/features/cart/types'
import type { CatalogNft } from '@/features/catalog/types'
import { createCheckoutHandlers } from './checkoutHandlers'
import type { SavedOrder } from './checkoutHandlers'
import { createMockEditions } from './editions'

const storageKey = 'kurio:guest-cart:v1'
const legacyCouponKey = 'kurio:guest-cart:coupon:v1'
const validCoupon = 'KURIO10'
const weiPerEth = 10n ** 18n

interface CartState {
  entries: CartItemInput[]
  coupon: string | null
  orders: SavedOrder[]
}

function toWei(amount: string) {
  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole) * weiPerEth + BigInt(fraction.padEnd(18, '0'))
}

function toEth(amount: bigint) {
  const whole = amount / weiPerEth
  const fraction = (amount % weiPerEth)
    .toString()
    .padStart(18, '0')
    .replace(/0+$/, '')

  return fraction ? `${whole}.${fraction}` : whole.toString()
}

function isCartItemInput(value: unknown): value is CartItemInput {
  if (typeof value !== 'object' || value === null) return false

  const item = value as Partial<CartItemInput>
  return (
    typeof item.nftId === 'string' &&
    typeof item.editionId === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isSafeInteger(item.quantity) &&
    item.quantity > 0
  )
}

function readState(): CartState {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as
      | Partial<CartState>
      | unknown[]
      | null

    if (Array.isArray(saved)) {
      return {
        entries: saved.filter(isCartItemInput),
        coupon: localStorage.getItem(legacyCouponKey),
        orders: [],
      }
    }

    return {
      entries: Array.isArray(saved?.entries) ? saved.entries.filter(isCartItemInput) : [],
      coupon: saved?.coupon ?? null,
      orders: Array.isArray(saved?.orders) ? saved.orders : [],
    }
  } catch {
    return { entries: [], coupon: null, orders: [] }
  }
}

function writeState(state: CartState) {
  localStorage.setItem(storageKey, JSON.stringify(state))
}

function errorResponse(message: string, status: number) {
  return HttpResponse.json({ message }, { status })
}

export function createCartHandlers(catalog: CatalogNft[]) {
  function resolveItem(nftId: string, editionId: string) {
    const nft = catalog.find((item) => item.id === nftId)
    if (!nft) return undefined

    const edition = createMockEditions(nft.priceEth, nft.id).find(
      (item) => item.id === editionId,
    )
    return edition ? { nft, edition } : undefined
  }

  function snapshot(state: CartState): CartSnapshot {
    const items: CartItem[] = []
    let subtotal = 0n

    for (const entry of state.entries) {
      const result = resolveItem(entry.nftId, entry.editionId)
      if (!result) continue

      const { nft, edition } = result
      const lineSubtotal = toWei(edition.priceEth) * BigInt(entry.quantity)
      subtotal += lineSubtotal

      items.push({
        ...entry,
        name: nft.name,
        imageUrl: nft.imageUrl,
        editionLabel: edition.label,
        unitPriceEth: edition.priceEth,
        lineSubtotalEth: toEth(lineSubtotal),
        quantityLimit: Math.min(edition.availableSupply, edition.maxPerOrder),
        availableSupply: edition.availableSupply,
      })
    }

    const couponCode = items.length > 0 && state.coupon === validCoupon
      ? validCoupon
      : null
    const discount = couponCode ? subtotal / 10n : 0n
    const networkFee = items.length > 0 ? toWei('0.016') : 0n

    return {
      items,
      subtotalEth: toEth(subtotal),
      discountEth: toEth(discount),
      networkFeeEth: toEth(networkFee),
      totalEth: toEth(subtotal - discount + networkFee),
      couponCode,
    }
  }

  function saveCart(state: CartState) {
    const saved = state.entries.length ? state : { ...state, coupon: null }
    writeState(saved)
    return HttpResponse.json(snapshot(saved))
  }

  async function updateItem(request: Request, mode: 'add' | 'replace') {
    const input: unknown = await request.json().catch(() => null)
    if (!isCartItemInput(input)) {
      return errorResponse('Informe um NFT, uma edição e uma quantidade inteira positiva.', 400)
    }

    const result = resolveItem(input.nftId, input.editionId)
    if (!result) return errorResponse('NFT ou edição não encontrada.', 404)

    const state = readState()
    const index = state.entries.findIndex(
      (entry) => entry.nftId === input.nftId && entry.editionId === input.editionId,
    )

    if (mode === 'replace' && index === -1) {
      return errorResponse('Item não encontrado no carrinho.', 404)
    }

    const previousQuantity = state.entries[index]?.quantity ?? 0
    const quantity = mode === 'add' ? previousQuantity + input.quantity : input.quantity
    const limit = Math.min(result.edition.availableSupply, result.edition.maxPerOrder)

    if (!Number.isSafeInteger(quantity) || quantity > limit) {
      return errorResponse(
        limit === 0
          ? 'Esta edição está esgotada.'
          : `Você pode ter até ${limit} unidade(s) desta edição no carrinho.`,
        409,
      )
    }

    const entry = { nftId: input.nftId, editionId: input.editionId, quantity }
    if (index === -1) state.entries.push(entry)
    else state.entries[index] = entry

    return saveCart(state)
  }

  async function updateCoupon(request: Request) {
    const body: unknown = await request.json().catch(() => null)

    if (
      typeof body !== 'object' ||
      body === null ||
      !('code' in body) ||
      (body.code !== null && typeof body.code !== 'string')
    ) {
      return errorResponse('Informe um código promocional válido.', 400)
    }

    const state = readState()
    if (body.code === null) return saveCart({ ...state, coupon: null })

    const code = body.code.trim().toUpperCase()
    if (code === 'EXPIRADO') return errorResponse('Este código promocional expirou.', 422)
    if (code !== validCoupon) return errorResponse('Código promocional inválido.', 422)

    if (!snapshot(state).items.length) {
      return errorResponse('Adicione um NFT ao carrinho para aplicar o cupom.', 409)
    }

    return saveCart({ ...state, coupon: code })
  }

  return [
    ...createCheckoutHandlers({
      read: () => snapshot(readState()),
      findOrder: (email, key) =>
        readState().orders.find((order) => order.email === email && order.key === key),
      confirm: (order) => {
        const state = readState()
        const entries = state.entries.flatMap((entry) => {
          const purchased = order.receipt.cart.items.find(
            (item) => item.nftId === entry.nftId && item.editionId === entry.editionId,
          )
          const quantity = entry.quantity - (purchased?.quantity ?? 0)
          return quantity > 0 ? [{ ...entry, quantity }] : []
        })

        writeState({
          entries,
          coupon: entries.length ? state.coupon : null,
          orders: [...state.orders, order],
        })
      },
    }),

    http.get('/api/cart', () => HttpResponse.json(snapshot(readState()))),
    http.put('/api/cart/coupon', ({ request }) => updateCoupon(request)),
    http.post('/api/cart/items', ({ request }) => updateItem(request, 'add')),
    http.patch('/api/cart/items', ({ request }) => updateItem(request, 'replace')),

    http.delete('/api/cart/items/:nftId/:editionId', ({ params }) => {
      const state = readState()
      const entries = state.entries.filter(
        (entry) => entry.nftId !== params.nftId || entry.editionId !== params.editionId,
      )
      return saveCart({ ...state, entries })
    }),
  ]
}