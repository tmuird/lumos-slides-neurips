// true while this slide is the one on screen; falls back to always-on outside Slidev
import { ref } from 'vue'
import { useIsSlideActive } from '@slidev/client'

export function useActive() {
  try { return useIsSlideActive() } catch { return ref(true) }
}
