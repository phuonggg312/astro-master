<template>
  <div class="read-more">
    <div
      ref="content"
      class="content"
      :style="contentStyle"
    >
      <slot />
    </div>
    <a
      v-if="isEnabled && !isReadingMore"
      href="javascript:"
      role="button"
      @click.prevent="readMore"
    >read more</a>
    <a
      v-else-if="isEnabled"
      href="javascript:"
      role="button"
      @click.prevent="readLess"
    >read less</a>
  </div>
</template>

<script>
export default {
  props: {
    lessHeight: {
      type: Number,
      required: true
    }
  },

  data () {
    return {
      isEnabled: false,
      isReadingMore: false,
      contentHeight: 0
    }
  },

  computed: {
    contentStyle () {
      if (!this.isEnabled) return {}
      const h = this.isReadingMore ? this.contentHeight : this.lessHeight
      return {
        height: h + 'px',
        maxHeight: h + 'px'
      }
    }
  },

  mounted () {
    this.$nextTick(this.measure)
  },

  methods: {
    measure () {
      const el = this.$refs.content
      if (!el) return
      this.contentHeight = el.scrollHeight
      if (this.contentHeight > this.lessHeight) {
        this.isEnabled = true
        this.readLess()
      } else {
        this.isEnabled = false
      }
    },

    readMore () {
      this.isReadingMore = true
    },

    readLess () {
      this.isReadingMore = false
    }
  }
}
</script>

<style scoped>
.content {
  margin-bottom: 5px;
  text-align:left;
  overflow: hidden;
  transition: height .3s ease-in-out, max-height .3s ease-in-out;
}

.read-more {
  text-align: center;
}

a {
  text-decoration: none;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-block;
  margin-top: 10px;
}
</style>
