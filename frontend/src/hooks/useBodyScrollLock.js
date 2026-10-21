import { useEffect } from 'react'

function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined

    const body = document.body
    const root = document.documentElement
    const previousBodyOverflow = body.style.overflow
    const previousRootOverflow = root.style.overflow
    const previousBodyPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - root.clientWidth

    body.style.overflow = 'hidden'
    root.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }

    return () => {
      body.style.overflow = previousBodyOverflow
      root.style.overflow = previousRootOverflow
      body.style.paddingRight = previousBodyPaddingRight
    }
  }, [isLocked])
}

export default useBodyScrollLock
