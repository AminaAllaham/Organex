import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
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
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import {
  listCollections,
  createCollection,
  renameCollection,
  deleteCollection,
} from '@/lib/collections'
import { collectionSchema } from '@/lib/validations'

export const Route = createFileRoute('/collections')({ component: CollectionsPage })

function CollectionsPage() {
  return (
    <ProtectedRoute>
      <Collections />
    </ProtectedRoute>
  )
}

function Collections() {
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
      const data = await listCollections()
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
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Group your resources into collections.
          </p>
        </div>
        <Button onClick={() => setEditing({ name: '' })}>
          <Plus className="size-4" />
          New collection
        </Button>
      </header>

      <div className="mt-8">
        {status === 'loading' && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading collections…
          </p>
        )}

        {status === 'error' && (
          <p className="py-12 text-center text-sm text-destructive">
            Couldn't load collections. Refresh to try again.
          </p>
        )}

        {status === 'ready' && items.length === 0 && (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
            <h2 className="text-lg font-semibold">No collections yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create a collection to group related resources together.
            </p>
            <Button className="mt-6" onClick={() => setEditing({ name: '' })}>
              <Plus className="size-4" />
              Create your first collection
            </Button>
          </div>
        )}

        {status === 'ready' && items.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <li key={c.id}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color || '#6366f1' }}
                        aria-hidden
                      />
                      <CardTitle className="truncate text-base">
                        {c.name}
                      </CardTitle>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing({ id: c.id, name: c.name })}
                        aria-label={`Rename ${c.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting({ id: c.id, name: c.name })}
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CollectionDialog
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

function CollectionDialog({ editing, onClose, onSaved }) {
  const isEdit = Boolean(editing?.id)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(collectionSchema),
    defaultValues: { name: '' },
  })

  // Sync the form value when the dialog opens with a different collection.
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
        await renameCollection(editing.id, values.name)
        toast.success('Collection renamed')
      } else {
        await createCollection(values)
        toast.success('Collection created')
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
          <DialogTitle>
            {isEdit ? 'Rename collection' : 'New collection'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Give this collection a new name.'
              : 'Collections help you group related resources.'}
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
                      placeholder="e.g. UX Research"
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
                {submitting
                  ? 'Saving…'
                  : isEdit
                    ? 'Save'
                    : 'Create collection'}
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
      await deleteCollection(deleting.id)
      toast.success('Collection deleted')
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
          <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
          <AlertDialogDescription>
            "{deleting?.name}" will be removed. The resources inside it will not
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
