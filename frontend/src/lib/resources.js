import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/firebase/config'

function resourcesRef(uid) {
  return collection(db, 'users', uid, 'resources')
}

export async function addResource(data) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  // url is already validated as a valid URL by zod, so this won't throw.
  const sourceDomain = data.url ? new URL(data.url).hostname.replace(/^www\./, '') : ''

  const docRef = await addDoc(resourcesRef(user.uid), {
    url: data.url,
    title: data.title,
    description: data.description || '',
    thumbnailUrl: '',
    resourceType: data.resourceType || 'link',
    sourceDomain,
    personalNotes: '',
    isStarred: false,
    tagIds: [],
    collectionIds: [],
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
