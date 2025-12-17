import { ref, onMounted, watch, nextTick } from 'vue'
import ResponsiveImage from '@/js/components/responsive-image.vue'
import ProductItem from '@/js/components/product-item.js'
import { useCart } from '@/js/composables/cart'
import { useFlyouts } from '@/js/composables/flyouts'
import { useDiyProjects } from '@/js/composables/diy-projects'

export default {
  components: {
    ResponsiveImage,
    ProductItem
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
    const isLoading = ref(false)
    const error = ref(null)
    const categoryHandle = ref(props.categoryHandle || '')
    const categoryTitle = ref(props.categoryTitle || '')

    const {
      isAddingToCart,
      addToCart
    } = useCart()

    const {
      toggleFlyout
    } = useFlyouts()

    const {
      fetchProjectByHandle
    } = useDiyProjects()

    function getProjectHandle () {
      return props.projectHandle ||
        props.metaobject?.handle ||
        window.location.pathname.match(/\/(?:pages\/diy-projects|metaobjects\/diy_projects)\/([^/?]+)/)?.[1] ||
        null
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
          console.log('Product handle extracted from GraphQL:', project.product_handle)
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
        console.log('Product handle found in extractFieldsFromMetaobject:', productHandle.value)
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
      const handle = productHandle.value || props.productHandle
      console.log('loadProduct called with handle:', handle, 'from props:', props.productHandle, 'from ref:', productHandle.value)

      if (!handle) {
        console.log('No product handle provided')
        return
      }

      try {
        const url = `/products/${handle}.js`
        console.log('Fetching product from:', url)
        const response = await fetch(url)

        if (!response.ok) {
          console.error('Failed to load product:', response.status, response.statusText)
          return
        }

        const productData = await response.json()
        console.log('Product data received:', productData)

        if (productData.featured_image) {
          productData.featured_media = {
            src: productData.featured_image,
            alt: productData.title || '',
            aspect_ratio: 1
          }
        } else if (productData.images && productData.images.length > 0) {
          productData.featured_media = {
            src: productData.images[0],
            alt: productData.title || '',
            aspect_ratio: 1
          }
        }

        product.value = productData
        console.log('Product set to reactive ref:', product.value)
      } catch (error) {
        console.error('Error loading product:', error)
      }
    }

    async function addProductToCart () {
      if (!props.productHandle) return

      try {
        const response = await fetch(`/products/${props.productHandle}.js`)
        if (!response.ok) return

        const productData = await response.json()
        if (!productData.variants || productData.variants.length === 0) return

        const variantId = productData.variants[0].id
        const result = await addToCart(variantId, 1)

        if (result && result.success) {
          toggleFlyout('minicart')
        }
      } catch (error) {
        console.error('Error adding product to cart:', error)
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
      await loadProject()

      await nextTick()
      setTimeout(() => {
        updateBreadcrumb()
      }, 300)

      console.log('DIY Project Detail - Props:', {
        productHandle: props.productHandle,
        productHandleRef: productHandle.value,
        metaobject: props.metaobject
      })

      if (productHandle.value || props.productHandle) {
        console.log('Loading product with handle:', productHandle.value || props.productHandle)
        await loadProduct()
      } else {
        console.log('No productHandle found, checking metaobject directly...')
        if (props.metaobject && props.metaobject.product_handle) {
          productHandle.value = props.metaobject.product_handle
          console.log('Product handle found in metaobject:', productHandle.value)
          await loadProduct()
        } else {
          console.log('No productHandle found anywhere')
        }
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
      productHandle,
      isLoading,
      error,
      categoryHandle,
      categoryTitle,
      isAddingToCart,
      scrollToSupplies,
      printProject,
      addProductToCart,
      updateBreadcrumb
    }
  }
}
