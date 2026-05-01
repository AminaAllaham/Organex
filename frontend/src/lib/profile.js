import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { updateProfile as updateAuthProfile } from 'firebase/auth'
import { auth, db } from '@/firebase/config'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

function profileDoc(uid) {
  return doc(db, 'users', uid)
}

export async function getProfile() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const snap = await getDoc(profileDoc(user.uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateProfile({ displayName }) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  await updateAuthProfile(user, { displayName })
  await updateDoc(profileDoc(user.uid), {
    displayName,
    updatedAt: serverTimestamp(),
  })
}

export async function markOnboardingComplete() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  await updateDoc(profileDoc(user.uid), {
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  })
}

export async function uploadAvatar(file) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  // Upload to Cloudinary using an unsigned preset. Firebase Storage requires a
  // paid plan as of late 2024, so we host avatars externally and store the URL
  // in Firestore. The preset is configured server-side at Cloudinary to limit
  // size/format, so no API secret is exposed to the browser.
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('public_id', `users/${user.uid}/avatar`)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  )

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Cloudinary upload failed: ${detail}`)
  }

  const { secure_url: url } = await res.json()

  await updateAuthProfile(user, { photoURL: url })
  await updateDoc(profileDoc(user.uid), {
    avatarUrl: url,
    updatedAt: serverTimestamp(),
  })

  return url
}
