import { useEffect, useRef } from 'react'

/** 固定操作栏按实际高度给当前页面留出空间，兼容提示换行和窗口缩放。 */
export function useBottomBarSpace() {
  const bar = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = bar.current
    const screen = element?.closest('main')
    if (!element || !screen) return

    const measure = () =>
      screen.style.setProperty('--bottom-bar-height', `${element.getBoundingClientRect().height}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
      screen.style.removeProperty('--bottom-bar-height')
    }
  }, [])

  return bar
}
