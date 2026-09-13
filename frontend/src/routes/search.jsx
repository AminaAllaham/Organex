import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Search as SearchIcon, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ResourceCard from '@/components/library/ResourceCard'
import { useAuth } from '@/hooks/useAuth'
import { listResources, toggleStar } from '@/lib/resources'
import { listTags } from '@/lib/tags'
import { listCollections } from '@/lib/collections'

export const Route = createFileRoute('/search')({ component: SearchPage })

const RESOURCE_TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'link', label: 'Link' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'note', label: 'Note' },
  { value: 'pdf', label: 'PDF' },
  { value: 'other', label: 'Other' },
]

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
  const [resourceType, setResourceType] = useState('all')
  const [starredOnly, setStarredOnly] = useState(false)
  const [collectionId, setCollectionId] = useState('all')
  const [tagId, setTagId] = useState('all')

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
  const tagNames = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.name || ''])),
    [tags],
  )
  const collectionNames = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection.name || ''])),
    [collections],
  )
  const filtersActive =
    resourceType !== 'all' || starredOnly || collectionId !== 'all' || tagId !== 'all'

  const results = useMemo(() => {
    return resources.filter((r) => {
      const linkedTagNames = (r.tagIds || [])
        .map((id) => tagNames.get(id))
        .filter(Boolean)
      const linkedCollectionNames = (r.collectionIds || [])
        .map((id) => collectionNames.get(id))
        .filter(Boolean)
      const searchableText = [
        r.title,
        r.description,
        r.personalNotes,
        r.url,
        r.sourceDomain,
        r.file?.originalFilename,
        ...linkedTagNames,
        ...linkedCollectionNames,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesQuery = !trimmed || searchableText.includes(trimmed)
      const matchesType =
        resourceType === 'all' || (r.resourceType || 'other') === resourceType
      const matchesStarred = !starredOnly || r.isStarred
      const matchesCollection =
        collectionId === 'all' || (r.collectionIds || []).includes(collectionId)
      const matchesTag = tagId === 'all' || (r.tagIds || []).includes(tagId)

      return matchesQuery && matchesType && matchesStarred && matchesCollection && matchesTag
    })
  }, [collectionId, collectionNames, resourceType, resources, starredOnly, tagId, tagNames, trimmed])

  function resetFilters() {
    setResourceType('all')
    setStarredOnly(false)
    setCollectionId('all')
    setTagId('all')
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search across your resources, notes, tags, and collections.
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library..."
            className="h-10 pl-9"
          />
        </div>
        {query && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => setQuery('')}
          >
            <X className="size-4" />
            Clear query
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Resource type" />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={collectionId} onValueChange={setCollectionId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All collections</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tagId} onValueChange={setTagId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-input px-3 py-2">
          <Label htmlFor="starred-only" className="cursor-pointer text-sm">
            Starred only
          </Label>
          <Checkbox
            id="starred-only"
            checked={starredOnly}
            onCheckedChange={(checked) => setStarredOnly(checked === true)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {results.length} result{results.length === 1 ? '' : 's'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!filtersActive}
          onClick={resetFilters}
        >
          Reset filters
        </Button>
      </div>

      <div className="mt-6">
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

        {status === 'ready' && resources.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Your library is empty. Add a resource first.
            <Button asChild className="mx-auto mt-4">
              <Link to="/resources/new">
                <Plus className="size-4" />
                Add resource
              </Link>
            </Button>
          </div>
        )}

        {status === 'ready' && resources.length > 0 && results.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <p>No resources match the current search and filters.</p>
            <div className="mt-4 flex justify-center gap-2">
              {query && (
                <Button type="button" variant="outline" size="sm" onClick={() => setQuery('')}>
                  Clear query
                </Button>
              )}
              {filtersActive && (
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              )}
            </div>
          </div>
        )}

        {status === 'ready' && results.length > 0 && (
          <>
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
