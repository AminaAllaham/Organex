import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PillPicker from '@/components/library/PillPicker'
import { useAuth } from '@/hooks/useAuth'
import { addResource } from '@/lib/resources'
import { listTags } from '@/lib/tags'
import { listCollections } from '@/lib/collections'
import { resourceSchema, RESOURCE_TYPES } from '@/lib/validations'

export const Route = createFileRoute('/resources/new')({ component: AddResourcePage })

const TYPE_LABELS = {
  link: 'Link',
  article: 'Article',
  video: 'Video',
  note: 'Note',
  pdf: 'PDF',
  other: 'Other',
}

function AddResourcePage() {
  return (
    <ProtectedRoute>
      <AddResourceForm />
    </ProtectedRoute>
  )
}

function AddResourceForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [tags, setTags] = useState([])
  const [collections, setCollections] = useState([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([listTags(), listCollections()])
      .then(([t, c]) => {
        if (cancelled) return
        setTags(t)
        setCollections(c)
      })
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [user])

  const form = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      resourceType: 'link',
      tagIds: [],
      collectionIds: [],
    },
  })

  async function onSubmit(values) {
    setSubmitting(true)
    try {
      await addResource(values)
      toast.success('Resource saved')
      navigate({ to: '/library' })
    } catch (err) {
      console.error(err)
      toast.error('Failed to save resource. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Add a resource</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Save a link, article, video, or note to your library.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com/article"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="What is this about?" {...field} />
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
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="A short summary so you remember why you saved it."
                    {...field}
                  />
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
                      <SelectValue placeholder="Select a type" />
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
                <FormLabel>Collections (optional)</FormLabel>
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
                <FormLabel>Tags (optional)</FormLabel>
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

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save resource'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/library' })}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </section>
  )
}
