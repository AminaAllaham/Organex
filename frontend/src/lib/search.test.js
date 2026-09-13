import { describe, expect, it } from 'vitest'

import { filterResources } from './search'

const tags = [
  { id: 'tag-design', name: 'Design' },
  { id: 'tag-reading', name: 'Reading' },
]

const collections = [
  { id: 'collection-work', name: 'Work' },
  { id: 'collection-personal', name: 'Personal' },
]

const resources = [
  {
    id: 'article-1',
    title: 'Design systems',
    description: 'A useful guide',
    personalNotes: 'Review tokens',
    url: 'https://example.com/design',
    sourceDomain: 'example.com',
    resourceType: 'article',
    isStarred: true,
    tagIds: ['tag-design'],
    collectionIds: ['collection-work'],
  },
  {
    id: 'pdf-1',
    title: 'Project notes',
    description: '',
    personalNotes: '',
    resourceType: 'pdf',
    isStarred: false,
    file: { originalFilename: 'research-plan.pdf' },
    tagIds: ['tag-reading'],
    collectionIds: ['collection-personal'],
  },
  {
    id: 'link-1',
    title: 'Unrelated link',
    description: 'Another resource',
    resourceType: 'link',
    isStarred: true,
    tagIds: ['missing-tag'],
    collectionIds: ['missing-collection'],
  },
]

describe('filterResources', () => {
  it('returns all resources for an empty or whitespace query', () => {
    expect(filterResources(resources, { query: '   ' }, tags, collections)).toHaveLength(3)
  })

  it.each([
    ['title', 'DESIGN SYSTEMS'],
    ['description', 'useful GUIDE'],
    ['personal notes', 'REVIEW TOKENS'],
    ['url', 'EXAMPLE.COM/DESIGN'],
    ['source domain', 'EXAMPLE.COM'],
    ['PDF filename', 'RESEARCH-PLAN.PDF'],
    ['tag name', 'design'],
    ['collection name', 'personal'],
  ])('matches the %s case-insensitively', (_field, query) => {
    expect(filterResources(resources, { query }, tags, collections)).toHaveLength(1)
  })

  it('combines query, type, starred, collection, and tag filters', () => {
    expect(
      filterResources(
        resources,
        {
          query: 'design',
          resourceType: 'article',
          starredOnly: true,
          collectionId: 'collection-work',
          tagId: 'tag-design',
        },
        tags,
        collections,
      ).map((resource) => resource.id),
    ).toEqual(['article-1'])
  })

  it('filters favorites and excludes an item after it is unstarred', () => {
    const favoriteIds = (items) =>
      filterResources(items, { starredOnly: true }).map((resource) => resource.id)

    expect(favoriteIds(resources)).toEqual(['article-1', 'link-1'])
    expect(favoriteIds(resources.map((resource) =>
      resource.id === 'article-1' ? { ...resource, isStarred: false } : resource,
    ))).toEqual(['link-1'])
  })

  it('handles stale tag and collection IDs safely', () => {
    expect(filterResources(resources, { query: 'unrelated' }, tags, collections)).toEqual([
      resources[2],
    ])
  })

  it('returns no resources when no query or filter matches', () => {
    expect(filterResources(resources, { query: 'does not exist' }, tags, collections)).toEqual([])
  })
})
