import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    auth: {
        currentUser: null,
    },
    db: { name: 'mock-db' },
    collection: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    writeBatch: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
    collection: mocks.collection,
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: mocks.getDocs,
    doc: vi.fn(),
    updateDoc: mocks.updateDoc,
    deleteDoc: mocks.deleteDoc,
    query: mocks.query,
    where: mocks.where,
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(),
    writeBatch: mocks.writeBatch,
}))

vi.mock('@/firebase/config', () => ({
    auth: mocks.auth,
    db: mocks.db,
}))

import { listResourcesByCollection, listResourcesByTag } from './resources'

const user = { uid: 'test-user-123' }
const collectionId = 'collection-abc'
const tagId = 'tag-abc'

function configureFirestore(resources = []) {
    mocks.collection.mockImplementation((...segments) => ({
        path: segments.slice(1).join('/'),
    }))
    mocks.where.mockImplementation((...args) => ({ type: 'where', args }))
    mocks.query.mockImplementation((...args) => ({ type: 'query', args }))
    mocks.getDocs.mockResolvedValue({
        docs: resources,
    })
}

function createResourceSnapshot(id, data) {
    return {
        id,
        data: () => data,
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.currentUser = user
})

describe('listResourcesByCollection', () => {
    it('rejects when the user is not authenticated without reading Firestore', async () => {
        mocks.auth.currentUser = null

        await expect(
            listResourcesByCollection(collectionId),
        ).rejects.toThrow('Not authenticated')

        expect(mocks.getDocs).not.toHaveBeenCalled()
    })

    it('queries only the authenticated user resources with collection membership', async () => {
        configureFirestore()

        await listResourcesByCollection(collectionId)

        expect(mocks.collection).toHaveBeenCalledWith(
            mocks.db,
            'users',
            user.uid,
            'resources',
        )
        expect(mocks.where).toHaveBeenCalledWith(
            'collectionIds',
            'array-contains',
            collectionId,
        )
        expect(mocks.query).toHaveBeenCalledTimes(1)
        expect(mocks.getDocs).toHaveBeenCalledTimes(1)
    })

    it('returns matching resources with their document IDs', async () => {
        const resource1Data = {
            title: 'Research notes',
            description: 'Useful findings',
            resourceType: 'link',
            collectionIds: [collectionId],
        }
        const resource2Data = {
            title: 'Design article',
            description: 'A reference article',
            resourceType: 'article',
            collectionIds: [collectionId],
        }
        configureFirestore([
            createResourceSnapshot('resource-1', resource1Data),
            createResourceSnapshot('resource-2', resource2Data),
        ])

        await expect(
            listResourcesByCollection(collectionId),
        ).resolves.toEqual([
            { id: 'resource-1', ...resource1Data },
            { id: 'resource-2', ...resource2Data },
        ])
    })

    it('returns an empty array when no resources match', async () => {
        configureFirestore()

        await expect(
            listResourcesByCollection(collectionId),
        ).resolves.toEqual([])
    })

    it('performs no write or mutation operation', async () => {
        configureFirestore()

        await listResourcesByCollection(collectionId)

        expect(mocks.writeBatch).not.toHaveBeenCalled()
        expect(mocks.updateDoc).not.toHaveBeenCalled()
        expect(mocks.deleteDoc).not.toHaveBeenCalled()
    })
})

describe('listResourcesByTag', () => {
    it('rejects when the user is not authenticated without reading Firestore', async () => {
        mocks.auth.currentUser = null

        await expect(listResourcesByTag(tagId)).rejects.toThrow(
            'Not authenticated',
        )

        expect(mocks.getDocs).not.toHaveBeenCalled()
    })

    it('queries only the authenticated user resources with tag membership', async () => {
        configureFirestore()

        await listResourcesByTag(tagId)

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
        expect(mocks.query).toHaveBeenCalledTimes(1)
        expect(mocks.getDocs).toHaveBeenCalledTimes(1)
    })

    it('returns matching resources with their document IDs', async () => {
        const resource1Data = {
            title: 'Typography notes',
            description: 'Useful findings',
            resourceType: 'link',
            tagIds: [tagId],
        }
        const resource2Data = {
            title: 'Design article',
            description: 'A reference article',
            resourceType: 'article',
            tagIds: [tagId],
        }
        configureFirestore([
            createResourceSnapshot('resource-1', resource1Data),
            createResourceSnapshot('resource-2', resource2Data),
        ])

        await expect(listResourcesByTag(tagId)).resolves.toEqual([
            { id: 'resource-1', ...resource1Data },
            { id: 'resource-2', ...resource2Data },
        ])
    })

    it('returns an empty array when no resources match', async () => {
        configureFirestore()

        await expect(listResourcesByTag(tagId)).resolves.toEqual([])
    })

    it('performs no write or mutation operation', async () => {
        configureFirestore()

        await listResourcesByTag(tagId)

        expect(mocks.writeBatch).not.toHaveBeenCalled()
        expect(mocks.updateDoc).not.toHaveBeenCalled()
        expect(mocks.deleteDoc).not.toHaveBeenCalled()
    })
})
