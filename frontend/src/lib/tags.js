import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  arrayRemove,
  writeBatch,
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

export async function getTag(id) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  const snap = await getDoc(tagDoc(user.uid, id))

  if (!snap.exists()) return null

  return {
    id: snap.id,
    ...snap.data(),
  }
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

  const resourcesQuery = query(
    collection(db, 'users', user.uid, 'resources'),
    where('tagIds', 'array-contains', id),
  )
  const resourcesSnapshot = await getDocs(resourcesQuery)

  if (resourcesSnapshot.size > 499) {
    throw new Error(
      'Cannot delete a tag referenced by more than 499 resources'
    )
  }

  const batch = writeBatch(db)

  resourcesSnapshot.docs.forEach((resourceSnapshot) => {
    batch.update(resourceSnapshot.ref, {
      tagIds: arrayRemove(id),
    })
  })

  batch.delete(tagDoc(user.uid, id))
  await batch.commit()
}
