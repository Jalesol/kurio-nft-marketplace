import type { CollectorReview } from '@/features/catalog/detailTypes'

const demoReviews: Omit<CollectorReview, 'id'>[] = [
  { collector: 'Marina C.', rating: 5, comment: 'Gostei do acabamento da ilustração.' },
  { collector: 'Rafael M.', rating: 4, comment: 'O contraste entre a figura e o fundo ficou muito bom.' },
  { collector: 'Bianca S.', rating: 5, comment: 'As cores funcionam bem juntas.' },
  { collector: 'André L.', rating: 5, comment: 'A composição chamou minha atenção na vitrine.' },
  { collector: 'Júlia F.', rating: 4, comment: 'A iluminação dá profundidade ao retrato.' },
  { collector: 'Mateus A.', rating: 5, comment: 'Gostei de observar os detalhes com a ampliação.' },
  { collector: 'Lívia R.', rating: 5, comment: 'A expressão do personagem ficou marcante.' },
  { collector: 'Pedro G.', rating: 4, comment: 'O enquadramento valoriza a peça.' },
  { collector: 'Clara V.', rating: 5, comment: 'As texturas dão personalidade à arte.' },
  { collector: 'Diego P.', rating: 5, comment: 'É uma das peças que mais gostei de explorar.' },
  { collector: 'Elisa N.', rating: 4, comment: 'Gostei da escolha de tons para o fundo.' },
  { collector: 'Bruno T.', rating: 4, comment: 'Os acessórios complementam bem o retrato.' },
  { collector: 'Helena B.', rating: 5, comment: 'O personagem ficou bem expressivo.' },
  { collector: 'Caio D.', rating: 5, comment: 'As cores permanecem legíveis na miniatura.' },
  { collector: 'Sofia E.', rating: 4, comment: 'O retrato ficou bem equilibrado.' },
  { collector: 'Felipe H.', rating: 4, comment: 'A silhueta ficou fácil de reconhecer.' },
  { collector: 'Laura K.', rating: 5, comment: 'Gostei da atenção aos pequenos detalhes.' },
  { collector: 'Tiago O.', rating: 4, comment: 'A paleta combina com o estilo da coleção.' },
  { collector: 'Alice W.', rating: 4, comment: 'O fundo discreto deixa o personagem em evidência.' },
]

export function getMockReviews(nftId: string): CollectorReview[] {
  const offset = Array.from(nftId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  )

  const isEmeraldApe = nftId === 'emerald-ape-042'
  const count = isEmeraldApe ? demoReviews.length : 3 + (offset % 4)
  const start = isEmeraldApe ? 0 : offset % demoReviews.length

  return Array.from({ length: count }, (_, index) => ({
    ...demoReviews[(start + index) % demoReviews.length]!,
    id: `${nftId}-review-${index + 1}`,
  }))
}