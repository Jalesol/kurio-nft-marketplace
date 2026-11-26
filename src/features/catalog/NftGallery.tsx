import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface NftGalleryProps {
  name: string
  imageUrl: string
  additionalImages?: string[]
}

export default function NftGallery({
  name,
  imageUrl,
  additionalImages = [],
}: NftGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const images = [imageUrl, ...additionalImages]
  const activeImage = images[selectedIndex] ?? imageUrl

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-[clamp(42px,5vw,76px)_minmax(0,1fr)]">
      <ul
        aria-label="Miniaturas da galeria"
        className="order-2 grid grid-cols-4 content-start gap-2 md:order-1 md:grid-cols-1"
      >
        {images.map((image, index) => (
          <li key={index}>
            <button
              type="button"
              aria-label={`Selecionar miniatura ${index + 1} de ${name}`}
              aria-pressed={index === selectedIndex}
              onClick={() => setSelectedIndex(index)}
              className="block aspect-square w-full overflow-hidden rounded-md border-2 border-transparent aria-pressed:border-[#d88e4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efae75]"
            >
              <img src={image} alt="" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative self-start rounded-md bg-[#241711] p-3 md:order-2">
        <img
          src={activeImage}
          alt={`Arte de ${name}`}
          className="aspect-square w-full rounded-lg object-cover"
          fetchPriority="high"
        />

        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              aria-label={`Ampliar arte de ${name}`}
              className="absolute top-4 right-4 bg-[#160f0b] text-[#f5eee8] hover:bg-[#3a2619]"
            >
              <ZoomIn aria-hidden="true" size={18} />
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90dvh] overflow-y-auto border-[#5b3b26] bg-[#241711] text-[#f5eee8] sm:max-w-2xl">
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription className="sr-only">
              Visualização ampliada da arte.
            </DialogDescription>

            <img
              src={activeImage}
              alt={`Arte ampliada de ${name}`}
              className="mx-auto max-h-[65dvh] max-w-full rounded-md object-contain"
            />

            <DialogClose asChild>
              <Button type="button" variant="outline" className="justify-self-end">
                Fechar
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}