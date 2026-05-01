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

function tagsRef(uid) {
  return collection(db, 'users', uid, 'tags')
}

function tagDoc(uid, id) {
  return doc(db, 'users', uid, 'tags', id)
}

export async function listTags() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const q = query(tagsRef(user.uid), orderBy('name', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createTag({ name, color = '#94a3b8' }) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const docRef = await addDoc(tagsRef(user.uid), {
    name,
    color,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function renameTag(id, name) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  await updateDoc(tagDoc(user.uid, id), { name })
}

export async function deleteTag(id) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  // Stale ids in resource.tagIds[] are ignored at read time — no cleanup needed for MVP.
  await deleteDoc(tagDoc(user.uid, id))
}
