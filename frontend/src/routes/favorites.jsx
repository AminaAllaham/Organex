import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ResourceCard from '@/components/library/ResourceCard'
import { useAuth } from '@/hooks/useAuth'
import { listResources, toggleStar } from '@/lib/resources'
import { listTags } from '@/lib/tags'
import { listCollections } from '@/lib/collections'

export const Route = createFileRoute('/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  return (
    <ProtectedRoute>
      <Favorites />
    </ProtectedRoute>
  )
}

function Favorites() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [tags, setTags] = useState([])
  const [collections, setCollections] = useState([])
  const [status, setStatus] = useState('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setStatus('loading')

    Promise.all([listResources(), listTags(), listCollections()])
      .then(([r, t, c]) => {
        if (cancelled) return
        setResources(r)
        setTags(t)
        setCollections(c)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [user, retryKey])

  const favorites = useMemo(
    () => resources.filter((resource) => resource.isStarred),
    [resources],
  )

  async function handleStarToggle(resource) {
    const { id, isStarred } = resource

    setResources((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isStarred: !isStarred } : item,
      ),
    )

    try {
      await toggleStar(id, isStarred)
    } catch (err) {
      console.error(err)
      setResources((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isStarred } : item,
        ),
      )
      toast.error('Failed to update favorite.')
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <div className="flex items-center gap-2">
          <Star className="size-5" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight">Favorites</h1>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Your starred learning resources in one place.
        </p>
      </header>

      <div className="mt-6">
        {status === 'loading' && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading your favorites...
          </p>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-destructive">
              Couldn't load your favorites.
            </p>

            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setRetryKey((value) => value + 1)}
            >
              Try again
            </Button>
          </div>
        )}

        {status === 'ready' && favorites.length === 0 && <EmptyFavorites />}

        {status === 'ready' && favorites.length > 0 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {favorites.length === 1
                ? '1 favorite'
                : `${favorites.length} favorites`}
            </p>

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favorites.map((resource) => (
                <li key={resource.id}>
                  <ResourceCard
                    resource={resource}
                    tags={tags}
                    collections={collections}
                    onStarToggle={handleStarToggle}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function EmptyFavorites() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border px-4 py-16 text-center">
      <Star className="size-8 text-muted-foreground" aria-hidden />

      <h2 className="mt-4 text-lg font-semibold">No favorites yet</h2>

      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Star resources you want quick access to and they'll appear here.
      </p>

      <Button asChild className="mt-6">
        <Link to="/library">Browse Library</Link>
      </Button>
    </div>
  )
}
