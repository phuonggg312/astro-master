import '@/scss/theme.scss'

import Vue from 'vue'

// Filters
import '@/js/filters/currency'
import '@/js/filters/currencyFromCents'
import '@/js/filters/imageSize'

// Global components
import VueHeader from '@/js/components/vue-header.js'
import KeenSlider from '@/js/components/keen-slider.vue'
import ProductItem from '@/js/components/product-item.js'
import ResponsiveImage from '@/js/components/responsive-image.vue'
import ButtonSpinner from '@/js/components/button-spinner.vue'
import QuantityField from '@/js/components/quantity-field.vue'
import VideoWrapper from '@/js/components/video-wrapper.vue'
import ReadMore from '@/js/components/read-more.vue'

// Template specific components
import ProductListAndFiltering from '@/js/templates/product-list-and-filtering.js'
import ProductDetail from '@/js/templates/product-detail'
import ProductRelated from '@/js/templates/product-related.js'
import CustomerAddresses from '@/js/templates/customer-addresses.js'
import CustomerLogin from '@/js/templates/customer-login.js'
import Cart from '@/js/templates/cart.js'
import DiyProjectsListing from '@/js/templates/diy-projects.js'
import DiyProjectCategoryListing from '@/js/templates/diy-project-category.js'
import DiyProjectDetail from '@/js/templates/diy-project-detail.js'

Vue.component('ResponsiveImage', ResponsiveImage)
Vue.component('ButtonSpinner', ButtonSpinner)
Vue.component('QuantityField', QuantityField)
Vue.component('ReadMore', ReadMore)

const initVueInstance = element => {
  return new Vue({
    el: element,

    delimiters: ['${', '}'],

    components: {
      VueHeader,
      KeenSlider,
      ProductItem,
      VideoWrapper,

      ProductListAndFiltering,
      ProductDetail,
      ProductRelated,
      CustomerAddresses,
      CustomerLogin,
      Cart,
      DiyProjectsListing,
      DiyProjectCategoryListing,
      DiyProjectDetail
    }
  })
}

const initVue = () => document.querySelectorAll('[vue-init]').forEach(element => {
  initVueInstance(element)
})

initVue()

// Fix for theme editor preview
document.addEventListener('shopify:section:load', (event) => {
  // Vue HTML tags disappear so it can't reinitialise, causing the header to break
  if (event.target.id.includes('megamenu')) return
  initVue()
})
