import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ResourceCard from '@/components/library/ResourceCard'
import { useAuth } from '@/hooks/useAuth'
import { getTag } from '@/lib/tags'
import { listResourcesByTag } from '@/lib/resources'
import { listTags } from '@/lib/tags'
import { listCollections } from '@/lib/collections'

export const Route = createFileRoute('/tags_/$id')({
  component: TagDetailPage,
})

function TagDetailPage() {
  return (
    <ProtectedRoute>
      <TagDetail />
    </ProtectedRoute>
  )
}

function TagDetail() {
  const { id } = Route.useParams()
  const { user } = useAuth()
  const [tag, setTag] = useState(null)
  const [resources, setResources] = useState([])
  const [tags, setTags] = useState([])
  const [collections, setCollections] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setStatus('loading')

    getTag(id)
      .then((currentTag) => {
        if (cancelled) return null

        if (!currentTag) {
          setStatus('not-found')
          return null
        }

        setTag(currentTag)

        return Promise.all([
          listResourcesByTag(id),
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
        Loading tag…
      </p>
    )
  }

  if (status === 'not-found') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Tag not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/tags">
            <ArrowLeft className="size-4" />
            Back to tags
          </Link>
        </Button>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <p className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-destructive sm:px-6">
        Couldn&apos;t load this tag. Refresh to try again.
      </p>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/tags"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to tags
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <span
            className="size-4 shrink-0 rounded-full"
            style={{ backgroundColor: tag.color || '#94a3b8' }}
            aria-hidden
          />
          <h1 className="text-2xl font-bold tracking-tight">
            {tag.name}
          </h1>
        </div>
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
              No resources with this tag yet.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Resources assigned to this tag will appear here.
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
