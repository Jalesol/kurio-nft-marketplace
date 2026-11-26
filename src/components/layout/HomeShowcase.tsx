import { Link } from '@tanstack/react-router'
import emeraldApe from '@/assets/nfts01.jpg'
import sageNomad from '@/assets/nfts02.jpg'
import goldenBeat from '@/assets/nfts03.jpg'
import neonVessel from '@/assets/nfts04.jpg'
import type { CatalogSearch } from '@/features/catalog/types'

const promotions: {
  title: string
  description: string
  image: string
  search: CatalogSearch
}[] = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: emeraldApe,
    search: { view: 'new' },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    description: 'Explore novos artistas, coleções verificadas e obras digitais.',
    image: neonVessel,
    search: { collection: 'Arte digital' },
  },
]

const journal = [
  {
    title: 'Como funciona a propriedade de NFTs',
    description: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: neonVessel,
    date: '12 de setembro',
    readingTime: 6,
  },
  {
    title: '10 artistas digitais para acompanhar',
    description: 'Conheça criadores que moldam a cultura digital.',
    image: emeraldApe,
    date: '13 de setembro',
    readingTime: 2,
  },
  {
    title: 'Raridade, atributos e procedência',
    description: 'Entenda como o histórico e os atributos identificam uma peça.',
    image: sageNomad,
    date: '15 de setembro',
    readingTime: 3,
  },
  {
    title: 'Como proteger sua carteira',
    description: 'Cuide dos seus ativos digitais e da sua identidade.',
    image: goldenBeat,
    date: '15 de setembro',
    readingTime: 2,
  },
]

export default function HomeShowcase() {
  return (
    <>
      <section
        aria-label="Coleções em destaque"
        className="grid gap-4 pt-3 md:grid-cols-2"
      >
        {promotions.map((promotion) => (
          <article
            key={promotion.title}
            className="grid grid-cols-[minmax(0,45%)_minmax(0,1fr)] overflow-hidden rounded-md bg-[#241711]"
          >
            <img
              src={promotion.image}
              alt=""
              loading="lazy"
              className="h-full min-h-36 w-full object-cover"
            />
            <div className="flex flex-col items-end justify-center gap-2 p-3 text-right sm:p-4">
              <h2 className="text-sm font-bold">{promotion.title}</h2>
              <p className="text-xs leading-relaxed text-[#ceb08d]">
                {promotion.description}
              </p>
              <Link
                to="/"
                search={promotion.search}
                hash="mercado"
                aria-label={`Explorar ${promotion.title.toLocaleLowerCase('pt-BR')}`}
                className="rounded bg-[#d88e4f] px-3 py-2 text-xs font-bold text-[#160f0b] hover:bg-[#eda66a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efae75]"
              >
                Explorar →
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="journal-title" className="py-12 md:py-20">
        <h2 id="journal-title" className="text-center text-xl font-bold">
          Diário da Cunhagem
        </h2>
        <p className="mt-2 text-center text-xs leading-relaxed text-[#ceb08d]">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {journal.map((entry) => (
            <article key={entry.title} className="overflow-hidden rounded-md bg-[#241711]">
              <img src={entry.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                <p className="text-[11px] text-[#ceb08d]">
                  {entry.date} · {entry.readingTime} min de leitura
                </p>
                <h3 className="text-sm font-bold leading-snug">{entry.title}</h3>
                <p className="text-xs leading-relaxed text-[#ceb08d]">{entry.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}