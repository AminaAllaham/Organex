import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search as SearchIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ResourceCard from '@/components/library/ResourceCard'
import { useAuth } from '@/hooks/useAuth'
import { listResources, toggleStar } from '@/lib/resources'
import { listTags } from '@/lib/tags'
import { listCollections } from '@/lib/collections'

export const Route = createFileRoute('/search')({ component: SearchPage })

function SearchPage() {
  return (
    <ProtectedRoute>
      <SearchView />
    </ProtectedRoute>
  )
}

function SearchView() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [tags, setTags] = useState([])
  const [collections, setCollections] = useState([])
  const [status, setStatus] = useState('loading')
  const [query, setQuery] = useState('')

  // Fetch all resources once. With an MVP-sized library, filtering in JS is
  // simpler and faster than re-querying Firestore on every keystroke.
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
  }, [user])

  async function handleStarToggle(resource) {
    const { id, isStarred } = resource
    setResources((rs) =>
      rs.map((r) => (r.id === id ? { ...r, isStarred: !isStarred } : r)),
    )
    try {
      await toggleStar(id, isStarred)
    } catch (err) {
      console.error(err)
      setResources((rs) =>
        rs.map((r) => (r.id === id ? { ...r, isStarred } : r)),
      )
      toast.error('Failed to update star.')
    }
  }

  const trimmed = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!trimmed) return []
    return resources.filter((r) => {
      const title = (r.title || '').toLowerCase()
      const description = (r.description || '').toLowerCase()
      return title.includes(trimmed) || description.includes(trimmed)
    })
  }, [resources, trimmed])

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find a resource by title or description.
        </p>
      </header>

      <div className="relative mt-6">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your library…"
          className="h-10 pl-9"
        />
      </div>

      <div className="mt-8">
        {status === 'loading' && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading your library…
          </p>
        )}

        {status === 'error' && (
          <p className="py-12 text-center text-sm text-destructive">
            Couldn't load your library. Refresh to try again.
          </p>
        )}

        {status === 'ready' && !trimmed && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {resources.length === 0
              ? 'Your library is empty. Add a resource first.'
              : `Type to search across ${resources.length} resource${resources.length === 1 ? '' : 's'}.`}
          </p>
        )}

        {status === 'ready' && trimmed && results.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No results for "{query}".
          </p>
        )}

        {status === 'ready' && results.length > 0 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} result{results.length === 1 ? '' : 's'}
            </p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((r) => (
                <li key={r.id}>
                  <ResourceCard
                    resource={r}
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
