import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BookmarkPlus, FolderTree, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { markOnboardingComplete } from '@/lib/profile'

export const Route = createFileRoute('/onboarding')({ component: OnboardingPage })

const STEPS = [
  {
    icon: BookmarkPlus,
    title: 'Welcome to Organex',
    description:
      'Your personal digital library. Save links, articles, videos, and notes — everything you want to learn, in one place.',
  },
  {
    icon: FolderTree,
    title: 'Group and label',
    description:
      'Create collections to group related resources. Add tags to label them. The more you save, the more useful it gets.',
  },
  {
    icon: Search,
    title: 'Find anything in seconds',
    description:
      "Search across your library by title or description. Filter by type, tag, or collection. Never lose a great resource again.",
  },
]

function OnboardingPage() {
  return (
    <ProtectedRoute>
      <Onboarding />
    </ProtectedRoute>
  )
}

function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]
  const Icon = current.icon

  async function finish() {
    setSubmitting(true)
    try {
      await markOnboardingComplete()
    } catch (err) {
      // Don't block navigation on a failed write — user has done their part.
      console.error(err)
    } finally {
      navigate({ to: '/library' })
    }
  }

  function handleNext() {
    if (isLast) {
      finish()
      return
    }
    setStep(step + 1)
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-xl flex-col px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Step {step + 1} of {STEPS.length}
        </span>
        <button
          type="button"
          onClick={finish}
          disabled={submitting}
          className="transition-colors hover:text-foreground disabled:opacity-50"
        >
          Skip
        </button>
      </div>

      <div className="mt-3 flex gap-1.5" aria-hidden>
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= step ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {current.title}
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
          {current.description}
        </p>
      </div>

      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          disabled={step === 0 || submitting}
          onClick={() => setStep(step - 1)}
        >
          Back
        </Button>
        <Button onClick={handleNext} disabled={submitting}>
          {isLast
            ? submitting
              ? 'Loading…'
              : 'Get started'
            : 'Next'}
        </Button>
      </div>
    </section>
  )
}
