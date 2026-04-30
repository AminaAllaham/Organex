import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      <h1 className="text-3xl font-bold">Hello world!</h1>
    </main>
  )
}