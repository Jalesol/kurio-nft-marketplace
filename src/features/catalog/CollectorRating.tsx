import { Star } from 'lucide-react'
import type { CollectorReview } from './detailTypes'

const ratingFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
})

export default function CollectorRating({
  reviews,
}: {
  reviews: CollectorReview[]
}) {
  const count = reviews.length
  const average = count
    ? reviews.reduce((total, review) => total + review.rating, 0) / count
    : 0

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#ceb08d]">
      <span className="sr-only">
        {count > 0 ? `Nota média: ${ratingFormatter.format(average)} de 5. ` : ''}
      </span>

      <span aria-hidden="true" className="flex shrink-0 gap-0.5">
        {Array.from({ length: 5 }, (_, index) => {
          const fill = Math.min(1, Math.max(0, average - index))

          return (
            <span key={index} className="relative block size-3.5">
              <Star size={14} className="text-[#ceb08d]" />
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star size={14} className="max-w-none fill-[#d88e4f] text-[#d88e4f]" />
              </span>
            </span>
          )
        })}
      </span>

      <span>
        {count === 1
          ? '1 avaliação de colecionador'
          : `${count} avaliações de colecionadores`}
      </span>
    </div>
  )
}