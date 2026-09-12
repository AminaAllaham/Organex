import { z } from 'zod'

export const RESOURCE_TYPES = [
  'link',
  'article',
  'video',
  'note',
  'pdf',
  'other',
]

export const collectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long'),
})

export const tagSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name is too long'),
})

export const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name is too long'),
})

function validateResourceUrl(data, ctx) {
  // PDF resources use an uploaded file instead of a URL
  if (data.resourceType === 'pdf') {
    return
  }

  if (!data.url || data.url.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['url'],
      message: 'URL is required',
    })
    return
  }

  try {
    new URL(data.url)
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['url'],
      message: 'Enter a valid URL',
    })
  }
}

export const resourceSchema = z
  .object({
    url: z.string().optional(),

    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title is too long'),

    description: z
      .string()
      .max(1000, 'Description is too long')
      .optional(),

    resourceType: z.enum(RESOURCE_TYPES),

    tagIds: z.array(z.string()).default([]),

    collectionIds: z.array(z.string()).default([]),
  })
  .superRefine(validateResourceUrl)

export const resourceUpdateSchema = z
  .object({
    url: z.string().optional(),

    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title is too long'),

    description: z
      .string()
      .max(1000, 'Description is too long')
      .optional(),

    resourceType: z.enum(RESOURCE_TYPES),

    personalNotes: z
      .string()
      .max(5000, 'Notes are too long')
      .optional(),

    tagIds: z.array(z.string()).default([]),

    collectionIds: z.array(z.string()).default([]),
  })
  .superRefine(validateResourceUrl)

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),

  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name is too long'),

  email: z.string().email('Enter a valid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'),
})

