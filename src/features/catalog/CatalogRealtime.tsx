import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'

interface NftUpdate {
  eventId: string
  nftId: string
  version: number
}

export default function CatalogRealtime() {
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let disposed = false
    let socket: Socket | undefined
    const versions = new Map<string, number>()

    function refresh(nftId?: string) {
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
      void queryClient.invalidateQueries({ queryKey: nftId ? ['nft', nftId] : ['nft'] })
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['cart-recommendations'] })
    }

    function onConnect() {
      refresh()
    }

    function onNftUpdated(update: NftUpdate) {
      if (
        disposed ||
        typeof update?.eventId !== 'string' ||
        typeof update.nftId !== 'string' ||
        !Number.isSafeInteger(update.version) ||
        update.version <= (versions.get(update.nftId) ?? 0)
      ) {
        return
      }

      versions.set(update.nftId, update.version)
      setNotice('O preço ou estoque de um NFT mudou. Confira os valores antes de finalizar a compra.')
      refresh(update.nftId)
    }

    async function connect() {
      try {
        const { io } = await import('socket.io-client')
        if (disposed) return

        socket = io(window.location.origin, {
          path: '/kurio-realtime/',
          transports: ['websocket'],
          autoConnect: false,
          forceNew: true,
        })

        socket.on('connect', onConnect)
        socket.on('nft.updated', onNftUpdated)
        socket.connect()
      } catch (error) {
        if (!disposed) console.error('Não foi possível iniciar as atualizações do catálogo.', error)
      }
    }

    void connect()

    return () => {
      disposed = true
      socket?.off('connect', onConnect)
      socket?.off('nft.updated', onNftUpdated)
      socket?.disconnect()
    }
  }, [queryClient])

  return (
    <div role="status" className={notice ? 'mx-auto max-w-[1200px] px-5 py-3 text-xs text-[#efae75] sm:px-8 lg:px-12' : 'sr-only'}>
      {notice}
    </div>
  )
}