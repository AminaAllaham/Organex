import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import { getProfile, updateProfile, uploadAvatar } from '@/lib/profile'
import { resetPassword } from '@/lib/auth'
import { profileSchema } from '@/lib/validations'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export const Route = createFileRoute('/profile')({ component: ProfilePage })

function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileView />
    </ProtectedRoute>
  )
}

function ProfileView() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resetSending, setResetSending] = useState(false)
  const fileInputRef = useRef(null)

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '' },
  })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getProfile()
      .then((p) => {
        if (cancelled) return
        setProfile(p)
        form.reset({ displayName: p?.displayName || user.displayName || '' })
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function onSubmit(values) {
    setSubmitting(true)
    try {
      await updateProfile(values)
      setProfile((p) => ({ ...p, displayName: values.displayName }))
      toast.success('Profile updated')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update profile.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Image must be smaller than 2MB.')
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const url = await uploadAvatar(file)
      setProfile((p) => ({ ...p, avatarUrl: url }))
      toast.success('Avatar updated')
    } catch (err) {
      console.error(err)
      toast.error('Failed to upload avatar.')
    } finally {
      setUploading(false)
      // Reset so the same file can be selected again next time.
      e.target.value = ''
    }
  }

  async function handlePasswordReset() {
    if (!user.email) return
    setResetSending(true)
    try {
      await resetPassword(user.email)
      toast.success(`Password reset email sent to ${user.email}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to send reset email.')
    } finally {
      setResetSending(false)
    }
  }

  if (status === 'loading') {
    return (
      <p className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-muted-foreground">
        Loading profile…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <p className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-destructive">
        Couldn't load your profile. Refresh to try again.
      </p>
    )
  }

  const initials = getInitials(profile?.displayName || user.email || '?')

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account details.
      </p>

      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Avatar className="size-20">
          {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleAvatarChange}
          />
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            {uploading ? 'Uploading…' : 'Change avatar'}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            PNG or JPG. Max 2MB.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={user.email} disabled />
            <p className="text-xs text-muted-foreground">
              Email can't be changed for now.
            </p>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Form>

      <hr className="my-10 border-border" />

      <div>
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll send a reset link to your email.
        </p>
        <Button
          variant="outline"
          onClick={handlePasswordReset}
          disabled={resetSending}
          className="mt-4"
        >
          {resetSending ? 'Sending…' : 'Send reset email'}
        </Button>
      </div>
    </section>
  )
}

function getInitials(value) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
