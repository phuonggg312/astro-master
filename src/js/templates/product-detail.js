/**
 * Product Detail Vue Component
 * ------------------------------------------------------------------------------
 * Main template in sections/product__main.liquid
 */

import KeenSlider from 'keen-slider'

import ImageZoom from '@/js/components/image-zoom.vue'
import ReadMore from '@/js/components/read-more.vue'
import VueAccordion from '@/js/components/vue-accordion.vue'
import VueCollapsible from '@/js/components/vue-collapsible.vue'
import VideoWrapper from '@/js/components/video-wrapper.vue'

import { useProduct } from '@/js/composables/product'
import { useCart } from '@/js/composables/cart'
import { useFlyouts } from '@/js/composables/flyouts'
import { removeParameterFromUrl, getUrlWithVariant } from '@/js/utils/helpers'

// https://codesandbox.io/s/github/rcbyr/keen-slider-sandboxes/tree/v6/navigation-controls/thumbnails/vue?file=/src/Slider.vue:2056-2175
function ThumbnailPlugin (main) {
  return (slider) => {
    function removeActive () {
      slider.slides.forEach((slide) => {
        slide.classList.remove('keen-slider__slide--active')
      })
    }

    function addActive (idx) {
      slider.slides[idx].classList.add('keen-slider__slide--active')
    }

    function addClickEvents () {
      slider.slides.forEach((slide, idx) => {
        slide.addEventListener('click', () => {
          main.moveToIdx(idx)
        })
      })
    }

    slider.on('created', () => {
      addActive(slider.track.details.rel)
      addClickEvents()
      main.on('animationStarted', (main) => {
        removeActive()
        const next = main.animator.targetIdx || 0
        addActive(main.track.absToRel(next))
        slider?.moveToIdx(Math.min(slider.track.details.maxIdx, next))
      })
    })
  }
}

export default {
  components: {
    KeenSlider,
    ImageZoom,
    ReadMore,
    VueAccordion,
    VueCollapsible,
    VideoWrapper
  },

  props: {
    product: {
      type: Object,
      required: true
    }
  },

  setup (props) {
    const {
      currentVariant,
      quantity,
      productOptions,
      selectedOptions,
      baseUrl,
      isSale,
      updateVariant
    } = useProduct(props.product)

    const {
      isLoading: isCartLoading,
      isAddingToCart,
      error: cartError,
      addToCart
    } = useCart()

    const {
      toggleFlyout
    } = useFlyouts()

    return {
      currentVariant,
      quantity,
      productOptions,
      selectedOptions,
      baseUrl,
      isSale,
      updateVariant,

      isCartLoading,
      isAddingToCart,
      cartError,
      addToCart,

      toggleFlyout
    }
  },

  data () {
    return {
      currentSlide: 0,
      slider: null,
      nav: null
    }
  },

  mounted () {
    // if the URL has variant query string, select that variant
    const queryStringValues = new URLSearchParams(window.location.search)
    if (queryStringValues.has('variant')) {
      this.currentVariant = this.product.variants.find(variant => `${variant.id}` === queryStringValues.get('variant'))
    } else if (this.product.variants.length === 1) {
      this.currentVariant = this.product.variants[0]
    }

    this.$nextTick(() => {
      this.slider = new KeenSlider(this.$refs.main, {}, [
        slider => {
          slider.on('slideChanged', () => {
            this.currentSlide = slider.track.details.rel
          })
        }
      ])

      this.nav = new KeenSlider(this.$refs.nav, {
        slides: {
          perView: 'auto',
          spacing: 8
        }
      }, [ThumbnailPlugin(this.slider)])
    })
  },

  watch: {
    currentVariant (value) {
      if (!value) {
        removeParameterFromUrl('variant')
        return
      }

      if (value.featured_image && this.product.images.length > 1) {
        this.slider?.moveToIdx(value.featured_image.position - 1)
      }

      const url = getUrlWithVariant(window.location.href, value.id)
      window.history.replaceState({ path: url }, '', url)
    }
  },

  methods: {
    async handleAddToCart () {
      const { success } = await this.addToCart(this.currentVariant.id, this.quantity)
      if (success) this.toggleFlyout('minicart')
    }
  }
}
