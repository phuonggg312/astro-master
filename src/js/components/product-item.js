/**
 * Product Item Vue Component
 * ------------------------------------------------------------------------------
 * Main template in snippets/product-item.liquid
 */

import { useProduct } from '@/js/composables/product'
import { useCart } from '@/js/composables/cart'
import { useFlyouts } from '@/js/composables/flyouts'
import QuantityField from '@/js/components/quantity-field.vue'

export default {
  components: {
    QuantityField
  },

  props: {
    product: {
      type: Object,
      required: true
    },

    // Liquid only data e.g. filtered variant media
    featuredMedia: {
      type: Object
    },

    // Liquid only data e.g. filtered variant and search analytics queries
    url: {
      type: String
    },

    isLazyLoad: {
      type: Boolean,
      default: true
    },

    customQuantity: {
      type: Number,
      default: null
    },

    onAddToCart: {
      type: Function,
      default: null
    },

    showQuantitySelector: {
      type: Boolean,
      default: false
    },

    quantityValue: {
      type: Number,
      default: null
    },

    onQuantityUpdate: {
      type: Function,
      default: null
    },

    showStockStatus: {
      type: Boolean,
      default: false
    },

    /**
     * Passed to the responsive image component.
     * Learn how sizes work - https://www.dofactory.com/html/img/sizes
     *
     * Example:
     * img-sizes="(max-width: 767px) 50vw, (max-width: 1440px) 20vw, calc(1440px / 5)"
     * - Container width is 1440px
     * - On desktop, product image is 1/5 or 20% wide within a container
     * - On mobile, there are 2 product images per row
     */
    imgSizes: {
      type: String,
      default: 'auto'
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
      media: null,
      currentImageIndex: 0,
      isHovered: false
    }
  },

  computed: {
    productUrl () {
      return `${this.baseUrl}${this.product.handle}`
    },
    productImages () {
      const images = []

      if (this.product.media && this.product.media.length > 0) {
        this.product.media.forEach(media => {
          if (media.media_type === 'image' || !media.media_type) {
            images.push({
              src: media.src || media.url,
              alt: media.alt || this.product.title,
              aspect_ratio: media.aspect_ratio || 1
            })
          }
        })
      }

      if (images.length === 0 && this.product.images && this.product.images.length > 0) {
        this.product.images.forEach(img => {
          images.push({
            src: typeof img === 'string' ? img : (img.url || img.src),
            alt: img.alt || this.product.title,
            aspect_ratio: img.aspect_ratio || 1
          })
        })
      }

      if (images.length === 0 && this.featuredMedia) {
        images.push({
          src: this.featuredMedia.src || this.featuredMedia.url,
          alt: this.featuredMedia.alt || this.product.title,
          aspect_ratio: this.featuredMedia.aspect_ratio || 1
        })
      }

      return images
    },
    finalQuantity () {
      return this.customQuantity !== null ? this.customQuantity : this.quantity
    },
    productSku () {
      if (this.currentVariant && this.currentVariant.sku) {
        return this.currentVariant.sku
      }
      if (this.product.variants && this.product.variants.length > 0 && this.product.variants[0].sku) {
        return this.product.variants[0].sku
      }
      return null
    }
  },

  created () {
    if (this.product.variants.length === 1) {
      this.currentVariant = this.product.variants[0]
    }

    this.media = this.featuredMedia || this.product.media?.[0] || this.productImages[0]
  },

  methods: {
    async handleAddToCart () {
      if (this.isAddingToCart) return

      if (this.onAddToCart) {
        this.onAddToCart(this.product.id, this.finalQuantity)
      } else {
        const { success } = await this.addToCart(this.currentVariant.id, this.finalQuantity)
        if (success) this.toggleFlyout('minicart')
      }
    },
    handleMouseEnter () {
      this.isHovered = true
      if (this.productImages.length > 1 && this.currentImageIndex === 0) {
        this.currentImageIndex = 1
      }
    },
    handleMouseLeave () {
      this.isHovered = false
      this.currentImageIndex = 0
    },
    handleDotHover (index) {
      this.currentImageIndex = index
    },
    handleDotLeave () {
      if (!this.isHovered) {
        this.currentImageIndex = 0
      }
    }
  }
}
