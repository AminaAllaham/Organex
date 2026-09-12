import {
  collection,
  addDoc,
  getDocs,
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

  const resourcesQuery = query(
    collection(db, 'users', user.uid, 'resources'),
    where('collectionIds', 'array-contains', id),
  )
  const resourcesSnapshot = await getDocs(resourcesQuery)

  if (resourcesSnapshot.size > 499) {
    throw new Error(
      'Cannot delete a collection referenced by more than 499 resources'
    )
  }

  const batch = writeBatch(db)

  resourcesSnapshot.docs.forEach((resourceSnapshot) => {
    batch.update(resourceSnapshot.ref, {
      collectionIds: arrayRemove(id),
    })
  })

  batch.delete(collectionDoc(user.uid, id))
  await batch.commit()
}
