import { Star, ExternalLink } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const TYPE_LABELS = {
  link: 'Link',
  article: 'Article',
  video: 'Video',
  note: 'Note',
  pdf: 'PDF',
  other: 'Other',
}

export default function ResourceCard({ resource }) {
  const { url, title, description, resourceType, sourceDomain, isStarred } = resource

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group block focus-visible:outline-none"
      aria-label={`Open ${title} in a new tab`}
    >
      <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base">{title}</CardTitle>
            {isStarred && (
              <Star
                className="size-4 shrink-0 fill-yellow-500 text-yellow-500"
                aria-label="Starred"
              />
            )}
          </div>
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

        <CardFooter className="text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <ExternalLink className="size-3" />
            Open
          </span>
        </CardFooter>
      </Card>
    </a>
  )
}
