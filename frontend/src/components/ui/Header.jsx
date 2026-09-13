import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { MenuIcon } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Button } from './button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'

export default function Header() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function handleLogout() {
    try {
      await signOut()
      toast.success('Signed out')
      navigate({ to: '/' })
      setMobileMenuOpen(false)
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
            <Link
              to="/tags"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: 'bg-muted text-foreground' }}
            >
              Tags
            </Link>
            <Link
              to="/search"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: 'bg-muted text-foreground' }}
            >
              Search
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {!loading && user && (
            <>
              <Link
                to="/profile"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                {user.displayName || user.email}
              </Link>
              <Button
                className="hidden sm:inline-flex"
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Sign out
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="sm:hidden"
                    aria-label="Open navigation menu"
                  >
                    <MenuIcon />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="sm:hidden">
                  <SheetHeader>
                    <SheetTitle>{user.displayName || user.email}</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 px-4" aria-label="Mobile navigation">
                    <SheetClose asChild>
                      <Link
                        to="/"
                        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Home
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/library"
                        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Library
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/collections"
                        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Collections
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/tags"
                        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Tags
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/search"
                        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Search
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/profile"
                        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Profile
                      </Link>
                    </SheetClose>
                  </nav>
                  <SheetFooter>
                    <Button variant="outline" onClick={handleLogout}>
                      Sign out
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
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
