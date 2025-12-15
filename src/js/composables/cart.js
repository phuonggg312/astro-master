import Vue, { ref, onMounted } from 'vue'
import axios from 'axios'

import { xhrRequestConfig } from '@/js/utils/api'

const cart = ref(null)
const isLoading = ref(false)

export function useCart () {
  const isAddingToCart = ref(false)
  const error = ref(null)

  onMounted(() => {
    if (!cart.value && !isLoading.value) fetchCart()
  })

  function publicProperties (item) {
    if (!item.properties) return {}
    return Object.fromEntries(Object.entries(item.properties).filter(([key]) => key.substring(0, 1) !== '_'))
  }

  function addToCart (variantId, quantity = 1, properties) {
    error.value = null
    if (!variantId) {
      error.value = 'No variant selected.'
      return
    }

    isAddingToCart.value = true

    const data = {
      quantity,
      id: variantId
    }

    if (properties) {
      data.properties = properties
    }

    return axios.post(`${window.Shopify.routes.root}cart/add.js`, data, xhrRequestConfig).then(async () => {
      await fetchCart()
      return { success: true }
    }).catch(({ response, request, message }) => {
      if (response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        // console.log('1', response)
        // const { data, status, headers } = response
        const { data } = response
        error.value = data.description
      } else if (request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest
        console.log('request error', request)
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('unknown error', message)
      }
      return { success: false }
    }).finally(() => {
      isAddingToCart.value = false
    })
  }

  function updateItem (item, quantity, properties) {
    error.value = null
    isLoading.value = true
    item.isLoading = true
    Vue.set(this.cart.items, this.cart.items.indexOf(item), item)

    const data = {
      id: item.key,
      quantity
    }

    if (properties) {
      data.properties = properties
    }

    // Avoid the cart/update.js request as it does not valide the quantity of variants
    // already in the cart - https://mindarc.gyazo.com/cdd2a46a2787924e3565e1523a4db08c
    axios.post(`${window.Shopify.routes.root}cart/change.js`, data, xhrRequestConfig)
      .then(async () => {
        await fetchCart()
      }).catch(async ({ response, request, message }) => {
        if (response) {
          // Fetch cart to set the item's latest available maximum quantity
          // note: product order may reshuffle so we have to find the item again via key property
          const oldItemKey = item.key

          await fetchCart()

          const newItem = this.cart.items.find(item => item.key === oldItemKey)
          const newItemIndex = this.cart.items.indexOf(newItem)
          newItem.message = response.data.message
          Vue.set(this.cart.items, newItemIndex, newItem)
        } else if (request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest
          console.log('request error', request)
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log('unknown error', message)
        }
      }).finally(() => {
        isLoading.value = false
        item.isLoading = false
      })
  }

  async function fetchCart () {
    isLoading.value = true

    await axios.get(`${window.Shopify.routes.root}cart?view=data`).then(({ data }) => {
      cart.value = data
    }).catch(error => {
      console.log(error.toJSON())
    })

    isLoading.value = false
  }

  return {
    cart,
    isLoading,
    isAddingToCart,
    error,

    publicProperties,
    addToCart,
    updateItem,
    fetchCart
  }
}
