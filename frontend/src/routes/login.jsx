import { useState } from 'react'
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
import { Button } from '@/components/ui/button'

import { signIn, resetPassword } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

export const Route = createFileRoute('/login')({ component: LoginPage })

// Maps Firebase error codes to user-facing messages.
function authErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.'
    case 'auth/invalid-email':
      return 'That email address is not valid.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

function LoginPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values) {
    setSubmitting(true)
    try {
      await signIn(values)
      toast.success('Welcome back!')
      navigate({ to: '/' })
    } catch (err) {
      toast.error(authErrorMessage(err.code))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    const email = form.getValues('email')
    const result = loginSchema.shape.email.safeParse(email)
    if (!result.success) {
      toast.error('Enter your email above first, then click "Forgot password".')
      return
    }
    try {
      await resetPassword(email)
      toast.success('Password reset email sent. Check your inbox.')
    } catch (err) {
      toast.error(authErrorMessage(err.code))
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Sign in to Organex</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome back. Enter your details to continue.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Organex?{' '}
        <Link to="/signup" className="font-medium text-foreground hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  )
}
