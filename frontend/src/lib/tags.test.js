import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    auth: {
        currentUser: null,
    },
    db: { name: 'mock-db' },
    collection: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    doc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    arrayRemove: vi.fn((id) => ({
        operation: 'arrayRemove',
        value: id,
    })),
    writeBatch: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
    collection: mocks.collection,
    addDoc: vi.fn(),
    getDocs: mocks.getDocs,
    getDoc: mocks.getDoc,
    doc: mocks.doc,
    updateDoc: vi.fn(),
    query: mocks.query,
    where: mocks.where,
    arrayRemove: mocks.arrayRemove,
    writeBatch: mocks.writeBatch,
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(),
}))

vi.mock('@/firebase/config', () => ({
    auth: mocks.auth,
    db: mocks.db,
}))

import { deleteTag, getTag } from './tags'

const user = { uid: 'user-123' }
const tagId = 'tag-456'

function createBatch() {
    return {
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
    }
}

function createResourceSnapshot(id) {
    return {
        ref: { path: `users/${user.uid}/resources/${id}` },
    }
}

function configureFirestore({ resources = [], batch = createBatch() } = {}) {
    mocks.collection.mockImplementation((...segments) => ({
        path: segments.slice(1).join('/'),
    }))
    mocks.doc.mockImplementation((...segments) => ({
        path: segments.slice(1).join('/'),
    }))
    mocks.where.mockImplementation((...args) => ({ type: 'where', args }))
    mocks.query.mockImplementation((...args) => ({ type: 'query', args }))
    mocks.getDocs.mockResolvedValue({
        size: resources.length,
        docs: resources,
    })
    mocks.writeBatch.mockReturnValue(batch)

    return batch
}

beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.currentUser = user
})

describe('deleteTag', () => {
    it('rejects when the user is not authenticated without querying or committing', async () => {
        mocks.auth.currentUser = null

        await expect(deleteTag(tagId)).rejects.toThrow('Not authenticated')

        expect(mocks.getDocs).not.toHaveBeenCalled()
        expect(mocks.writeBatch).not.toHaveBeenCalled()
    })

    it('deletes an unreferenced tag in one batch', async () => {
        const batch = configureFirestore()

        await deleteTag(tagId)

        expect(mocks.collection).toHaveBeenCalledWith(
            mocks.db,
            'users',
            user.uid,
            'resources',
        )
        expect(mocks.where).toHaveBeenCalledWith(
            'tagIds',
            'array-contains',
            tagId,
        )
        expect(batch.update).not.toHaveBeenCalled()
        expect(batch.delete).toHaveBeenCalledWith({
            path: `users/${user.uid}/tags/${tagId}`,
        })
        expect(batch.commit).toHaveBeenCalledTimes(1)
    })

    it('removes the tag ID from one resource without deleting the resource', async () => {
        const resource = createResourceSnapshot('resource-1')
        const batch = configureFirestore({ resources: [resource] })

        await deleteTag(tagId)

        expect(batch.update).toHaveBeenCalledWith(resource.ref, {
            tagIds: {
                operation: 'arrayRemove',
                value: tagId,
            },
        })
        expect(batch.delete).toHaveBeenCalledTimes(1)
        expect(batch.delete).toHaveBeenCalledWith({
            path: `users/${user.uid}/tags/${tagId}`,
        })
        expect(batch.commit).toHaveBeenCalledTimes(1)
    })

    it('updates every matching resource and deletes only the tag', async () => {
        const resources = [
            createResourceSnapshot('resource-1'),
            createResourceSnapshot('resource-2'),
            createResourceSnapshot('resource-3'),
        ]
        const batch = configureFirestore({ resources })

        await deleteTag(tagId)

        expect(batch.update).toHaveBeenCalledTimes(resources.length)
        resources.forEach((resource) => {
            expect(batch.update).toHaveBeenCalledWith(resource.ref, {
                tagIds: {
                    operation: 'arrayRemove',
                    value: tagId,
                },
            })
        })
        expect(batch.delete).toHaveBeenCalledTimes(1)
        expect(batch.delete).toHaveBeenCalledWith({
            path: `users/${user.uid}/tags/${tagId}`,
        })
        expect(batch.commit).toHaveBeenCalledTimes(1)
    })

    it('allows exactly 499 referenced resources', async () => {
        const resources = Array.from({ length: 499 }, (_, index) =>
            createResourceSnapshot(`resource-${index}`),
        )
        const batch = configureFirestore({ resources })

        await deleteTag(tagId)

        expect(batch.update).toHaveBeenCalledTimes(499)
        expect(batch.delete).toHaveBeenCalledTimes(1)
        expect(batch.commit).toHaveBeenCalledTimes(1)
    })

    it('rejects 500 referenced resources before creating or committing a batch', async () => {
        const resources = Array.from({ length: 500 }, (_, index) =>
            createResourceSnapshot(`resource-${index}`),
        )
        const batch = configureFirestore({ resources })

        await expect(deleteTag(tagId)).rejects.toThrow(
            'Cannot delete a tag referenced by more than 499 resources',
        )

        expect(mocks.writeBatch).not.toHaveBeenCalled()
        expect(batch.update).not.toHaveBeenCalled()
        expect(batch.delete).not.toHaveBeenCalled()
        expect(batch.commit).not.toHaveBeenCalled()
    })

    it('never deletes a resource and sends only the tagIds update', async () => {
        const resources = [
            createResourceSnapshot('resource-1'),
            createResourceSnapshot('resource-2'),
        ]
        const batch = configureFirestore({ resources })

        await deleteTag(tagId)

        expect(batch.update).toHaveBeenCalledTimes(2)
        batch.update.mock.calls.forEach(([resourceRef, update]) => {
            expect(resourceRef.path).toMatch(/^users\/user-123\/resources\//)
            expect(update).toEqual({
                tagIds: {
                    operation: 'arrayRemove',
                    value: tagId,
                },
            })
            expect(update).not.toHaveProperty('resourceType')
        })
        expect(batch.delete).toHaveBeenCalledTimes(1)
        expect(batch.delete.mock.calls[0][0]).toEqual({
            path: `users/${user.uid}/tags/${tagId}`,
        })
    })
})

describe('getTag', () => {
    it('rejects when the user is not authenticated without reading Firestore', async () => {
        mocks.auth.currentUser = null

        await expect(getTag(tagId)).rejects.toThrow('Not authenticated')

        expect(mocks.getDoc).not.toHaveBeenCalled()
    })

    it('returns an existing tag with its document ID', async () => {
        const storedData = {
            name: 'Typography',
            color: '#94a3b8',
        }
        const tagReference = {
            path: `users/${user.uid}/tags/${tagId}`,
        }

        mocks.doc.mockReturnValue(tagReference)
        mocks.getDoc.mockResolvedValue({
            id: tagId,
            exists: () => true,
            data: () => storedData,
        })

        await expect(getTag(tagId)).resolves.toEqual({
            id: tagId,
            ...storedData,
        })

        expect(mocks.getDoc).toHaveBeenCalledTimes(1)
        expect(mocks.getDoc).toHaveBeenCalledWith(tagReference)
        expect(mocks.doc).toHaveBeenCalledWith(
            mocks.db,
            'users',
            user.uid,
            'tags',
            tagId,
        )
    })

    it('returns null when the tag does not exist', async () => {
        const tagReference = {
            path: `users/${user.uid}/tags/${tagId}`,
        }

        mocks.doc.mockReturnValue(tagReference)
        mocks.getDoc.mockResolvedValue({
            exists: () => false,
        })

        await expect(getTag(tagId)).resolves.toBeNull()
    })
})
