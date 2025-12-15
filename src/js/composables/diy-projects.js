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

      const response = await axios.post(
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
      console.error('Error fetching DIY projects:', err)
      error.value = err.message || 'Failed to load DIY projects'
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
    reset
  }
}
