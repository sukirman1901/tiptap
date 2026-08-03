"use client"

import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view"
import { createEditorExtension } from "./editor"

const PAGE_GAP_PX = 16

const pageGapKey = new PluginKey<GapSpec[]>("a4PageGaps")

type GapSpec = { pos: number; height: number }

const GAP_STYLES = `
  .editor-a4-page-gap {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    pointer-events: none;
    user-select: none;
  }
  @media print {
    .editor-a4-page-gap {
      display: none !important;
      height: 0 !important;
    }
  }
`

let stylesInjected = false
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return
  const style = document.createElement("style")
  style.textContent = GAP_STYLES
  document.head.appendChild(style)
  stylesInjected = true
}

function readGapPx(stack: Element): number {
  const papers = stack.querySelectorAll<HTMLElement>('[data-paper="a4"]')
  if (papers.length >= 2) {
    const gap =
      papers[1].getBoundingClientRect().top - papers[0].getBoundingClientRect().bottom
    if (gap > 0) return gap
  }
  return PAGE_GAP_PX
}

function specsEqual(a: GapSpec[], b: GapSpec[]) {
  if (a.length !== b.length) return false
  return a.every(
    (s, i) => s.pos === b[i]?.pos && Math.abs(s.height - b[i].height) < 1
  )
}

function createGapEl(height: number) {
  const el = document.createElement("div")
  el.className = "editor-a4-page-gap"
  el.dataset.a4PageGap = "true"
  el.contentEditable = "false"
  el.style.height = `${Math.max(0, Math.round(height))}px`
  return el
}

function isGapEl(el: HTMLElement) {
  return (
    el.dataset.a4PageGap === "true" || el.classList.contains("editor-a4-page-gap")
  )
}

function isBreakEl(el: HTMLElement) {
  return (
    el.classList.contains("editor-page-break") || el.dataset.type === "page-break"
  )
}

function blockPosBefore(view: EditorView, child: HTMLElement): number | null {
  try {
    const inside = view.posAtDOM(child, 0)
    const $pos = view.state.doc.resolve(inside)
    const pos = $pos.depth > 0 ? $pos.before($pos.depth) : inside
    if (pos < 0 || pos > view.state.doc.content.size) return null
    return pos
  } catch {
    return null
  }
}

/** Content-only Y: offsetTop minus auto-gap widgets above (stable vs decorations). */
function contentOffsetY(pm: HTMLElement, child: HTMLElement) {
  let gaps = 0
  for (const el of Array.from(pm.children) as HTMLElement[]) {
    if (el === child) break
    if (isGapEl(el)) gaps += el.offsetHeight
  }
  return child.offsetTop - gaps
}

/**
 * Place a fixed dead-zone spacer before the first block that meets or crosses
 * each page content boundary in content-only coordinates.
 */
function computeGapSpecs(view: EditorView): GapSpec[] {
  if (typeof window === "undefined") return []
  if (!window.matchMedia("(min-width: 768px)").matches) return []

  const pm = view.dom as HTMLElement
  const content = pm.closest("[data-a4-content]")
  const stack = pm.closest("[data-a4-stack]")
  const sentinel = document.querySelector<HTMLElement>(
    "[data-a4-content-sentinel]"
  )
  if (!content || !stack || !sentinel) return []

  const pageContentPx = sentinel.offsetHeight
  if (pageContentPx <= 0) return []

  const marginTop = Number.parseFloat(getComputedStyle(content).paddingTop) || 0
  const marginBottom =
    Number.parseFloat(getComputedStyle(content).paddingBottom) || 0
  const gapPx = readGapPx(stack)
  const deadZone = marginTop + marginBottom + gapPx

  const byPage = new Map<number, GapSpec>()
  let prevEnd = 0

  for (const child of Array.from(pm.children) as HTMLElement[]) {
    if (isGapEl(child) || isBreakEl(child)) continue

    const y = contentOffsetY(pm, child)
    const height = child.offsetHeight
    if (height <= 0) continue

    const blockEnd = y + height
    // First page boundary at or after previous block end
    let boundary =
      Math.floor(prevEnd / pageContentPx) * pageContentPx + pageContentPx

    while (boundary < blockEnd - 0.5) {
      if (prevEnd < boundary) {
        const pageIndex = Math.max(0, Math.round(boundary / pageContentPx) - 1)
        const pos = blockPosBefore(view, child)
        if (pos != null) {
          const existing = byPage.get(pageIndex)
          if (!existing || pos < existing.pos) {
            byPage.set(pageIndex, { pos, height: deadZone })
          }
        }
      }
      boundary += pageContentPx
    }

    prevEnd = Math.max(prevEnd, blockEnd)
  }

  return Array.from(byPage.values()).sort((a, b) => a.pos - b.pos)
}

function specsToDecorations(doc: EditorView["state"]["doc"], specs: GapSpec[]) {
  return DecorationSet.create(
    doc,
    specs.map((s) =>
      Decoration.widget(
        s.pos,
        () => createGapEl(s.height),
        { side: 1, key: `a4-gap-${s.pos}` }
      )
    )
  )
}

const A4PageGap = Extension.create({
  name: "a4PageGaps",

  onCreate() {
    injectStyles()
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<GapSpec[]>({
        key: pageGapKey,
        state: {
          init: () => [],
          apply(tr, prev) {
            const meta = tr.getMeta(pageGapKey) as { specs?: GapSpec[] } | undefined
            if (meta?.specs) return meta.specs
            if (tr.docChanged) return prev
            return prev
          },
        },
        props: {
          decorations(state) {
            const specs = pageGapKey.getState(state) ?? []
            return specsToDecorations(state.doc, specs)
          },
        },
        view(view) {
          let raf = 0
          let passes = 0

          const refresh = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => {
              const specs = computeGapSpecs(view)
              const prev = pageGapKey.getState(view.state) ?? []
              if (specsEqual(prev, specs)) {
                passes = 0
                return
              }
              // Allow a few settle passes after layout shifts
              if (passes++ > 8) {
                passes = 0
                return
              }
              view.dispatch(view.state.tr.setMeta(pageGapKey, { specs }))
            })
          }

          const ro = new ResizeObserver(refresh)
          ro.observe(view.dom)
          const stack = view.dom.closest("[data-a4-stack]")
          if (stack) ro.observe(stack)

          window.addEventListener("resize", refresh)
          refresh()

          return {
            update(view, prevState) {
              if (!view.state.doc.eq(prevState.doc)) {
                passes = 0
                refresh()
              }
            },
            destroy() {
              cancelAnimationFrame(raf)
              ro.disconnect()
              window.removeEventListener("resize", refresh)
            },
          }
        },
      }),
    ]
  },
})

export const EditorPageGapExtension = createEditorExtension({
  extension: A4PageGap,
})
