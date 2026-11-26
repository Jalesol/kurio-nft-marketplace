import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import SiteFooter from '@/components/layout/SiteFooter'
import { Button } from '@/components/ui/button'
import NftDetailTabs from '@/features/catalog/NftDetailTabs'
import NftEditionSelector from '@/features/catalog/NftEditionSelector'
import NftGallery from '@/features/catalog/NftGallery'
import RelatedNfts from '@/features/catalog/RelatedNfts'
import { getNft } from '@/services/catalogApi'

const detailRoute = getRouteApi('/nfts/$nftId')

const detailLayout =
  'grid items-start gap-6 md:grid-cols-[minmax(0,49fr)_minmax(0,51fr)] lg:gap-8'

function DetailSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Carregando detalhes do NFT…
      </p>

      <div aria-hidden="true" className={detailLayout}>
        <div className="grid min-w-0 gap-3 md:grid-cols-[clamp(42px,5vw,76px)_minmax(0,1fr)]">
          <div className="order-2 grid grid-cols-4 content-start gap-2 md:order-1 md:grid-cols-1">
            {[1, 2, 3, 4].map((thumbnail) => (
              <div key={thumbnail} className="aspect-square rounded-md bg-[#241711]" />
            ))}
          </div>

          <div className="self-start rounded-md bg-[#241711] p-3 md:order-2">
            <div className="aspect-square w-full rounded-lg bg-[linear-gradient(110deg,#241711_35%,#453023_50%,#241711_65%)] bg-size-[200%_100%] motion-safe:animate-[catalog-shimmer_1.4s_linear_infinite]" />
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="h-8 w-3/4 rounded bg-[#241711]" />
          <div className="h-6 w-1/3 rounded bg-[#241711]" />
          <div className="h-20 rounded bg-[#241711]" />
          <div className="h-8 w-2/3 rounded bg-[#241711]" />
          <div className="h-9 w-3/4 rounded bg-[#241711]" />
          <div className="h-4 w-1/3 rounded bg-[#241711]" />
          <div className="h-4 w-1/4 rounded bg-[#241711]" />
        </div>
      </div>
    </>
  )
}

export default function NftDetailPage() {
  const { nftId } = detailRoute.useParams()

  const nftQuery = useQuery({
    queryKey: ['nft', nftId],
    queryFn: ({ signal }) => getNft(nftId, signal),
    staleTime: 30_000,
    retry: false,
  })

  const nft = nftQuery.data
  const missing =
    isAxiosError(nftQuery.error) && nftQuery.error.response?.status === 404

  return (
    <>
      <main
        className={`bg-[#160f0b] font-mono text-[#f5eee8] ${
          nftQuery.isPending || (nft && !missing) ? 'lg:min-h-svh' : ''
        }`}
      >
        <div className="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-14 sm:px-8 lg:px-12">
          <nav aria-label="Localização na página" className="mb-3 text-xs">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link to="/" search={{}} className="hover:text-[#efae75] hover:underline">
                  Início
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  to="/"
                  search={{}}
                  hash="mercado"
                  className="hover:text-[#efae75] hover:underline"
                >
                  Mercado
                </Link>
              </li>
            </ol>
          </nav>

          {nftQuery.isPending && <DetailSkeleton />}

          {missing && (
            <h1 className="text-2xl font-bold">NFT não encontrado</h1>
          )}

          {nftQuery.isError && !missing && (
            <div className="rounded-lg bg-[#241711] p-4">
              <p role="alert">Não foi possível carregar este NFT.</p>
              <Button type="button" className="mt-3" onClick={() => void nftQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {nft && !missing && (
            <>
              <article>
                <div className={detailLayout}>
                  <NftGallery
                    key={nft.id}
                    name={nft.name}
                    imageUrl={nft.imageUrl}
                    additionalImages={[nft.imageUrl, nft.imageUrl, nft.imageUrl]}
                  />

                  <div className="min-w-0">
                    <NftEditionSelector key={nft.id} nft={nft} />

                    <dl className="mt-4 space-y-2 text-xs text-[#ceb08d]">
                      <div className="flex gap-2">
                        <dt className="font-bold text-[#f5eee8]">Coleção:</dt>
                        <dd>{nft.collection}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="font-bold text-[#f5eee8]">Rede:</dt>
                        <dd>{nft.network}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <NftDetailTabs key={nft.id} nft={nft} />
              </article>

              <RelatedNfts nftId={nft.id} />
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
