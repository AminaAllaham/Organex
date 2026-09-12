import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ResourceCard from '@/components/library/ResourceCard'
import { useAuth } from '@/hooks/useAuth'
import { getCollection } from '@/lib/collections'
import { listResourcesByCollection } from '@/lib/resources'
import { listTags } from '@/lib/tags'
import { listCollections } from '@/lib/collections'

export const Route = createFileRoute('/collections_/$id')({
  component: CollectionDetailPage,
})

function CollectionDetailPage() {
  return (
    <ProtectedRoute>
      <CollectionDetail />
    </ProtectedRoute>
  )
}

function CollectionDetail() {
  const { id } = Route.useParams()
  const { user } = useAuth()
  const [collection, setCollection] = useState(null)
  const [resources, setResources] = useState([])
  const [tags, setTags] = useState([])
  const [collections, setCollections] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setStatus('loading')

    getCollection(id)
      .then((currentCollection) => {
        if (cancelled) return null

        if (!currentCollection) {
          setStatus('not-found')
          return null
        }

        setCollection(currentCollection)

        return Promise.all([
          listResourcesByCollection(id),
          listTags(),
          listCollections(),
        ])
      })
      .then((result) => {
        if (cancelled || !result) return

        const [resourceData, tagData, collectionData] = result
        setResources(resourceData)
        setTags(tagData)
        setCollections(collectionData)
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        console.error(error)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [id, user])

  if (status === 'loading') {
    return (
      <p className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-muted-foreground sm:px-6">
        Loading collection…
      </p>
    )
  }

  if (status === 'not-found') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Collection not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/collections">
            <ArrowLeft className="size-4" />
            Back to collections
          </Link>
        </Button>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <p className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-destructive sm:px-6">
        Couldn&apos;t load this collection. Refresh to try again.
      </p>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/collections"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to collections
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <span
            className="size-4 shrink-0 rounded-full"
            style={{ backgroundColor: collection.color || '#6366f1' }}
            aria-hidden
          />
          <h1 className="text-2xl font-bold tracking-tight">
            {collection.name}
          </h1>
        </div>
        {collection.description && (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {collection.description}
          </p>
        )}
        <div className="mt-4">
          <Badge variant="secondary">
            {resources.length} {resources.length === 1 ? 'resource' : 'resources'}
          </Badge>
        </div>
      </header>

      <div className="mt-8">
        {resources.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
            <h2 className="text-lg font-semibold">
              No resources in this collection yet.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Resources assigned to this collection will appear here.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resources.map((resource) => (
              <li key={resource.id}>
                <ResourceCard
                  resource={resource}
                  tags={tags}
                  collections={collections}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
