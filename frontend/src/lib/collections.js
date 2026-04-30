import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/firebase/config'

function collectionsRef(uid) {
  return collection(db, 'users', uid, 'collections')
}

function collectionDoc(uid, id) {
  return doc(db, 'users', uid, 'collections', id)
}

export async function listCollections() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const q = query(collectionsRef(user.uid), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createCollection({ name, color = '#6366f1' }) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const docRef = await addDoc(collectionsRef(user.uid), {
    name,
    description: '',
    color,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function renameCollection(id, name) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  await updateDoc(collectionDoc(user.uid, id), { name })
}

export async function deleteCollection(id) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  // Note: this leaves the collection's id in any resource's collectionIds[].
  // We filter unknown ids at read time, so it's safe — cleanup can come later.
  await deleteDoc(collectionDoc(user.uid, id))
}
