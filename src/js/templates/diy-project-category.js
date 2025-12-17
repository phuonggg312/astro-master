import { ref, computed, onMounted, watch } from 'vue'
import { useDiyProjects } from '@/js/composables/diy-projects'

export default {
  props: {
    categoryHandle: {
      type: String,
      required: true
    },
    initialTitle: {
      type: String,
      default: ''
    }
  },

  setup (props) {
    const {
      projects,
      isLoading,
      error,
      fetchProjectsByCategory
    } = useDiyProjects()

    const category = ref(null)
    const itemsPerPage = ref(10)
    const sortBy = ref('newest')
    const currentPage = ref(1)

    const totalItems = computed(() => projects.value.length)

    const totalPages = computed(() => {
      return Math.ceil(totalItems.value / itemsPerPage.value)
    })

    const displayedProjects = computed(() => {
      let sorted = [...projects.value]

      if (sortBy.value === 'newest') {
        sorted = sorted.reverse()
      } else if (sortBy.value === 'title_asc') {
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      } else if (sortBy.value === 'title_desc') {
        sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
      }

      const start = (currentPage.value - 1) * itemsPerPage.value
      return sorted.slice(start, start + itemsPerPage.value)
    })

    const visiblePages = computed(() => {
      const pages = []
      const maxVisible = 5
      let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
      const end = Math.min(totalPages.value, start + maxVisible - 1)

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      return pages
    })

    async function loadCategory () {
      if (!props.categoryHandle) return

      try {
        const result = await fetchProjectsByCategory(props.categoryHandle, 250)
        category.value = result.category

        const titleEl = document.getElementById('category-title')
        if (result.category.title && titleEl) {
          titleEl.textContent = result.category.title
        }

        if (result.category.references?.length > 0) {
          displayReferences(result.category.references)
        }
      } catch (err) {
        error.value = err.message || 'Failed to load category'
      }
    }

    function displayReferences (references) {
      const container = document.getElementById('category-references')
      if (!container) return

      const grid = container.querySelector('.grid')
      if (!grid) return

      grid.innerHTML = references.map(ref => {
        const skuHtml = ref.sku ? `<div class="text-xs text-gray-600 mb-1 uppercase">${ref.sku}</div>` : ''
        const imageHtml = ref.image
          ? `<img src="${ref.image}" alt="${ref.title}" class="w-full h-auto object-cover" loading="lazy">`
          : '<div class="w-full h-48 bg-gray-200 flex items-center justify-center">No image</div>'

        return `
          <a href="${ref.url}" class="block group" title="${ref.title}">
            <div class="relative mb-4 overflow-hidden">
              ${imageHtml}
              <span class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
            </div>
            <div class="text-center">
              ${skuHtml}
              <h3 class="h5 normal-case font-normal mt-1">${ref.title}</h3>
            </div>
          </a>
        `
      }).join('')

      container.style.display = 'block'
    }

    function handleItemsPerPageChange () {
      currentPage.value = 1
      updateUrl()
    }

    function handleSortChange () {
      currentPage.value = 1
      updateUrl()
    }

    function goToPage (page) {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
        updateUrl()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    function updateUrl () {
      const params = new URLSearchParams(window.location.search)

      if (currentPage.value > 1) params.set('page', currentPage.value)
      else params.delete('page')

      if (itemsPerPage.value !== 10) params.set('limit', itemsPerPage.value)
      else params.delete('limit')

      if (sortBy.value !== 'newest') params.set('sort', sortBy.value)
      else params.delete('sort')

      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname

      window.history.replaceState({}, '', newUrl)
    }

    function initFromUrl () {
      const params = new URLSearchParams(window.location.search)
      const page = parseInt(params.get('page') || '1', 10)
      const limit = parseInt(params.get('limit') || '10', 10)
      const sort = params.get('sort') || 'newest'

      if (page >= 1) currentPage.value = page
      if ([10, 20, 40, 60, 80].includes(limit)) itemsPerPage.value = limit
      if (['newest', 'oldest', 'title_asc', 'title_desc'].includes(sort)) {
        sortBy.value = sort
      }
    }

    onMounted(async () => {
      initFromUrl()
      await loadCategory()
    })

    watch(() => props.categoryHandle, async () => {
      currentPage.value = 1
      await loadCategory()
    })

    function handleProjectClick (project) {
      const url = `/pages/diy-projects/${project.handle}`
      window.location.href = url
    }

    return {
      projects,
      isLoading,
      error,
      category,
      itemsPerPage,
      sortBy,
      currentPage,
      totalItems,
      totalPages,
      displayedProjects,
      visiblePages,
      handleItemsPerPageChange,
      handleSortChange,
      goToPage,
      handleProjectClick
    }
  }
}
