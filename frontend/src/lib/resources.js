import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/firebase/config'

function resourcesRef(uid) {
  return collection(db, 'users', uid, 'resources')
}

function resourceDoc(uid, id) {
  return doc(db, 'users', uid, 'resources', id)
}

function deriveSourceDomain(url) {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export async function addResource(data) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  const docRef = await addDoc(resourcesRef(user.uid), {
    url: data.url,
    title: data.title,
    description: data.description || '',
    thumbnailUrl: '',
    resourceType: data.resourceType || 'link',
    sourceDomain: deriveSourceDomain(data.url),
    personalNotes: '',
    isStarred: false,
    tagIds: data.tagIds || [],
    collectionIds: data.collectionIds || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

export async function listResources() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  const q = query(resourcesRef(user.uid), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export async function getResource(id) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const snap = await getDoc(resourceDoc(user.uid, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function updateResource(id, data) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  const patch = { ...data, updatedAt: serverTimestamp() }
  if ('url' in data) {
    patch.sourceDomain = deriveSourceDomain(data.url)
  }

  await updateDoc(resourceDoc(user.uid, id), patch)
}

export async function deleteResource(id) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  await deleteDoc(resourceDoc(user.uid, id))
}

export async function toggleStar(id, currentStarred) {
  return updateResource(id, { isStarred: !currentStarred })
}
