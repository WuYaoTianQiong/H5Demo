import { ref, onMounted, onUnmounted, type Ref } from 'vue'

const MOBILE_BREAKPOINT = 768

export function useDevice(): { isMobile: Ref<boolean> } {
  const isMobile = ref<boolean>(false)
  let resizeObserver: ResizeObserver | null = null

  const checkDevice = () => {
    isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
  }

  onMounted(() => {
    checkDevice()
    
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkDevice()
      })
      resizeObserver.observe(document.body)
    } else {
      window.addEventListener('resize', checkDevice)
    }
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    } else {
      window.removeEventListener('resize', checkDevice)
    }
  })

  return {
    isMobile
  }
}
