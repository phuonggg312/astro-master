import { ref, onMounted, watch, nextTick } from 'vue'
import ResponsiveImage from '@/js/components/responsive-image.vue'
import ProductItem from '@/js/components/product-item.js'
import QuantityField from '@/js/components/quantity-field.vue'
import { useCart } from '@/js/composables/cart'
import { useDiyProjects } from '@/js/composables/diy-projects'

export default {
  components: {
    ResponsiveImage,
    ProductItem,
    QuantityField
  },

  props: {
    metaobject: {
      type: Object,
      default: () => ({})
    },
    projectHandle: {
      type: String,
      default: ''
    },
    productHandle: {
      type: String,
      default: ''
    },
    categoryHandle: {
      type: String,
      default: ''
    },
    categoryTitle: {
      type: String,
      default: ''
    }
  },

  setup (props) {
    const projectTitle = ref('')
    const projectSku = ref('')
    const projectDescription = ref('')
    const projectImage = ref(null)
    const skillLevel = ref('')
    const supplies = ref([])
    const product = ref(null)
    const bundledProducts = ref([])
    const productQuantities = ref({})
    const pendingCartItems = ref({})
    const isLoading = ref(false)
    const isAddingAll = ref(false)
    const isAddingProduct = ref(false)
    const error = ref(null)
    const categoryHandle = ref(props.categoryHandle || '')
    const categoryTitle = ref(props.categoryTitle || '')

    const {
      cart,
      isAddingToCart,
      addToCart,
      fetchCart
    } = useCart()

    const {
      fetchProjectByHandle
    } = useDiyProjects()

    function getProjectHandle () {
      return props.projectHandle ||
        props.metaobject?.handle ||
        window.location.pathname.match(/\/(?:pages\/diy-projects|metaobjects\/diy_projects)\/([^/?]+)/)?.[1] ||
        null
    }

    function getStorageKey () {
      const projectHandle = getProjectHandle()
      return projectHandle ? `diy_project_quantities_${projectHandle}` : 'diy_project_quantities'
    }

    async function syncPendingCartItemsWithActualCart () {
      if (!cart.value || !cart.value.items || !bundledProducts.value || bundledProducts.value.length === 0) {
        return
      }

      const updatedPendingCartItems = { ...pendingCartItems.value }

      bundledProducts.value.forEach(product => {
        const matchingCartItems = cart.value.items.filter(item => {
          let itemVariantId = item.id?.toString()

          if (!itemVariantId && item.url) {
            const variantMatch = item.url.match(/[?&]variant=(\d+)/)
            if (variantMatch) {
              itemVariantId = variantMatch[1]
            }
          }

          let itemVariantIdGid = null
          if (itemVariantId && !itemVariantId.startsWith('gid://')) {
            itemVariantIdGid = `gid://shopify/ProductVariant/${itemVariantId}`
          } else {
            itemVariantIdGid = itemVariantId
          }

          const productVariantId = product.variantId?.toString() || product.id?.toString()

          const matchByVariantId = itemVariantIdGid === productVariantId || itemVariantId === productVariantId

          let matchByUrl = false
          if (item.url) {
            const urlVariantMatch = item.url.match(/[?&]variant=(\d+)/)
            if (urlVariantMatch) {
              const urlVariantId = `gid://shopify/ProductVariant/${urlVariantMatch[1]}`
              if (urlVariantId === productVariantId) {
                matchByUrl = true
              }
            }

            if (product.handle && item.url.includes(`/products/${product.handle}`)) {
              matchByUrl = true
            }
          }

          return matchByVariantId || matchByUrl
        })

        if (matchingCartItems.length > 0) {
          const totalCartQuantity = matchingCartItems.reduce((sum, item) => {
            return sum + (item.quantity || 0)
          }, 0)

          updatedPendingCartItems[product.id] = totalCartQuantity
        } else {
          updatedPendingCartItems[product.id] = 0
        }
      })

      pendingCartItems.value = updatedPendingCartItems
      saveQuantitiesToStorage()
    }

    function loadQuantitiesFromStorage () {
      try {
        const storageKey = getStorageKey()
        const saved = localStorage.getItem(storageKey)

        if (saved) {
          const parsed = JSON.parse(saved)

          if (bundledProducts.value && bundledProducts.value.length > 0) {
            bundledProducts.value.forEach(product => {
              if (parsed[product.id] && parsed[product.id] > 0) {
                productQuantities.value[product.id] = parsed[product.id]
              } else if (product.handle && parsed[product.handle] && parsed[product.handle] > 0) {
                productQuantities.value[product.id] = parsed[product.handle]
              }

              const pendingQtyKey = `pending_${product.id}`
              if (parsed[pendingQtyKey] && parsed[pendingQtyKey] > 0) {
                pendingCartItems.value[product.id] = parsed[pendingQtyKey]
              }
            })
          } else {
            Object.keys(parsed).forEach(key => {
              const savedQty = parsed[key]
              if (savedQty && savedQty > 0) {
                if (key.startsWith('pending_')) {
                  pendingCartItems.value[key.replace('pending_', '')] = savedQty
                } else {
                  productQuantities.value[key] = savedQty
                }
              }
            })
          }
        }
      } catch (e) {
      }
    }

    function saveQuantitiesToStorage () {
      try {
        const storageKey = getStorageKey()
        const toSave = {}
        if (bundledProducts.value && bundledProducts.value.length > 0) {
          bundledProducts.value.forEach(product => {
            const qty = productQuantities.value[product.id]
            if (qty && qty > 0) {
              toSave[product.id] = qty
              if (product.handle) {
                toSave[product.handle] = qty
              }
            }

            const pendingQty = pendingCartItems.value[product.id]
            if (pendingQty && pendingQty > 0) {
              toSave[`pending_${product.id}`] = pendingQty
            }
          })
        } else {
          Object.keys(productQuantities.value).forEach(key => {
            const qty = productQuantities.value[key]
            if (qty && qty > 0) {
              toSave[key] = qty
            }
          })
          Object.keys(pendingCartItems.value).forEach(key => {
            const qty = pendingCartItems.value[key]
            if (qty && qty > 0) {
              toSave[`pending_${key}`] = qty
            }
          })
        }
        localStorage.setItem(storageKey, JSON.stringify(toSave))
      } catch (e) {
      }
    }

    async function loadProject () {
      const handle = getProjectHandle()

      if (!handle) {
        extractFieldsFromMetaobject()
        return
      }

      isLoading.value = true
      error.value = null

      try {
        const project = await fetchProjectByHandle(handle)

        projectTitle.value = project.title || 'Untitled'
        projectSku.value = project.sku || ''
        projectDescription.value = project.description || project.Description || ''
        projectImage.value = project.image || null
        skillLevel.value = project.skill_level || ''

        if (project.category_handle) categoryHandle.value = project.category_handle
        if (project.category_title) categoryTitle.value = project.category_title

        if (project.product_handle) {
          productHandle.value = project.product_handle
          await loadProduct()
        }
      } catch (err) {
        error.value = err.message || 'Failed to load project'
        extractFieldsFromMetaobject()
      } finally {
        isLoading.value = false
      }
    }

    const productHandle = ref(props.productHandle || '')

    function extractFieldsFromMetaobject () {
      if (!props.metaobject || !props.metaobject.fields) return

      props.metaobject.fields.forEach(field => {
        const key = field.key?.toLowerCase()
        switch (key) {
          case 'title':
            projectTitle.value = field.value || ''
            break
          case 'sku':
            projectSku.value = field.value || ''
            break
          case 'description':
            projectDescription.value = field.value || ''
            break
          case 'image':
            if (field.reference && field.reference.image) {
              projectImage.value = field.reference.image.url || null
            }
            break
          case 'skill_level':
          case 'skill level':
            skillLevel.value = field.value || ''
            break
          case 'product_handle':
            if (field.reference && field.reference.handle) {
              productHandle.value = field.reference.handle
            } else if (field.value) {
              productHandle.value = field.value
            }
            break
          case 'category':
            if (field.reference) {
              categoryHandle.value = field.reference.handle || ''
              if (field.reference.fields) {
                field.reference.fields.forEach(catField => {
                  const catKey = catField.key?.toLowerCase()
                  if (catKey === 'title') {
                    categoryTitle.value = catField.value || ''
                  }
                })
              }
            }
            break
        }
      })

      if (!projectTitle.value && props.metaobject.display_name) {
        projectTitle.value = props.metaobject.display_name
      }

      if (categoryHandle.value && categoryTitle.value) {
        nextTick(() => {
          updateBreadcrumb()
        })
      }

      if (productHandle.value) {
        loadProduct()
      }
    }

    function updateBreadcrumb () {
      if (!categoryHandle.value || !categoryTitle.value) return

      const breadcrumbList = document.querySelector('.breadcrumb-wrapper .breadcrumb')
      if (!breadcrumbList) return

      if (breadcrumbList.querySelector('li a[href*="diy-project-category"]')) return

      const diyProjectsItem = breadcrumbList.querySelector('li a[href="/pages/diy-projects"]')
      if (!diyProjectsItem) return

      const diyProjectsListItem = diyProjectsItem.closest('li')
      if (!diyProjectsListItem) {
        return
      }

      const categoryItem = document.createElement('li')
      categoryItem.className = 'breadcrumb__item'
      categoryItem.setAttribute('itemprop', 'itemListElement')
      categoryItem.setAttribute('itemscope', '')
      categoryItem.setAttribute('itemtype', 'http://schema.org/ListItem')

      const categoryLink = document.createElement('a')
      categoryLink.href = `/pages/diy-project-category/${categoryHandle.value}`
      categoryLink.title = categoryTitle.value
      categoryLink.setAttribute('data-category-handle', categoryHandle.value)
      categoryLink.setAttribute('itemprop', 'item')
      categoryLink.setAttribute('itemscope', '')
      categoryLink.setAttribute('itemtype', 'http://schema.org/Thing')
      categoryLink.setAttribute('itemid', `/pages/diy-project-category/${categoryHandle.value}`)

      const categoryName = document.createElement('span')
      categoryName.setAttribute('itemprop', 'name')
      categoryName.textContent = categoryTitle.value.toUpperCase()
      categoryLink.appendChild(categoryName)

      const categoryPosition = document.createElement('meta')
      categoryPosition.setAttribute('itemprop', 'position')
      categoryPosition.setAttribute('content', '3')

      categoryItem.appendChild(categoryLink)
      categoryItem.appendChild(categoryPosition)

      diyProjectsListItem.insertAdjacentElement('afterend', categoryItem)

      const projectItem = breadcrumbList.querySelector('.breadcrumb__item--active')
      const positionMeta = projectItem?.querySelector('meta[itemprop="position"]')
      if (positionMeta) {
        positionMeta.setAttribute('content', '4')
      }
    }

    function scrollToSupplies () {
      const suppliesSection = document.getElementById('supplies')
      if (suppliesSection) {
        suppliesSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    function printProject () {
      window.print()
    }

    async function loadProduct () {
      let handle = productHandle.value || props.productHandle

      if (!handle) {
        return
      }

      handle = handle.toLowerCase()

      const query = `
        query GetBundleComponents($handle: String!) {
          product(handle: $handle) {
            id
            title
            handle
            featuredImage {
              url
              altText
            }
            variants(first: 1) {
              nodes {
                id
                price {
                  amount
                  currencyCode
                }
                components(first: 20) {
                  edges {
                    node {
                      quantity
                      productVariant {
                        id
                        title
                        sku
                        availableForSale
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          title
                          handle
                          featuredImage {
                            url
                            altText
                          }
                          images(first: 5) {
                            edges {
                              node {
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
        }
      `

      try {
        const shopDomain = window.Shopify?.shop
        if (!shopDomain) {
          return
        }

        let token = window.Shopify?.storefrontAccessToken
        if (!token) {
          try {
            const { storefrontRequestConfig } = await import('@/js/utils/api')
            token = storefrontRequestConfig?.headers?.['X-Shopify-Storefront-Access-Token']
          } catch (e) {
            return
          }
        }

        const graphqlUrl = `https://${shopDomain}/api/2024-01/graphql.json`

        const response = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': token
          },
          body: JSON.stringify({
            query,
            variables: { handle }
          })
        })

        if (!response.ok) {
          return
        }

        const result = await response.json()

        if (result.errors) {
          return
        }

        const productData = result.data?.product
        if (!productData) {
          return
        }

        if (productData.featuredImage) {
          product.value = {
            id: productData.id,
            title: productData.title,
            handle: productData.handle,
            featured_media: {
              src: productData.featuredImage.url,
              alt: productData.featuredImage.altText || productData.title,
              aspect_ratio: 1
            }
          }
        } else {
          product.value = {
            id: productData.id,
            title: productData.title,
            handle: productData.handle
          }
        }

        const variant = productData.variants?.nodes?.[0]

        if (!variant) {
          return
        }

        const componentsEdge = variant.components?.edges || []

        if (componentsEdge.length > 0) {
          const bundledProductsList = componentsEdge.map(edge => {
            const comp = edge.node
            const item = comp.productVariant

            if (!item || !item.product) {
              return null
            }

            const priceInCents = parseFloat(item.price.amount) * 100
            const variantTitle = item.title === 'Default Title' ? 'Default Title' : item.title

            const variant = {
              id: item.id,
              title: variantTitle,
              sku: item.sku || null,
              price: priceInCents,
              compare_at_price: null,
              available: item.availableForSale,
              option1: variantTitle !== 'Default Title' ? variantTitle : null,
              option2: null,
              option3: null,
              options: variantTitle !== 'Default Title' ? [variantTitle] : []
            }

            const productImages = []
            if (item.product.images && item.product.images.edges && item.product.images.edges.length > 0) {
              item.product.images.edges.forEach(edge => {
                productImages.push({
                  src: edge.node.url,
                  alt: edge.node.altText || item.product.title,
                  aspect_ratio: 1
                })
              })
            } else if (item.product.featuredImage) {
              productImages.push({
                src: item.product.featuredImage.url,
                alt: item.product.featuredImage.altText || item.product.title,
                aspect_ratio: 1
              })
            }

            return {
              id: item.product.id || item.id,
              variantId: item.id,
              title: item.product.title,
              handle: item.product.handle,
              price: priceInCents,
              compare_at_price: null,
              variants: [variant],
              options: variantTitle !== 'Default Title'
                ? ['Title']
                : [],
              media: productImages,
              images: productImages.map(img => img.src),
              featured_media: productImages[0] || null,
              bundle_quantity: comp.quantity,
              available: item.availableForSale
            }
          }).filter(p => p !== null)

          bundledProducts.value = bundledProductsList

          bundledProductsList.forEach(product => {
            productQuantities.value[product.id] = product.bundle_quantity || 1
            pendingCartItems.value[product.id] = 0
          })

          loadQuantitiesFromStorage()
        } else {
          bundledProducts.value = []
        }
      } catch (error) {
      }
    }

    async function addProductToCart () {
      if (!props.productHandle && !product.value) return
      if (isAddingProduct.value || isAddingToCart.value) return

      isAddingProduct.value = true

      try {
        const handle = props.productHandle || product.value?.handle
        if (!handle) {
          isAddingProduct.value = false
          return
        }

        const response = await fetch(`/products/${handle}.js`)
        if (!response.ok) {
          isAddingProduct.value = false
          return
        }

        const productData = await response.json()
        if (!productData.variants || productData.variants.length === 0) {
          isAddingProduct.value = false
          return
        }

        const variantId = productData.variants[0].id
        await addToCart(variantId, 1)
      } catch (error) {
        isAddingProduct.value = false
      } finally {
        isAddingProduct.value = false
      }
    }

    function updateProductQuantity (productId, quantity) {
      const qty = parseInt(quantity) || 1
      if (qty < 1) {
        productQuantities.value[productId] = 1
      } else {
        productQuantities.value[productId] = qty
      }
      saveQuantitiesToStorage()
    }

    async function addProductToPendingCart (productId, quantity) {
      const bundledProduct = bundledProducts.value.find(p => p.id === productId)
      if (!bundledProduct) {
        return
      }

      const currentQty = productQuantities.value[productId] || parseInt(quantity) || 1

      let variantId = bundledProduct.variantId
      if (!variantId && bundledProduct.variants && bundledProduct.variants.length > 0) {
        variantId = bundledProduct.variants[0].id
      }

      if (!variantId) {
        return
      }

      let numericVariantId = variantId
      if (typeof variantId === 'string' && variantId.startsWith('gid://')) {
        const match = variantId.match(/\/(\d+)$/)
        if (match) {
          numericVariantId = match[1]
        } else {
          return
        }
      }

      const updatedPendingCartItems = { ...pendingCartItems.value }
      if (!updatedPendingCartItems[productId]) {
        updatedPendingCartItems[productId] = 0
      }
      updatedPendingCartItems[productId] += currentQty
      pendingCartItems.value = updatedPendingCartItems

      const result = await addToCart(numericVariantId, currentQty)

      if (result && result.success) {
        fetchCart().then(() => {
          nextTick().then(() => {
            syncPendingCartItemsWithActualCart()
          })
        })

        saveQuantitiesToStorage()
      } else {
        updatedPendingCartItems[productId] -= currentQty
        pendingCartItems.value = updatedPendingCartItems
      }
    }

    async function addAllBundledProductsToCart () {
      if (!bundledProducts.value || bundledProducts.value.length === 0) return
      if (isAddingAll.value) return

      isAddingAll.value = true

      try {
        const selectedProducts = bundledProducts.value.filter(bundledProduct => {
          const selectedQty = productQuantities.value[bundledProduct.id]
          return selectedQty && selectedQty > 0
        })

        if (selectedProducts.length === 0) {
          isAddingAll.value = false
          return
        }

        const results = []
        for (let i = 0; i < selectedProducts.length; i++) {
          const bundledProduct = selectedProducts[i]
          const selectedQty = productQuantities.value[bundledProduct.id]

          let variantId = bundledProduct.variantId

          if (!variantId && bundledProduct.variants && bundledProduct.variants.length > 0) {
            variantId = bundledProduct.variants[0].id
          }

          if (!variantId) {
            try {
              const response = await fetch(`/products/${bundledProduct.handle}.js`)
              if (response.ok) {
                const productData = await response.json()
                if (productData.variants && productData.variants.length > 0) {
                  variantId = productData.variants[0].id
                }
              }
            } catch (e) {
            }
          }

          if (!variantId) {
            results.push({
              success: false,
              reason: 'no_variant_id',
              product: bundledProduct.handle,
              title: bundledProduct.title
            })
            continue
          }

          let numericVariantId = variantId
          if (typeof variantId === 'string' && variantId.startsWith('gid://')) {
            const match = variantId.match(/\/(\d+)$/)
            if (match) {
              numericVariantId = match[1]
            } else {
              results.push({
                success: false,
                reason: 'invalid_variant_id_format',
                product: bundledProduct.handle,
                title: bundledProduct.title
              })
              continue
            }
          }

          const result = await addToCart(numericVariantId, selectedQty)
          results.push({
            ...result,
            product: bundledProduct.title,
            quantity: selectedQty
          })

          if (i < selectedProducts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
        const successResults = results.filter(r => r && r.success)

        if (successResults.length > 0) {
          const updatedPendingCartItems = { ...pendingCartItems.value }
          successResults.forEach(result => {
            const product = selectedProducts.find(p => p.title === result.product)
            if (product && result.success) {
              if (!updatedPendingCartItems[product.id]) {
                updatedPendingCartItems[product.id] = 0
              }
              updatedPendingCartItems[product.id] += result.quantity
            }
          })
          pendingCartItems.value = updatedPendingCartItems
          saveQuantitiesToStorage()

          fetchCart().then(() => {
            nextTick().then(() => {
              syncPendingCartItemsWithActualCart()
            })
          })
        }
      } catch (error) {
      } finally {
        isAddingAll.value = false
      }
    }

    watch([categoryHandle, categoryTitle], () => {
      if (categoryHandle.value && categoryTitle.value) {
        nextTick(() => {
          setTimeout(updateBreadcrumb, 100)
        })
      }
    })

    onMounted(async () => {
      await fetchCart()

      await loadProject()

      await nextTick()
      setTimeout(() => {
        updateBreadcrumb()
      }, 300)

      if (productHandle.value || props.productHandle) {
        await loadProduct()
        await nextTick()
        loadQuantitiesFromStorage()
        await nextTick()
        syncPendingCartItemsWithActualCart()
      } else if (props.metaobject && props.metaobject.product_handle) {
        productHandle.value = props.metaobject.product_handle
        await loadProduct()
        await nextTick()
        loadQuantitiesFromStorage()
        await nextTick()
        syncPendingCartItemsWithActualCart()
      }
    })

    return {
      projectTitle,
      projectSku,
      projectDescription,
      projectImage,
      skillLevel,
      supplies,
      product,
      bundledProducts,
      productQuantities,
      pendingCartItems,
      productHandle,
      isLoading,
      error,
      categoryHandle,
      categoryTitle,
      isAddingToCart,
      isAddingProduct,
      isAddingAll,
      scrollToSupplies,
      printProject,
      addProductToCart,
      addAllBundledProductsToCart,
      addProductToPendingCart,
      updateProductQuantity,
      updateBreadcrumb
    }
  }
}
