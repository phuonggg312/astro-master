/**
 * Flyouts Vue composable
 * ------------------------------------------------------------------------------
 * Handle menus and other global flyouts.
 */

import Vue, { reactive, ref, watch } from 'vue'

import { insertAfter } from '@/js/utils/helpers'

const flyouts = reactive({
  menu: false,
  minicart: false,
  search: false,
  megamenuToggles: {}
})

const megamenuToggles = reactive({})

const scrollLock = {
  menu: true,
  minicart: false,
  search: false
}

export function useFlyouts () {
  const scrollPosition = ref(0)

  function toggleFlyout (item) {
    for (const flyout in flyouts) {
      flyouts[flyout] = flyout === item
        ? !flyouts[flyout]
        : false
    }
  }

  function initMegamenu (el, binding) {
    const dropdown = document.querySelector(`[parent-item="${binding.value}"]`)

    if (!binding.value.includes('__')) { // If top level menu item
      el.addEventListener('mouseover', () => {
        if (window.matchMedia('(min-width: 1024px)').matches) {
          closeAllMegamenus()
        }
      })
    }

    if (dropdown) {
      Vue.set(megamenuToggles, binding.value, false)

      insertAfter(dropdown, el)

      if (!binding.value.includes('__')) {
        el.addEventListener('mouseover', () => {
          if (window.matchMedia('(min-width: 1024px)').matches) {
            toggleMegamenu(binding.value)
          }
        })
      }

      el.addEventListener('click', (e) => {
        if (window.matchMedia('(max-width: 1023px)').matches) {
          e.preventDefault()
          toggleMegamenu(binding.value)
        }
      })
    } else {
      el.querySelector('.menu-arrow').remove()
    }
  }

  function toggleMegamenu (parent) {
    if (!parent.includes('__')) { // If top level menu item
      for (const menu in megamenuToggles) {
        if (menu !== parent) { megamenuToggles[menu] = false }
      }
    }

    megamenuToggles[parent] = !megamenuToggles[parent]
  }

  function closeAllMegamenus () {
    for (const menu in megamenuToggles) {
      megamenuToggles[menu] = false
    }
  }

  watch(flyouts, (item) => {
    closeAllMegamenus()
    if (!scrollLock[item]) return

    if (Object.values(item).find(item => item === true)) {
      scrollPosition.value = window.pageYOffset

      document.body.classList.add('no-scroll')
      document.body.style.top = `-${scrollPosition.value}px`
    } else {
      document.body.classList.remove('no-scroll')

      document.body.style.removeProperty('top')
      window.scrollTo(0, scrollPosition.value)
    }
  })

  return {
    flyouts,
    megamenuToggles,
    toggleFlyout,
    initMegamenu,
    toggleMegamenu,
    closeAllMegamenus
  }
}
