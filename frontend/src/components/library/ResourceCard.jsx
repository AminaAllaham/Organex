import { Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TYPE_LABELS = {
  link: 'Link',
  article: 'Article',
  video: 'Video',
  note: 'Note',
  pdf: 'PDF',
  other: 'Other',
}

export default function ResourceCard({
  resource,
  tags = [],
  collections = [],
  onStarToggle,
  className,
}) {
  const {
    id,
    title,
    description,
    resourceType,
    sourceDomain,
    isStarred,
    tagIds = [],
    collectionIds = [],
  } = resource

  const myCollections = collections.filter((c) => collectionIds.includes(c.id))
  const myTags = tags.filter((t) => tagIds.includes(t.id))
  const hasLabels = myCollections.length + myTags.length > 0

  function handleStarClick(e) {
    e.preventDefault()
    e.stopPropagation()
    onStarToggle?.(resource)
  }

  return (
    <Card className={cn('group relative h-full border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md', className)}>
      {onStarToggle && (
        <button
          type="button"
          onClick={handleStarClick}
          className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={isStarred ? 'Remove star' : 'Add star'}
          aria-pressed={isStarred}
        >
          <Star
            className={cn(
              'size-4',
              isStarred && 'fill-yellow-500 text-yellow-500',
            )}
          />
        </button>
      )}

      <Link
        to="/resources/$id"
        params={{ id }}
        className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader>
          <CardTitle className="line-clamp-2 pr-8 text-base">{title}</CardTitle>
          {description && (
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{TYPE_LABELS[resourceType] ?? 'Other'}</Badge>
          {sourceDomain && (
            <span className="text-muted-foreground">{sourceDomain}</span>
          )}
        </CardContent>

        {hasLabels && (
          <CardFooter className="flex flex-wrap gap-1 pt-0">
            {myCollections.map((c) => (
              <SmallPill key={c.id} color={c.color} name={c.name} />
            ))}
            {myTags.map((t) => (
              <SmallPill key={t.id} color={t.color} name={t.name} />
            ))}
          </CardFooter>
        )}
      </Link>
    </Card>
  )
}

function SmallPill({ color, name }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color || '#94a3b8' }}
        aria-hidden
      />
      <span className="truncate">{name}</span>
    </span>
  )
}
