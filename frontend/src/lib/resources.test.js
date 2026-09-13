import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    auth: {
        currentUser: null,
    },
    db: { name: 'mock-db' },
    collection: vi.fn(),
    addDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    writeBatch: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
    collection: mocks.collection,
    addDoc: mocks.addDoc,
    getDoc: mocks.getDoc,
    getDocs: mocks.getDocs,
    doc: mocks.doc,
    updateDoc: mocks.updateDoc,
    deleteDoc: mocks.deleteDoc,
    query: mocks.query,
    where: mocks.where,
    orderBy: mocks.orderBy,
    serverTimestamp: mocks.serverTimestamp,
    writeBatch: mocks.writeBatch,
}))

vi.mock('@/firebase/config', () => ({
    auth: mocks.auth,
    db: mocks.db,
}))

import {
    addResource,
    deleteResource,
    getResource,
    listResources,
    listResourcesByCollection,
    listResourcesByTag,
    getSecurePdfAccessUrl,
    deleteSecurePdfResource,
    cleanupSecurePdfUpload,
    toggleStar,
} from './resources'

const user = { uid: 'test-user-123' }
const collectionId = 'collection-abc'
const tagId = 'tag-abc'

function configureFirestore(resources = []) {
    mocks.collection.mockImplementation((...segments) => ({
        path: segments.slice(1).join('/'),
    }))
    mocks.doc.mockImplementation((...segments) => ({
        path: segments.slice(1).join('/'),
    }))
    mocks.where.mockImplementation((...args) => ({ type: 'where', args }))
    mocks.orderBy.mockImplementation((...args) => ({ type: 'orderBy', args }))
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

afterEach(() => {
    vi.unstubAllGlobals()
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

describe('core resource operations', () => {
    it('lists the authenticated user resources newest first', async () => {
        configureFirestore([createResourceSnapshot('resource-1', { title: 'First' })])

        await expect(listResources()).resolves.toEqual([
            { id: 'resource-1', title: 'First' },
        ])
        expect(mocks.orderBy).toHaveBeenCalledWith('createdAt', 'desc')
        expect(mocks.getDocs).toHaveBeenCalledTimes(1)
    })

    it('rejects unauthenticated resource reads and writes', async () => {
        mocks.auth.currentUser = null

        await expect(listResources()).rejects.toThrow('Not authenticated')
        await expect(addResource({ title: 'Blocked' })).rejects.toThrow('Not authenticated')
        await expect(deleteResource('resource-1')).rejects.toThrow('Not authenticated')
        expect(mocks.getDocs).not.toHaveBeenCalled()
        expect(mocks.addDoc).not.toHaveBeenCalled()
        expect(mocks.deleteDoc).not.toHaveBeenCalled()
    })

    it('creates a link resource with its derived source domain', async () => {
        configureFirestore()
        mocks.serverTimestamp.mockReturnValue('timestamp')
        mocks.addDoc.mockResolvedValue({ id: 'resource-1' })

        await expect(
            addResource({
                title: 'Useful link',
                description: 'Read this',
                url: 'https://www.example.com/path',
                resourceType: 'link',
            }),
        ).resolves.toBe('resource-1')

        expect(mocks.addDoc).toHaveBeenCalledWith(
            { path: `users/${user.uid}/resources` },
            expect.objectContaining({
                url: 'https://www.example.com/path',
                sourceDomain: 'example.com',
                resourceType: 'link',
                isStarred: false,
                file: null,
            }),
        )
    })

    it('creates a PDF resource without exposing a URL', async () => {
        configureFirestore()
        mocks.addDoc.mockResolvedValue({ id: 'pdf-1' })

        await addResource({
            title: 'Research PDF',
            url: 'https://ignored.example/file.pdf',
            resourceType: 'pdf',
            file: { originalFilename: 'research.pdf', publicId: 'public-id' },
        })

        expect(mocks.addDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                url: '',
                sourceDomain: '',
                file: expect.objectContaining({
                    originalFilename: 'research.pdf',
                    publicId: 'public-id',
                }),
            }),
        )
    })

    it('returns a resource, deletes it, and toggles its star state', async () => {
        configureFirestore()
        const storedData = { title: 'Saved', isStarred: true }
        const reference = { path: `users/${user.uid}/resources/resource-1` }
        mocks.doc.mockReturnValue(reference)
        mocks.getDoc.mockResolvedValue({
            id: 'resource-1',
            exists: () => true,
            data: () => storedData,
        })

        await expect(getResource('resource-1')).resolves.toEqual({
            id: 'resource-1',
            ...storedData,
        })
        await deleteResource('resource-1')
        await toggleStar('resource-1', true)

        expect(mocks.deleteDoc).toHaveBeenCalledWith(reference)
        expect(mocks.updateDoc).toHaveBeenCalledWith(
            reference,
            expect.objectContaining({ isStarred: false }),
        )
    })
})

describe('secure PDF resource requests', () => {
    const pdfUser = {
        uid: user.uid,
        getIdToken: vi.fn().mockResolvedValue('test-token'),
    }

    it('rejects PDF access when unauthenticated without making a request', async () => {
        mocks.auth.currentUser = null
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        await expect(getSecurePdfAccessUrl('pdf-1')).rejects.toThrow('Not authenticated')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('requests a secure PDF URL with the authenticated token and action', async () => {
        mocks.auth.currentUser = pdfUser
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ url: 'https://signed.example/pdf' }),
        })
        vi.stubGlobal('fetch', fetchMock)

        await expect(getSecurePdfAccessUrl('pdf-1', 'download')).resolves.toEqual({
            url: 'https://signed.example/pdf',
        })
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/pdf-access',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-token',
                }),
                body: JSON.stringify({ resourceId: 'pdf-1', action: 'download' }),
            }),
        )
    })

    it('rejects invalid cleanup input before making a request', async () => {
        mocks.auth.currentUser = pdfUser
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        await expect(cleanupSecurePdfUpload('')).rejects.toThrow('Invalid public ID')
        await expect(deleteSecurePdfResource('')).rejects.toThrow('Invalid resource ID')
        expect(fetchMock).not.toHaveBeenCalled()
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
