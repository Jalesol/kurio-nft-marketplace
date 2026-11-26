import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { NftDetail } from './detailTypes'

const tabClass =
  'h-full flex-none rounded-none border-0 border-b-2 border-transparent px-0 text-[#f5eee8] after:hidden data-[state=active]:border-b-[#d88e4f] data-[state=active]:bg-transparent data-[state=active]:text-[#efae75] data-[state=active]:shadow-none focus-visible:ring-[#efae75]'

export default function NftDetailTabs({ nft }: { nft: NftDetail }) {
  return (
    <Tabs defaultValue="details" className="mt-10 md:mt-14">
      <TabsList
        aria-label="Informações do NFT"
        className="h-auto w-full flex-wrap justify-start gap-x-5 gap-y-1 rounded-none border-b border-[#5b3b26] bg-transparent p-0"
      >
        <TabsTrigger value="details" className={`${tabClass} py-3`}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={`${tabClass} py-3`}>
          Avaliações de colecionadores ({nft.reviews.length})
        </TabsTrigger>
      </TabsList>

    <TabsContent value="details" className="py-5 text-base leading-relaxed text-[#ceb08d]">
  <p className="mb-6">{nft.description}</p>

  <dl className="space-y-5">
    <div>
      <dt className="text-lg font-bold text-[#f5eee8]">Coleção</dt>
      <dd className="mt-1">{nft.collection}</dd>
    </div>

    <div>
      <dt className="text-lg font-bold text-[#f5eee8]">Rede</dt>
      <dd className="mt-1">{nft.network}</dd>
    </div>

    <div>
      <dt className="text-lg font-bold text-[#f5eee8]">Contrato</dt>
      <dd className="mt-1">Transações e registros de propriedade simulados para a demonstração da Kurio.</dd>
    </div>

    <div>
      <dt className="text-lg font-bold text-[#f5eee8]">Direitos autorais</dt>
      <dd className="mt-1">A demonstração não informa uma licença de uso para esta obra.</dd>
    </div>
  </dl>
</TabsContent>

      <TabsContent value="reviews" className="py-4 text-sm">
        {nft.reviews.length === 0 ? (
          <p className="text-[#ceb08d]">Este NFT ainda não recebeu avaliações.</p>
        ) : (
          <ul className="space-y-3">
            {nft.reviews.map((review) => (
              <li key={review.id} className="rounded-lg bg-[#241711] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-bold">{review.collector}</h2>
                  <span className="text-[#efae75]">{review.rating} de 5 estrelas</span>
                </div>
                <p className="mt-2 text-[#ceb08d]">{review.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  )
}