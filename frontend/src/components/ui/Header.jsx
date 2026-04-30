import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import ThemeToggle from './ThemeToggle'
import { Button } from './button'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'

export default function Header() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await signOut()
      toast.success('Signed out')
      navigate({ to: '/' })
    } catch {
      toast.error('Failed to sign out. Try again.')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-foreground no-underline"
        >
          Organex
        </Link>

        {!loading && user && (
          <div className="hidden items-center gap-1 sm:flex">
            <Link
              to="/library"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: 'bg-muted text-foreground' }}
            >
              Library
            </Link>
            <Link
              to="/collections"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: 'bg-muted text-foreground' }}
            >
              Collections
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {!loading && user && (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.displayName || user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          )}

          {!loading && !user && (
            <Button asChild size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  )
}
