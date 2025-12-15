import { onMounted } from 'vue'
import { useDiyProjects } from '@/js/composables/diy-projects'

export default {
  setup () {
    const {
      projects,
      isLoading,
      error,
      fetchProjects,
      reset
    } = useDiyProjects()

    onMounted(async () => {
      reset()
      await fetchProjects('diy_project_category', 20)
    })

    return {
      projects,
      isLoading,
      error
    }
  }
}
