import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import emeraldApe from '@/assets/nfts01.jpg'
import sageNomad from '@/assets/nfts02.jpg'
import neonVessel from '@/assets/nfts04.jpg'
import HomeShowcase from '@/components/layout/HomeShowcase'
import SiteFooter from '@/components/layout/SiteFooter'
import { Button } from '@/components/ui/button'
import CatalogGrid from '@/features/catalog/CatalogGrid'
import type { CatalogSearch } from '@/features/catalog/types'

interface HeroSlide {
  title: string
  description: string
  image: string
  imageAlt: string
  search: CatalogSearch
}

const slides: [HeroSlide, HeroSlide, HeroSlide] = [
  {
    title: 'Seja dono do futuro da arte digital',
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    image: emeraldApe,
    imageAlt: 'Emerald Ape, macaco de óculos escuros e jaqueta verde',
    search: {},
  },
  {
    title: 'Descubra os novos lançamentos',
    description:
      'Explore novas obras digitais e conheça as edições que acabaram de chegar à Kurio.',
    image: sageNomad,
    imageAlt: 'Sage Nomad, macaco de chapéu verde e moletom roxo',
    search: { view: 'new' },
  },
  {
    title: 'Explore os NFTs em alta',
    description:
      'Veja as obras em destaque no mercado e encontre a próxima peça da sua coleção.',
    image: neonVessel,
    imageAlt: 'Neon Vessel, macaco de blazer claro e gola verde',
    search: { view: 'trending' },
  },
]

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0)
  const slide = slides[activeIndex] ?? slides[0]

  return (
    <>
      <main className="min-h-screen bg-[#160f0b] font-mono text-[#f5eee8]">
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <section
            aria-label="Destaques da Kurio"
            className="pt-6 pb-10 md:pt-8 md:pb-16"
          >
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,38%)] md:gap-10">
              <div className="md:pl-6">
                <p className="mb-3 text-xs tracking-wider">Bem-vindo à Kurio</p>

                <h1
                  aria-live="polite"
                  className="max-w-[23ch] text-2xl leading-snug font-bold uppercase sm:text-3xl lg:text-4xl"
                >
                  {slide.title}
                </h1>

                <p className="mt-3 max-w-[54ch] text-sm leading-relaxed text-[#ceb08d]">
                  {slide.description}
                </p>

                <Button
                  asChild
                  className="mt-6 bg-[#d88e4f] px-6 font-bold text-[#160f0b] uppercase hover:bg-[#eda66a]"
                >
                  <Link to="/" search={slide.search} hash="mercado">
                    Explorar
                  </Link>
                </Button>
              </div>

              <img
                src={slide.image}
                alt={slide.imageAlt}
                className="aspect-square w-full rounded-2xl object-cover"
                fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
              />
            </div>

            <div
              role="group"
              aria-label="Selecionar destaque"
              className="mt-4 flex justify-center"
            >
              {slides.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Destaque ${index + 1} de ${slides.length}: ${item.title}`}
                  aria-pressed={activeIndex === index}
                  onClick={() => setActiveIndex(index)}
                  className="group grid size-9 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-[#efae75]"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full border border-[#d88e4f] group-aria-pressed:bg-[#d88e4f]"
                  />
                </button>
              ))}
            </div>
          </section>

          <section
            id="mercado"
            aria-label="Catálogo de NFTs"
            className="scroll-mt-6 pb-12 md:pb-20"
          >
            <CatalogGrid />
          </section>

          <HomeShowcase />
        </div>
      </main>

      <SiteFooter />
    </>
  )
}