import { Link } from '@tanstack/react-router'

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#160f0b] px-5 font-mono text-[#f5eee8]">
      <div className="w-full max-w-md">
        <p className="mb-3 text-sm font-bold text-[#efae75]">Erro 404</p>
        <h1 className="text-3xl font-bold">Página não encontrada</h1>

        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-[#d88e4f] px-4 py-2 text-sm font-bold text-[#160f0b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efae75]"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}