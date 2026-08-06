"use client"

import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view"
import { createEditorExtension } from "./editor"

const PAGE_GAP_PX = 16

const pageGapKey = new PluginKey<GapSpec[]>("a4PageGaps")

type GapSpec = { pos: number; height: number }

const GAP_STYLES = `
  .editor-a4-page-gap-node {
    /* margin-top set via decoration — keeps valid list/table DOM */
  }
  @media print {
    .editor-a4-page-gap-node {
      margin-top: 0 !important;
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
      papers[1].getBoundingClientRect().top -
      papers[0].getBoundingClientRect().bottom
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

function isLegacyGapEl(el: HTMLElement) {
  return (
    el.dataset.a4PageGap === "true" ||
    el.classList.contains("editor-a4-page-gap")
  )
}

function isBreakEl(el: HTMLElement) {
  return (
    el.classList.contains("editor-page-break") ||
    el.dataset.type === "page-break"
  )
}

function gapMarginPx(el: HTMLElement): number {
  if (el.classList.contains("editor-a4-page-gap-node")) {
    return Number.parseFloat(el.style.marginTop) || 0
  }
  if (isLegacyGapEl(el)) return el.offsetHeight
  return 0
}

/**
 * Pagination units: top-level blocks, but expand lists/tables so a long
 * <ol>/<ul>/<table> can break between items/rows instead of jumping as one slab.
 */
function collectPaginateUnits(pm: HTMLElement): HTMLElement[] {
  const units: HTMLElement[] = []
  for (const child of Array.from(pm.children) as HTMLElement[]) {
    if (isLegacyGapEl(child) || isBreakEl(child)) continue
    const tag = child.tagName
    if (tag === "UL" || tag === "OL") {
      for (const li of Array.from(child.children) as HTMLElement[]) {
        if (li.tagName === "LI") units.push(li)
      }
      continue
    }
    if (tag === "TABLE") {
      const rows = child.querySelectorAll<HTMLElement>(":scope > tbody > tr, :scope > tr")
      if (rows.length) {
        rows.forEach((tr) => units.push(tr))
        continue
      }
    }
    units.push(child)
  }
  return units
}

/**
 * Doc position of the node we decorate (listItem / tableRow / top-level block).
 * Never insert a widget <div> inside <ul>/<ol> — browsers hoist it and break layout.
 */
function unitDocPos(view: EditorView, el: HTMLElement): number | null {
  try {
    const inside = view.posAtDOM(el, 0)
    const $pos = view.state.doc.resolve(inside)
    for (let d = $pos.depth; d >= 1; d--) {
      const name = $pos.node(d).type.name
      if (
        name === "listItem" ||
        name === "taskItem" ||
        name === "tableRow" ||
        d === 1
      ) {
        return $pos.before(d)
      }
    }
    return inside
  } catch {
    return null
  }
}

/** Content-only Y: layout offset minus page-gap margins above this unit. */
function contentOffsetY(pm: HTMLElement, unit: HTMLElement) {
  const pmRect = pm.getBoundingClientRect()
  const unitRect = unit.getBoundingClientRect()
  let gaps = 0

  // Subtract gap margins from every prior pagination unit (and legacy widgets).
  for (const el of collectPaginateUnits(pm)) {
    if (el === unit) break
    gaps += gapMarginPx(el)
  }
  for (const child of Array.from(pm.children) as HTMLElement[]) {
    if (child === unit || child.contains(unit)) break
    if (isLegacyGapEl(child)) gaps += child.offsetHeight
  }

  return unitRect.top - pmRect.top + pm.scrollTop - gaps
}

/**
 * Place a dead-zone (margin-top) on the first unit that crosses each page
 * content boundary — works for paragraphs, list items, and table rows.
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

  for (const unit of collectPaginateUnits(pm)) {
    const y = contentOffsetY(pm, unit)
    const height = unit.getBoundingClientRect().height
    if (height <= 0) continue

    const blockEnd = y + height
    let boundary =
      Math.floor(prevEnd / pageContentPx) * pageContentPx + pageContentPx

    while (boundary < blockEnd - 0.5) {
      if (prevEnd < boundary) {
        const pageIndex = Math.max(0, Math.round(boundary / pageContentPx) - 1)
        const pos = unitDocPos(view, unit)
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

function specsToDecorations(
  doc: EditorView["state"]["doc"],
  specs: GapSpec[]
) {
  const decos = []
  for (const s of specs) {
    const node = doc.nodeAt(s.pos)
    if (!node) continue
    // Node decoration = margin on the block itself (valid inside lists/tables).
    decos.push(
      Decoration.node(
        s.pos,
        s.pos + node.nodeSize,
        {
          class: "editor-a4-page-gap-node",
          style: `margin-top: ${Math.max(0, Math.round(s.height))}px`,
          "data-a4-page-gap": "true",
        },
        { key: `a4-gap-${s.pos}` }
      )
    )
  }
  return DecorationSet.create(doc, decos)
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
            const meta = tr.getMeta(pageGapKey) as
              | { specs?: GapSpec[] }
              | undefined
            if (meta?.specs) return meta.specs
            // Drop stale positions immediately — refresh will recompute.
            if (tr.docChanged) return []
            return prev
          },
        },
        props: {
          decorations(state) {
            const specs = pageGapKey.getState(state) ?? []
            if (!specs.length) return DecorationSet.empty
            // Guard: skip specs that no longer point at a node
            const valid = specs.filter((s) => state.doc.nodeAt(s.pos))
            return specsToDecorations(state.doc, valid)
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
