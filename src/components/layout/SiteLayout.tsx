import { Outlet, useLocation } from '@tanstack/react-router'
import CheckoutRealtime from '@/features/cart/CheckoutRealtime'
import CatalogRealtime from '@/features/catalog/CatalogRealtime'
import SiteHeader from './SiteHeader'

export default function SiteLayout() {
  const pathname = useLocation({ select: (location) => location.pathname })

  return (
    <div className="min-h-screen bg-[#160f0b]">
      <SiteHeader />
      <CatalogRealtime />
      {pathname === '/checkout' && <CheckoutRealtime />}
      <Outlet />
    </div>
  )
}