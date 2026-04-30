import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-32">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Organex
      </h1>
      <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
        Your personal digital library — save, organize, and find every learning resource in one place.
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        Sign up and login coming soon.
      </p>
    </section>
  )
}
