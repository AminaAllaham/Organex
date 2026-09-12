import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
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

  if (!user) {
    throw new Error('Not authenticated')
  }

  const isPdf = data.resourceType === 'pdf'

  const docRef = await addDoc(resourcesRef(user.uid), {
    url: isPdf ? '' : data.url || '',

    title: data.title,

    description: data.description || '',

    thumbnailUrl: '',

    resourceType: data.resourceType || 'link',

    sourceDomain: isPdf ? '' : deriveSourceDomain(data.url),

    personalNotes: '',

    isStarred: false,

    tagIds: data.tagIds || [],

    collectionIds: data.collectionIds || [],

    file: isPdf
      ? {
        publicId: data.file?.publicId || '',
        secureUrl: data.file?.secureUrl || '',
        originalFilename: data.file?.originalFilename || '',
        format: data.file?.format || 'pdf',
        bytes: data.file?.bytes || 0,
        resourceType: data.file?.resourceType || 'raw',
        deliveryType: data.file?.deliveryType || 'authenticated',
      }
      : null,

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

export async function listResources() {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  const q = query(
    resourcesRef(user.uid),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export async function listResourcesByCollection(collectionId) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  const q = query(
    resourcesRef(user.uid),
    where('collectionIds', 'array-contains', collectionId),
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export async function listResourcesByTag(tagId) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  const q = query(
    resourcesRef(user.uid),
    where('tagIds', 'array-contains', tagId),
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export async function getResource(id) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  const snap = await getDoc(resourceDoc(user.uid, id))

  if (!snap.exists()) {
    return null
  }

  return {
    id: snap.id,
    ...snap.data(),
  }
}

export async function getSecurePdfAccessUrl(resourceId, action = 'view') {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  if (!['view', 'download'].includes(action)) {
    throw new Error('Invalid PDF access action')
  }

  const token = await user.getIdToken()
  const response = await fetch('/api/pdf-access', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceId,
      action,
    }),
  })

  if (!response.ok) {
    let errorMessage = 'Unable to access PDF'

    try {
      const errorData = await response.json()

      if (typeof errorData?.error === 'string' && errorData.error.trim()) {
        errorMessage = errorData.error
      }
    } catch {
      // Use the friendly fallback when the API response is not JSON.
    }

    throw new Error(errorMessage)
  }

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('Invalid PDF access response')
  }

  if (typeof data?.url !== 'string' || !data.url.trim()) {
    throw new Error('Invalid PDF access response')
  }

  return data
}

export async function deleteSecurePdfResource(resourceId) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  if (typeof resourceId !== 'string' || !resourceId.trim()) {
    throw new Error('Invalid resource ID')
  }

  const token = await user.getIdToken()
  const response = await fetch('/api/pdf-delete', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceId,
    }),
  })

  if (!response.ok) {
    let errorMessage = 'Unable to delete PDF'

    try {
      const errorData = await response.json()

      if (typeof errorData?.error === 'string' && errorData.error.trim()) {
        errorMessage = errorData.error
      }
    } catch {
      // Use the friendly fallback when the API response is not JSON.
    }

    throw new Error(errorMessage)
  }

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('Invalid PDF delete response')
  }

  if (data?.success !== true) {
    throw new Error('Invalid PDF delete response')
  }

  return data
}

export async function cleanupSecurePdfUpload(publicId) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  if (typeof publicId !== 'string' || !publicId.trim()) {
    throw new Error('Invalid public ID')
  }

  const token = await user.getIdToken()
  const response = await fetch('/api/pdf-cleanup', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      publicId,
    }),
  })

  if (!response.ok) {
    let errorMessage = 'Unable to clean up PDF'

    try {
      const errorData = await response.json()

      if (typeof errorData?.error === 'string' && errorData.error.trim()) {
        errorMessage = errorData.error
      }
    } catch {
      // Use the friendly fallback when the API response is not JSON.
    }

    throw new Error(errorMessage)
  }

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('Invalid PDF cleanup response')
  }

  if (data?.success !== true) {
    throw new Error('Invalid PDF cleanup response')
  }

  return data
}

export async function updateResource(id, data) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  const patch = {
    ...data,
    updatedAt: serverTimestamp(),
  }

  if ('url' in data) {
    patch.sourceDomain = deriveSourceDomain(data.url)
  }

  if (data.resourceType === 'pdf') {
    patch.url = ''
    patch.sourceDomain = ''
  }

  await updateDoc(resourceDoc(user.uid, id), patch)
}

export async function deleteResource(id) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  await deleteDoc(resourceDoc(user.uid, id))
}

export async function toggleStar(id, currentStarred) {
  return updateResource(id, {
    isStarred: !currentStarred,
  })
}
