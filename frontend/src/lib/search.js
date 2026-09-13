export function filterResources(
  resources,
  {
    query = '',
    resourceType = 'all',
    starredOnly = false,
    collectionId = 'all',
    tagId = 'all',
  } = {},
  tags = [],
  collections = [],
) {
  const trimmed = query.trim().toLowerCase()
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name || '']))
  const collectionNames = new Map(
    collections.map((collection) => [collection.id, collection.name || '']),
  )

  return resources.filter((resource) => {
    const linkedTagNames = (resource.tagIds || [])
      .map((id) => tagNames.get(id))
      .filter(Boolean)
    const linkedCollectionNames = (resource.collectionIds || [])
      .map((id) => collectionNames.get(id))
      .filter(Boolean)
    const searchableText = [
      resource.title,
      resource.description,
      resource.personalNotes,
      resource.url,
      resource.sourceDomain,
      resource.file?.originalFilename,
      ...linkedTagNames,
      ...linkedCollectionNames,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const matchesQuery = !trimmed || searchableText.includes(trimmed)
    const matchesType =
      resourceType === 'all' || (resource.resourceType || 'other') === resourceType
    const matchesStarred = !starredOnly || resource.isStarred
    const matchesCollection =
      collectionId === 'all' || (resource.collectionIds || []).includes(collectionId)
    const matchesTag = tagId === 'all' || (resource.tagIds || []).includes(tagId)

    return matchesQuery && matchesType && matchesStarred && matchesCollection && matchesTag
  })
}
