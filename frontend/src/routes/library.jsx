import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ResourceCard from '@/components/library/ResourceCard'
import { useAuth } from '@/hooks/useAuth'
import { listResources, toggleStar } from '@/lib/resources'
import { listTags } from '@/lib/tags'
import { listCollections } from '@/lib/collections'
import { RESOURCE_TYPES } from '@/lib/validations'

export const Route = createFileRoute('/library')({ component: LibraryPage })

function LibraryPage() {
  return (
    <ProtectedRoute>
      <Library />
    </ProtectedRoute>
  )
}

function Library() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [tags, setTags] = useState([])
  const [collections, setCollections] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  const [typeFilter, setTypeFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [starredOnly, setStarredOnly] = useState(false)
  const [sortOrder, setSortOrder] = useState('newest')

  // Fetch in an effect (rather than a route loader) because Firebase auth
  // restores the session asynchronously — auth.currentUser is null on first
  // render even for logged-in users. ProtectedRoute already gates this view,
  // so user is guaranteed non-null when we reach Library().
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

  const visible = useMemo(() => {
    let list = resources
    if (typeFilter !== 'all') list = list.filter((r) => r.resourceType === typeFilter)
    if (collectionFilter !== 'all')
      list = list.filter((r) => (r.collectionIds || []).includes(collectionFilter))
    if (tagFilter !== 'all')
      list = list.filter((r) => (r.tagIds || []).includes(tagFilter))
    if (starredOnly) list = list.filter((r) => r.isStarred)
    if (sortOrder === 'oldest') {
      list = [...list].reverse()
    }
    return list
  }, [resources, typeFilter, collectionFilter, tagFilter, starredOnly, sortOrder])

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you've saved.
          </p>
        </div>
        <Button asChild>
          <Link to="/resources/new">
            <Plus className="size-4" />
            Add resource
          </Link>
        </Button>
      </header>

      {status === 'ready' && resources.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border pb-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {RESOURCE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {collections.length > 0 && (
            <Select value={collectionFilter} onValueChange={setCollectionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: c.color || '#6366f1' }}
                        aria-hidden
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: t.color || '#94a3b8' }}
                        aria-hidden
                      />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>

          <Toggle
            pressed={starredOnly}
            onPressedChange={setStarredOnly}
            aria-label="Show starred only"
          >
            Starred only
          </Toggle>

          <span className="ml-auto text-sm text-muted-foreground">
            {visible.length} of {resources.length}
          </span>
        </div>
      )}

      <div className="mt-6">
        {status === 'loading' && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading your library…
          </p>
        )}

        {status === 'error' && (
          <p className="py-12 text-center text-sm text-destructive">
            Couldn't load your resources. Refresh to try again.
          </p>
        )}

        {status === 'ready' && resources.length === 0 && <EmptyLibrary />}

        {status === 'ready' && resources.length > 0 && visible.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No resources match your filters.
          </p>
        )}

        {status === 'ready' && visible.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((r) => (
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
        )}
      </div>
    </section>
  )
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
      <h2 className="text-lg font-semibold">Your library is empty</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Save your first link, article, video, or PDF and start building your
        personal learning library.
      </p>
      <Button asChild className="mt-6">
        <Link to="/resources/new">
          <Plus className="size-4" />
          Add your first resource
        </Link>
      </Button>
    </div>
  )
}
