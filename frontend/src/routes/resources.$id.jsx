import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, ExternalLink, FileText, Star, Trash2 } from 'lucide-react'

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PillPicker from '@/components/library/PillPicker'
import { useAuth } from '@/hooks/useAuth'
import {
  getResource,
  getSecurePdfAccessUrl,
  updateResource,
  deleteResource,
  toggleStar,
} from '@/lib/resources'
import { listTags } from '@/lib/tags'
import { listCollections } from '@/lib/collections'
import { resourceUpdateSchema, RESOURCE_TYPES } from '@/lib/validations'

export const Route = createFileRoute('/resources/$id')({
  component: ResourceDetailPage,
})

const TYPE_LABELS = {
  link: 'Link',
  article: 'Article',
  video: 'Video',
  note: 'Note',
  pdf: 'PDF',
  other: 'Other',
}

function ResourceDetailPage() {
  return (
    <ProtectedRoute>
      <ResourceDetail />
    </ProtectedRoute>
  )
}

function ResourceDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [resource, setResource] = useState(null)
  const [status, setStatus] = useState('loading')
  const [submitting, setSubmitting] = useState(false)
  const [openingPdf, setOpeningPdf] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tags, setTags] = useState([])
  const [collections, setCollections] = useState([])

  const form = useForm({
    resolver: zodResolver(resourceUpdateSchema),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      resourceType: 'link',
      personalNotes: '',
      tagIds: [],
      collectionIds: [],
    },
  })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setStatus('loading')
    Promise.all([getResource(id), listTags(), listCollections()])
      .then(([r, t, c]) => {
        if (cancelled) return
        if (!r) {
          setStatus('not-found')
          return
        }
        setResource(r)
        setTags(t)
        setCollections(c)
        form.reset({
          url: r.url || '',
          title: r.title || '',
          description: r.description || '',
          resourceType: r.resourceType || 'link',
          personalNotes: r.personalNotes || '',
          tagIds: r.tagIds || [],
          collectionIds: r.collectionIds || [],
        })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  async function onSubmit(values) {
    setSubmitting(true)
    try {
      await updateResource(id, values)
      setResource((r) => ({ ...r, ...values }))
      form.reset(values)
      toast.success('Changes saved')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save changes.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOpenPdf() {
    if (openingPdf) return

    setOpeningPdf(true)
    let pdfWindow = null

    try {
      pdfWindow = window.open('', '_blank')

      if (!pdfWindow) {
        toast.error('Your browser blocked the new tab.')
        return
      }

      pdfWindow.opener = null
      const result = await getSecurePdfAccessUrl(id, 'view')
      pdfWindow.location.href = result.url
    } catch (err) {
      if (pdfWindow) {
        pdfWindow.close()
      }

      console.error(err)
      toast.error('Unable to open PDF.')
    } finally {
      setOpeningPdf(false)
    }
  }

  async function handleStar() {
    const next = !resource.isStarred
    setResource((r) => ({ ...r, isStarred: next })) // optimistic
    try {
      await toggleStar(id, resource.isStarred)
    } catch (err) {
      console.error(err)
      setResource((r) => ({ ...r, isStarred: !next })) // rollback
      toast.error('Failed to update star.')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteResource(id)
      toast.success('Resource deleted')
      navigate({ to: '/library' })
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (status === 'loading') {
    return (
      <p className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-muted-foreground">
        Loading…
      </p>
    )
  }

  if (status === 'not-found') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">Resource not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/library">
            <ArrowLeft className="size-4" />
            Back to library
          </Link>
        </Button>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <p className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-destructive">
        Couldn't load this resource.
      </p>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/library"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to library
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {resource.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {TYPE_LABELS[resource.resourceType] ?? 'Other'}
            </Badge>
            {resource.sourceDomain && <span>{resource.sourceDomain}</span>}
            {resource.createdAt && (
              <>
                <span>·</span>
                <span>Saved {formatDate(resource.createdAt)}</span>
              </>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStar}
          aria-label={resource.isStarred ? 'Remove star' : 'Add star'}
          aria-pressed={resource.isStarred}
        >
          <Star
            className={cn(
              'size-5',
              resource.isStarred && 'fill-yellow-500 text-yellow-500',
            )}
          />
        </Button>
      </div>

      {resource.resourceType === 'pdf' ? (
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={handleOpenPdf}
          disabled={openingPdf}
        >
          <FileText className="size-4" />
          {openingPdf ? 'Opening PDF…' : 'Open PDF'}
        </Button>
      ) : (
        <Button asChild variant="outline" className="mt-6 w-full">
          <a href={resource.url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Open original
          </a>
        </Button>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-10 space-y-4"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input type="url" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="resourceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RESOURCE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="collectionIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Collections</FormLabel>
                <FormControl>
                  <PillPicker
                    items={collections}
                    selectedIds={field.value || []}
                    onChange={field.onChange}
                    placeholder="Add a collection"
                    emptyMessage={
                      <span>
                        No collections yet.{' '}
                        <Link
                          to="/collections"
                          className="font-medium text-foreground hover:underline"
                        >
                          Create one
                        </Link>
                        .
                      </span>
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tagIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <PillPicker
                    items={tags}
                    selectedIds={field.value || []}
                    onChange={field.onChange}
                    placeholder="Add a tag"
                    emptyMessage={
                      <span>
                        No tags yet.{' '}
                        <Link
                          to="/tags"
                          className="font-medium text-foreground hover:underline"
                        >
                          Create one
                        </Link>
                        .
                      </span>
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="personalNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personal notes</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder="Why is this useful? What did you learn?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={submitting || !form.formState.isDirty}
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Form>

      <hr className="my-10 border-border" />

      <div>
        <h2 className="text-lg font-semibold">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting a resource cannot be undone.
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-4" />
          Delete this resource
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              "{resource.title}" will be permanently removed from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}
