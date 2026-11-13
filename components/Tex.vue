<script setup>
// inline KaTeX for use inside components, where slide markdown maths is not available
import katex from 'katex'
// load the stylesheet here: Slidev only adds it when an enabled slide has markdown maths
import 'katex/dist/katex.min.css'
import { computed } from 'vue'
const props = defineProps({ src: String, display: Boolean })
const html = computed(() => katex.renderToString(props.src, { displayMode: props.display, throwOnError: false }))
</script>

<template>
  <span class="tex" v-html="html" />
</template>
