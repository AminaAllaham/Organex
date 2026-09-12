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
import {
  addResource,
  cleanupSecurePdfUpload,
} from '@/lib/resources'
import { listTags } from '@/lib/tags'
import { listCollections } from '@/lib/collections'
import { resourceSchema, RESOURCE_TYPES } from '@/lib/validations'

export const Route = createFileRoute('/resources/new')({
  component: AddResourcePage,
})

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
  const [pdfFile, setPdfFile] = useState(null)

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

  const selectedResourceType = form.watch('resourceType')
  const isPdf = selectedResourceType === 'pdf'

  async function uploadPdf(file) {
    if (!user) {
      throw new Error('Not authenticated')
    }

    const idToken = await user.getIdToken()

    const signatureResponse = await fetch('/api/cloudinary-signature', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    })

    if (!signatureResponse.ok) {
      throw new Error('Failed to create secure upload signature')
    }

    const {
      signature,
      timestamp,
      folder,
      type,
      apiKey,
      uploadUrl,
    } = await signatureResponse.json()

    const formData = new FormData()

    formData.append('file', file)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp)
    formData.append('signature', signature)
    formData.append('folder', folder)
    formData.append('type', type)
    formData.append('allowed_formats', 'pdf')
    formData.append('overwrite', 'false')

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text()
      console.error('Cloudinary upload failed:', errorBody)

      throw new Error('Failed to upload PDF')
    }

    const uploaded = await uploadResponse.json()

    return {
      publicId: uploaded.public_id,
      secureUrl: uploaded.secure_url || '',
      originalFilename:
        uploaded.original_filename ||
        file.name.replace(/\.pdf$/i, ''),
      format: uploaded.format || 'pdf',
      bytes: uploaded.bytes || file.size,
      resourceType: uploaded.resource_type || 'raw',
      deliveryType: uploaded.type || 'authenticated',
    }
  }

  async function onSubmit(values) {
    setSubmitting(true)

    try {
      let fileData = null
      let uploadedPublicId = null

      if (values.resourceType === 'pdf') {
        if (!pdfFile) {
          toast.error('Please select a PDF file')
          return
        }

        if (
          pdfFile.type !== 'application/pdf' &&
          !pdfFile.name.toLowerCase().endsWith('.pdf')
        ) {
          toast.error('Only PDF files are allowed')
          return
        }

        const maxSize = 10 * 1024 * 1024

        if (pdfFile.size > maxSize) {
          toast.error('PDF must be 10 MB or smaller')
          return
        }

        fileData = await uploadPdf(pdfFile)
        uploadedPublicId = fileData.publicId
      }

      try {
        await addResource({
          ...values,
          url: values.resourceType === 'pdf' ? '' : values.url,
          file: fileData,
        })
      } catch (originalError) {
        if (uploadedPublicId) {
          try {
            await cleanupSecurePdfUpload(uploadedPublicId)
          } catch {
            console.error('Failed to clean up orphaned PDF')
          }
        }

        throw originalError
      }

      toast.success('Resource saved')

      navigate({
        to: '/library',
      })
    } catch (err) {
      console.error(err)

      toast.error(
        err?.message || 'Failed to save resource. Try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Add a resource
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Save a link, article, video, note, or PDF to your library.
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-8 space-y-4"
        >
          <FormField
            control={form.control}
            name="resourceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>

                <Select
                  onValueChange={(value) => {
                    field.onChange(value)

                    if (value !== 'pdf') {
                      setPdfFile(null)
                    }

                    if (value === 'pdf') {
                      form.setValue('url', '')
                      form.clearErrors('url')
                    }
                  }}
                  value={field.value}
                >
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

          {!isPdf && (
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
          )}

          {isPdf && (
            <FormItem>
              <FormLabel>PDF file</FormLabel>

              <FormControl>
                <Input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    setPdfFile(file)
                  }}
                />
              </FormControl>

              <p className="text-xs text-muted-foreground">
                PDF only. Maximum size: 10 MB.
              </p>
            </FormItem>
          )}

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>

                <FormControl>
                  <Input
                    placeholder="What is this about?"
                    {...field}
                  />
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
              {submitting
                ? isPdf
                  ? 'Uploading…'
                  : 'Saving…'
                : 'Save resource'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate({
                  to: '/library',
                })
              }
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
