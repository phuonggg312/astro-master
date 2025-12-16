import { ref } from 'vue'
import axios from 'axios'

import { storefrontRequestConfig } from '@/js/utils/api'

function getShopUrl () {
  if (window.Shopify?.shop) {
    return `https://${window.Shopify.shop}`
  }
  const hostname = window.location.hostname
  if (hostname.includes('.myshopify.com')) {
    return `https://${hostname}`
  }
  return window.Shopify?.routes?.root ? window.location.origin : ''
}

const shopUrl = getShopUrl()
const storefrontApiUrl = shopUrl ? `${shopUrl}/api/2024-01/graphql.json` : ''

function makeGraphQLRequest (query, variables = {}) {
  return axios.post(
    storefrontApiUrl,
    { query, variables },
    {
      ...storefrontRequestConfig,
      headers: {
        ...storefrontRequestConfig.headers,
        'Content-Type': 'application/json'
      }
    }
  )
}

export function useDiyProjects () {
  const projects = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const hasNextPage = ref(false)
  const endCursor = ref(null)

  async function fetchProjects (type = 'diy_project_category', first = 20, categoryHandle = null) {
    isLoading.value = true
    error.value = null

    try {
      const query = `
        query GetDiyProjects($first: Int!, $after: String, $type: String!) {
          metaobjects(type: $type, first: $first, after: $after) {
            edges {
              node {
                id
                handle
                type
                fields {
                  key
                  value
                  type
                  reference {
                    ... on MediaImage {
                      image {
                        url
                        altText
                        width
                        height
                      }
                    }
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `

      const variables = {
        first,
        type,
        after: endCursor.value || null
      }

      if (!storefrontApiUrl) {
        throw new Error('Storefront API URL not available')
      }

      const response = await makeGraphQLRequest(query, variables)

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message)
      }

      const metaobjects = response.data.data.metaobjects.edges.map(edge => {
        const node = edge.node
        const fields = {}

        node.fields.forEach(field => {
          if (field.type === 'file_reference' && field.reference) {
            fields[field.key] = field.reference.image?.url || null
            fields[`${field.key}_alt`] = field.reference.image?.altText || ''
            fields[`${field.key}_width`] = field.reference.image?.width || null
            fields[`${field.key}_height`] = field.reference.image?.height || null
          } else {
            fields[field.key] = field.value
          }
        })

        const primaryImage = fields.image || fields.images || null
        const primaryAlt = fields.image_alt || fields.images_alt || ''

        return {
          id: node.id,
          handle: node.handle,
          type: node.type,
          title: fields.title || 'Untitled',
          description: fields.description || '',
          image: primaryImage,
          image_alt: primaryAlt,
          url: `/diy-projects/${node.handle}`,
          ...fields
        }
      })

      projects.value = [...projects.value, ...metaobjects]
      hasNextPage.value = response.data.data.metaobjects.pageInfo.hasNextPage
      endCursor.value = response.data.data.metaobjects.pageInfo.endCursor
    } catch (err) {
      error.value = err.message || 'Failed to load DIY projects'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchProjectsByCategory (categoryHandle, first = 250) {
    isLoading.value = true
    error.value = null

    try {
      const categoryQuery = `
        query GetCategory($handle: String!) {
          metaobject(handle: {handle: $handle, type: "diy_project_category"}) {
            id
            handle
            type
            fields {
              key
              value
              type
              reference {
                ... on MediaImage {
                  image {
                    url
                    altText
                    width
                    height
                  }
                }
                ... on Metaobject {
                  id
                  handle
                  type
                  fields {
                    key
                    value
                    type
                    reference {
                      ... on MediaImage {
                        image {
                          url
                          altText
                          width
                          height
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `

      const categoryResponse = await makeGraphQLRequest(categoryQuery, { handle: categoryHandle })

      if (categoryResponse.data.errors) {
        throw new Error(categoryResponse.data.errors[0].message)
      }

      let category = categoryResponse.data.data.metaobject

      if (!category) {
        const altQuery = `
          query GetAllCategories {
            metaobjects(type: "diy_project_category", first: 50) {
              edges {
                node {
                  id
                  handle
                  type
                  fields {
                    key
                    value
                    type
                    reference {
                      ... on MediaImage {
                        image {
                          url
                          altText
                        }
                      }
                      ... on Metaobject {
                        id
                        handle
                        type
                        fields {
                          key
                          value
                          type
                          reference {
                            ... on MediaImage {
                              image {
                                url
                                altText
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `

        const altResponse = await makeGraphQLRequest(altQuery)

        if (!altResponse.data.errors && altResponse.data.data.metaobjects) {
          const allCategories = altResponse.data.data.metaobjects.edges.map(edge => edge.node)
          category = allCategories.find(cat => cat.handle === categoryHandle)

          if (!category) {
            throw new Error(`Category not found for handle: ${categoryHandle}`)
          }
        } else {
          throw new Error(`Category not found for handle: ${categoryHandle}`)
        }
      }

      const categoryFields = {}
      const categoryReferences = []
      category.fields.forEach(field => {
        if (field.type === 'file_reference' && field.reference) {
          categoryFields[field.key] = field.reference.image?.url || null
        } else if ((field.type === 'list.metaobject_reference' || field.type === 'metaobject_reference') && field.reference) {
          if (Array.isArray(field.reference)) {
            categoryReferences.push(...field.reference)
          } else {
            categoryReferences.push(field.reference)
          }
        } else {
          categoryFields[field.key] = field.value
        }
      })

      const projectsQuery = `
        query GetDiyProjects($first: Int!) {
          metaobjects(type: "diy_projects", first: $first) {
            edges {
              node {
                id
                handle
                type
                fields {
                  key
                  value
                  type
                  reference {
                    ... on MediaImage {
                      image {
                        url
                        altText
                        width
                        height
                      }
                    }
                    ... on Metaobject {
                      id
                      handle
                    }
                  }
                }
              }
            }
          }
        }
      `

      const projectsResponse = await makeGraphQLRequest(projectsQuery, { first })

      if (projectsResponse.data.errors) {
        throw new Error(projectsResponse.data.errors[0].message)
      }

      if (!projectsResponse.data.data || !projectsResponse.data.data.metaobjects) {
        throw new Error('No metaobjects found in response')
      }

      const allProjects = projectsResponse.data.data.metaobjects.edges.map(edge => {
        const node = edge.node
        const fields = {}

        node.fields.forEach(field => {
          if (field.type === 'file_reference' && field.reference) {
            fields[field.key] = field.reference.image?.url || null
            fields[`${field.key}_alt`] = field.reference.image?.altText || ''
          } else if (field.type === 'metaobject_reference' && field.reference) {
            fields[field.key] = field.reference.handle || null
            fields[`${field.key}_id`] = field.reference.id || null
          } else {
            fields[field.key] = field.value
          }
        })

        const primaryImage = fields.image || fields.images || null
        const primaryAlt = fields.image_alt || fields.images_alt || ''

        return {
          id: node.id,
          handle: node.handle,
          type: node.type,
          title: fields.title || 'Untitled',
          description: fields.description || '',
          image: primaryImage,
          image_alt: primaryAlt,
          category_handle: fields.category || fields.category_handle || null,
          category_id: fields.category_id || null,
          url: `/projects-info/${node.handle}`,
          ...fields
        }
      })

      const filteredProjects = categoryReferences.length > 0
        ? allProjects.filter(project => {
          const refHandles = categoryReferences.map(ref => ref.handle).filter(Boolean)
          const refIds = categoryReferences.map(ref => ref.id).filter(Boolean)
          return refHandles.includes(project.handle) || refIds.includes(project.id)
        })
        : allProjects.filter(project =>
          project.category_handle === categoryHandle ||
          project.category_id === category.id ||
          project.category === categoryHandle
        )

      projects.value = filteredProjects

      const transformedReferences = categoryReferences.map(ref => {
        const refFields = {}
        ref.fields?.forEach(field => {
          if (field.type === 'file_reference' && field.reference) {
            refFields[field.key] = field.reference.image?.url || null
            refFields[`${field.key}_alt`] = field.reference.image?.altText || ''
          } else {
            refFields[field.key] = field.value
          }
        })

        return {
          id: ref.id,
          handle: ref.handle,
          type: ref.type,
          title: refFields.title || 'Untitled',
          image: refFields.image || refFields.images || null,
          sku: refFields.sku || refFields.product_code || null,
          url: `/projects-info/${ref.handle}`
        }
      })

      return {
        category: {
          id: category.id,
          handle: category.handle,
          title: categoryFields.title || categoryFields.display_name || 'Untitled Category',
          description: categoryFields.description || '',
          image: categoryFields.image || categoryFields.images || null,
          references: transformedReferences,
          ...categoryFields
        },
        projects: filteredProjects
      }
    } catch (err) {
      error.value = err.message || 'Failed to load DIY projects'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function reset () {
    projects.value = []
    endCursor.value = null
    hasNextPage.value = false
  }

  return {
    projects,
    isLoading,
    error,
    hasNextPage,
    fetchProjects,
    fetchProjectsByCategory,
    reset
  }
}
