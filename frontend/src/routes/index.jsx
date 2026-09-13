import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  FolderOpen,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Tag,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import ResourceCard from '@/components/library/ResourceCard'
import { useAuth } from '@/hooks/useAuth'
import { listCollections } from '@/lib/collections'
import { listResources } from '@/lib/resources'
import { listTags } from '@/lib/tags'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return <HomeLoading />
  }

  if (user) {
    return <Dashboard user={user} />
  }

  return <GuestHome />
}

function GuestHome() {
  return (
    <main className="overflow-hidden">
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
          <div>
            <Badge variant="secondary" className="mb-5 gap-2">
              <BookOpen className="size-3.5" />
              Your learning library
            </Badge>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              Keep your best ideas within reach.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Organize learning resources, PDFs, articles, videos, notes,
              collections, and tags in one personal library.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/signup">
                  Get started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Organex library
                </p>
                <p className="mt-1 text-xl font-semibold">A calmer way to learn</p>
              </div>
              <BookOpen className="size-6 text-primary" />
            </div>
            <div className="grid gap-3 pt-5 sm:grid-cols-2">
              <FeaturePreview icon={FolderOpen} label="Resources" value="Sorted and searchable" />
              <FeaturePreview icon={Layers3} label="Collections" value="Grouped by purpose" />
              <FeaturePreview icon={Tag} label="Tags" value="Easy to filter" />
              <FeaturePreview icon={ShieldCheck} label="Private PDFs" value="Securely accessed" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Built for your flow
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need to keep learning material useful.
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={BookOpen} title="Save resources" description="Keep links, articles, videos, notes, and PDFs together." />
          <FeatureCard icon={Layers3} title="Organize with collections and tags" description="Build a structure that matches the way you think." />
          <FeatureCard icon={Search} title="Search your personal library" description="Find what you saved without retracing every tab." />
          <FeatureCard icon={ShieldCheck} title="Keep private PDFs securely" description="Access protected PDFs through short-lived secure links." />
        </div>
      </section>
    </main>
  )
}

function FeaturePreview({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{value}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Icon className="size-5 text-primary" />
        <CardTitle className="mt-2 text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}

function HomeLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-56 rounded-md bg-muted" />
        <div className="h-4 max-w-xl rounded-md bg-muted" />
        <div className="h-24 rounded-xl bg-muted/70" />
      </div>
    </main>
  )
}

function Dashboard({ user }) {
  const [resources, setResources] = useState([])
  const [collections, setCollections] = useState([])
  const [tags, setTags] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false

    setStatus('loading')
    Promise.all([listResources(), listCollections(), listTags()])
      .then(([resourceData, collectionData, tagData]) => {
        if (cancelled) return
        setResources(resourceData)
        setCollections(collectionData)
        setTags(tagData)
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
  }, [user])

  const displayName = user.displayName || user.email || 'there'
  const starredCount = resources.filter((resource) => resource.isStarred).length
  const recentResources = resources.slice(0, 6)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Your library</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Pick up where you left off or add something worth keeping.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/resources/new">
              <Plus className="size-4" />
              Add resource
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/search">
              <Search className="size-4" />
              Search library
            </Link>
          </Button>
        </div>
      </section>

      {status === 'error' ? (
        <section className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Couldn&apos;t load your dashboard data. Your navigation and actions are still available.
        </section>
      ) : (
        <>
          <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={BookOpen} label="Total resources" value={status === 'loading' ? '—' : resources.length} />
            <StatCard icon={Layers3} label="Collections" value={status === 'loading' ? '—' : collections.length} />
            <StatCard icon={Tag} label="Tags" value={status === 'loading' ? '—' : tags.length} />
            <StatCard icon={Star} label="Starred" value={status === 'loading' ? '—' : starredCount} />
          </section>

          <section className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Recently added</h2>
                <p className="mt-1 text-sm text-muted-foreground">The latest pieces in your library.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/library">
                  View library
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            {status === 'loading' ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-40 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : recentResources.length === 0 ? (
              <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-border py-12 text-center">
                <BookOpen className="size-6 text-muted-foreground" />
                <h3 className="mt-3 font-semibold">Your library is ready for its first resource.</h3>
                <p className="mt-1 text-sm text-muted-foreground">Save something useful and it will appear here.</p>
                <Button asChild className="mt-5">
                  <Link to="/resources/new">
                    <Plus className="size-4" />
                    Add your first resource
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentResources.map((resource) => (
                  <li key={resource.id}>
                    <ResourceCard
                      resource={resource}
                      tags={tags}
                      collections={collections}
                      className="border border-border/80 bg-card shadow-sm"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-12 border-t border-border pt-8">
            <h2 className="text-xl font-semibold tracking-tight">Quick links</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickLink to="/library" icon={BookOpen} label="Library" />
              <QuickLink to="/collections" icon={Layers3} label="Collections" />
              <QuickLink to="/tags" icon={Tag} label="Tags" />
              <QuickLink to="/search" icon={Search} label="Search" />
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="border border-border/80 bg-card shadow-sm">
      <CardContent className="flex items-center gap-3 pt-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        {label}
      </span>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  )
}
