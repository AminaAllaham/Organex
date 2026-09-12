import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import { listTags, createTag, renameTag, deleteTag } from '@/lib/tags'
import { tagSchema } from '@/lib/validations'

export const Route = createFileRoute('/tags')({ component: TagsPage })

function TagsPage() {
  return (
    <ProtectedRoute>
      <Tags />
    </ProtectedRoute>
  )
}

function Tags() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [editing, setEditing] = useState(null) // null | { id?, name }
  const [deleting, setDeleting] = useState(null) // null | { id, name }

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function refresh() {
    setStatus('loading')
    try {
      const data = await listTags()
      setItems(data)
      setStatus('ready')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Label resources to find them faster.
          </p>
        </div>
        <Button onClick={() => setEditing({ name: '' })}>
          <Plus className="size-4" />
          New tag
        </Button>
      </header>

      <div className="mt-8">
        {status === 'loading' && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading tags…
          </p>
        )}

        {status === 'error' && (
          <p className="py-12 text-center text-sm text-destructive">
            Couldn't load tags. Refresh to try again.
          </p>
        )}

        {status === 'ready' && items.length === 0 && (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
            <h2 className="text-lg font-semibold">No tags yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Tags are quick labels you attach to resources for filtering.
            </p>
            <Button className="mt-6" onClick={() => setEditing({ name: '' })}>
              <Plus className="size-4" />
              Create your first tag
            </Button>
          </div>
        )}

        {status === 'ready' && items.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {items.map((t) => (
              <li
                key={t.id}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-sm"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: t.color || '#94a3b8' }}
                  aria-hidden
                />
                <Link
                  to="/tags/$id"
                  params={{ id: t.id }}
                  className="font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.name}
                </Link>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setEditing({ id: t.id, name: t.name })}
                  aria-label={`Rename ${t.name}`}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setDeleting({ id: t.id, name: t.name })}
                  aria-label={`Delete ${t.name}`}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TagDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      <DeleteConfirm
        deleting={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={refresh}
      />
    </section>
  )
}

function TagDialog({ editing, onClose, onSaved }) {
  const isEdit = Boolean(editing?.id)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (editing) {
      form.reset({ name: editing.name || '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  async function onSubmit(values) {
    setSubmitting(true)
    try {
      if (isEdit) {
        await renameTag(editing.id, values.name)
        toast.success('Tag renamed')
      } else {
        await createTag(values)
        toast.success('Tag created')
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rename tag' : 'New tag'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Give this tag a new name.'
              : 'Tags help you label and filter resources.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      placeholder="e.g. typography"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : isEdit ? 'Save' : 'Create tag'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteConfirm({ deleting, onClose, onDeleted }) {
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete() {
    setSubmitting(true)
    try {
      await deleteTag(deleting.id)
      toast.success('Tag deleted')
      onDeleted()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog
      open={deleting !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this tag?</AlertDialogTitle>
          <AlertDialogDescription>
            "{deleting?.name}" will be removed. Resources tagged with it will not
            be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={submitting}>
            {submitting ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
