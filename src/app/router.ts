import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { parseCatalogSearch } from '@/features/catalog/types'
import NotFoundPage from '@/routes/NotFoundPage'
import SiteLayout from '../components/layout/SiteLayout'

type ProfileSection = 'profile' | 'wallets' | 'orders'

const rootRoute = createRootRoute({
  component: SiteLayout,
  notFoundComponent: NotFoundPage,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('@/App')),
  validateSearch: parseCatalogSearch,
})

const nftDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  component: lazyRouteComponent(() => import('@/routes/NftDetailPage')),
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: lazyRouteComponent(() => import('@/routes/CartPage')),
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: lazyRouteComponent(() => import('@/routes/CheckoutRoute')),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: lazyRouteComponent(() => import('@/routes/ProfilePage')),
  validateSearch: (search: Record<string, unknown>): { section: ProfileSection } => ({
    section:
      search.section === 'wallets' || search.section === 'orders'
        ? search.section
        : 'profile',
  }),
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    homeRoute,
    nftDetailRoute,
    cartRoute,
    checkoutRoute,
    profileRoute,
  ]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
