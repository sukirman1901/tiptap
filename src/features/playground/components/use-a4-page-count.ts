"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react"

/** A4 layout tokens — keep in sync with DocumentCanvas / page break. */
export const A4_PAGE = {
  width: "210mm",
  height: "297mm",
  marginTop: "30mm",
  marginRight: "25mm",
  marginBottom: "25mm",
  marginLeft: "30mm",
  /** Printable body height: 297 − 30 − 25 */
  contentHeight: "242mm",
  gapClass: "gap-4",
  gapPx: 16,
} as const

export const A4_CSS_VARS = {
  "--a4-page-h": A4_PAGE.height,
  "--a4-content-h": A4_PAGE.contentHeight,
  "--a4-margin-t": A4_PAGE.marginTop,
  "--a4-margin-r": A4_PAGE.marginRight,
  "--a4-margin-b": A4_PAGE.marginBottom,
  "--a4-margin-l": A4_PAGE.marginLeft,
  "--a4-gap": `${A4_PAGE.gapPx}px`,
} as CSSProperties

export interface A4Pagination {
  pageCount: number
  currentPage: number
}

/**
 * Observes editor content height → page count, and stage scroll → current page.
 */
export function useA4Pagination(
  contentRef: RefObject<HTMLElement | null>,
  sentinelRef: RefObject<HTMLElement | null>,
  stageRef: RefObject<HTMLElement | null>
): A4Pagination {
  const [pageCount, setPageCount] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const pageCountRef = useRef(1)

  useEffect(() => {
    const contentEl = contentRef.current
    const sentinel = sentinelRef.current
    const stage = stageRef.current
    if (!contentEl || !sentinel) return

    let raf = 0

    const measureContentHeight = (pm: HTMLElement) => {
      const text = (pm.textContent ?? "").replace(/\u00a0/g, " ").trim()
      if (!text) return 0

      const prevMin = pm.style.minHeight
      pm.style.minHeight = "0"
      void pm.offsetHeight
      let height = pm.scrollHeight
      pm.style.minHeight = prevMin

      let summed = 0
      for (const child of Array.from(pm.children) as HTMLElement[]) {
        summed += child.offsetHeight
      }
      if (summed > 0) height = Math.min(height, summed)

      return height
    }

    const updateCurrentPage = (count: number) => {
      if (!stage) {
        setCurrentPage(1)
        return
      }
      const paper = stage.querySelector<HTMLElement>('[data-paper="a4"]')
      const pageH = paper?.offsetHeight ?? 0
      if (pageH <= 0 || count < 1) {
        setCurrentPage(1)
        return
      }
      const stride = pageH + A4_PAGE.gapPx
      const focusY = stage.scrollTop + stage.clientHeight * 0.35
      const page = Math.min(count, Math.max(1, Math.floor(focusY / stride) + 1))
      setCurrentPage((prev) => (prev === page ? prev : page))
    }

    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const pageContentPx = sentinel.offsetHeight
        if (pageContentPx <= 0) return

        const pm = contentEl.querySelector<HTMLElement>(".ProseMirror")
        if (!pm) {
          pageCountRef.current = 1
          setPageCount(1)
          setCurrentPage(1)
          return
        }

        const contentHeight = measureContentHeight(pm)
        const next =
          contentHeight <= 0
            ? 1
            : Math.max(1, Math.ceil(contentHeight / pageContentPx))
        pageCountRef.current = next
        setPageCount((prev) => (prev === next ? prev : next))
        updateCurrentPage(next)
      })
    }

    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(contentEl)
    const pm = contentEl.querySelector(".ProseMirror")
    if (pm) ro.observe(pm)
    ro.observe(sentinel)

    const mo = new MutationObserver(measure)
    if (pm) {
      mo.observe(pm, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }

    const onScroll = () => updateCurrentPage(pageCountRef.current)
    stage?.addEventListener("scroll", onScroll, { passive: true })

    window.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
      stage?.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", measure)
    }
  }, [contentRef, sentinelRef, stageRef])

  return { pageCount, currentPage }
}

/** @deprecated use useA4Pagination */
export function useA4PageCount(
  contentRef: RefObject<HTMLElement | null>,
  sentinelRef: RefObject<HTMLElement | null>
) {
  const stageRef = { current: null }
  return useA4Pagination(contentRef, sentinelRef, stageRef).pageCount
}
