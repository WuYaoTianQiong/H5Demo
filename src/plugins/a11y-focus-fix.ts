// ============================================
// A11y (Accessibility) Focus Fix Plugin
// 解决 aria-hidden 与 tabindex 冲突的焦点问题
// 参考: https://w3c.github.io/aria/#aria-hidden
// ============================================

export const A11yFocusFix = {
  install() {
    const fixAriaHiddenFocus = () => {
      const elements = document.querySelectorAll('[aria-hidden="true"][tabindex]')
      elements.forEach((el) => {
        el.removeAttribute('tabindex')
      })
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element
          if (
            mutation.attributeName === 'aria-hidden' &&
            target.getAttribute('aria-hidden') === 'true' &&
            target.hasAttribute('tabindex')
          ) {
            target.removeAttribute('tabindex')
          }
        }
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              if (
                node.getAttribute('aria-hidden') === 'true' &&
                node.hasAttribute('tabindex')
              ) {
                node.removeAttribute('tabindex')
              }
              const children = node.querySelectorAll('[aria-hidden="true"][tabindex]')
              children.forEach((child) => {
                child.removeAttribute('tabindex')
              })
            }
          })
        }
      }
    })

    const startObserver = () => {
      if (document.body) {
        fixAriaHiddenFocus()
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['aria-hidden', 'tabindex'],
          childList: true,
          subtree: true,
        })
      } else {
        requestAnimationFrame(startObserver)
      }
    }

    startObserver()

    document.addEventListener('focusin', (e) => {
      const target = e.target as Element
      const hiddenAncestor = target.closest('[aria-hidden="true"]')
      if (hiddenAncestor) {
        const focusableElements = document.querySelectorAll(
          'button:not([aria-hidden="true"]), [href]:not([aria-hidden="true"]), input:not([aria-hidden="true"]), select:not([aria-hidden="true"]), textarea:not([aria-hidden="true"]), [tabindex]:not([aria-hidden="true"])'
        )
        const visibleFocusable = Array.from(focusableElements).find((el) => {
          return !el.closest('[aria-hidden="true"]') && (el as HTMLElement).offsetParent !== null
        })
        if (visibleFocusable) {
          ;(visibleFocusable as HTMLElement).focus()
        } else {
          ;(target as HTMLElement).blur()
        }
      }
    }, true)
  },
}

export default A11yFocusFix
