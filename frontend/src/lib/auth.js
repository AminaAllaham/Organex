import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase/config'

export async function signUp({ email, password, displayName }) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password)

  await updateProfile(userCred.user, { displayName })

  // Create the user's profile document. Subcollections (resources, collections, tags)
  // get created lazily when the user adds their first item.
  await setDoc(doc(db, 'users', userCred.user.uid), {
    displayName,
    avatarUrl: '',
    onboardingCompleted: false,
    preferences: {},
    createdAt: serverTimestamp(),
  })

  return userCred.user
}

export async function signIn({ email, password }) {
  const userCred = await signInWithEmailAndPassword(auth, email, password)
  return userCred.user
}

export async function signOut() {
  await fbSignOut(auth)
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}
