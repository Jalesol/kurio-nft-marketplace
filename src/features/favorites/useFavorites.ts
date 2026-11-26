import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CheckoutSession } from '@/mocks/checkoutHandlers'
import { api } from '@/services/api'

type FavoriteChange = { nftId: string; saved: boolean }
type FavoritesResponse = { ids: string[] }

export function useFavorites() {
  const queryClient = useQueryClient()
  const session = useQuery({
    queryKey: ['checkout-session'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ session: CheckoutSession | null }>('/checkout/session', { signal })
      return data.session
    },
    retry: false,
  })

  const token = session.data?.token
  const queryKey = ['favorites', token] as const
  const headers = { Authorization: `Bearer ${token}` }

  const favorites = useQuery({
    queryKey,
    enabled: Boolean(token),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<FavoritesResponse>('/account/favorites', { headers, signal })
      return data.ids
    },
    retry: false,
  })

  const change = useMutation({
    retry: false,
    mutationFn: async ({ nftId, saved }: FavoriteChange) => {
      const path = `/account/favorites/${encodeURIComponent(nftId)}`
      if (saved) await api.put(path, undefined, { headers })
      else await api.delete(path, { headers })
    },
    onMutate: async ({ nftId, saved }) => {
      await queryClient.cancelQueries({ queryKey, exact: true })
      const previous = queryClient.getQueryData<string[]>(queryKey)

      if (previous) {
        queryClient.setQueryData(queryKey, saved
          ? [...new Set([...previous, nftId])]
          : previous.filter((id) => id !== nftId))
      }

      return { previous, queryKey }
    },
    onError: (_error, _change, context) => {
      if (context?.previous && queryClient.getQueryState(context.queryKey)) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: (_data, _error, _change, context) =>
      queryClient.invalidateQueries({ queryKey: context?.queryKey ?? queryKey, exact: true }),
  })

  return { session, favorites, change }
}
