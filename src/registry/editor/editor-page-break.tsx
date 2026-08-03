"use client"

import { mergeAttributes, Node } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import { SeparatorHorizontal } from "lucide-react"
import { createEditorExtension } from "./editor"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType
    }
  }
}

const PAGE_BREAK_STYLES = `
  .editor-page-break {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    margin: 0;
    box-sizing: border-box;
    user-select: none;
    page-break-after: always;
    break-after: page;
    min-height: 1.75rem;
  }
  .editor-page-break::before,
  .editor-page-break::after {
    content: "";
    flex: 1;
    border-top: 1px dashed hsl(var(--border));
  }
  .editor-page-break__label {
    flex-shrink: 0;
    font-size: 0.6875rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: hsl(var(--muted-foreground));
  }
  @media print {
    .editor-page-break {
      margin: 0;
      height: 0 !important;
      min-height: 0;
      border: 0;
      visibility: hidden;
      overflow: hidden;
    }
    .editor-page-break::before,
    .editor-page-break::after,
    .editor-page-break__label {
      display: none;
    }
  }
`

let stylesInjected = false
function injectPageBreakStyles() {
  if (stylesInjected || typeof document === "undefined") return
  const style = document.createElement("style")
  style.textContent = PAGE_BREAK_STYLES
  document.head.appendChild(style)
  stylesInjected = true
}

function readMarginTopPx(content: Element): number {
  const pad = getComputedStyle(content as HTMLElement).paddingTop
  return Number.parseFloat(pad) || 0
}

function readGapPx(stack: Element): number {
  const papers = stack.querySelectorAll<HTMLElement>('[data-paper="a4"]')
  if (papers.length >= 2) {
    const a = papers[0].getBoundingClientRect()
    const b = papers[1].getBoundingClientRect()
    const gap = b.top - a.bottom
    if (gap > 0) return gap
  }
  const fromVar = getComputedStyle(stack).getPropertyValue("--a4-gap")
  const parsed = Number.parseFloat(fromVar)
  return Number.isFinite(parsed) ? parsed : 16
}

function updatePageBreakHeight(dom: HTMLElement) {
  const stack = dom.closest("[data-a4-stack]")
  const content = dom.closest("[data-a4-content]")
  const isDesktop =
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches

  if (!stack || !content || !isDesktop) {
    dom.style.height = ""
    return
  }

  const paper = stack.querySelector<HTMLElement>('[data-paper="a4"]')
  const pageHeight = paper?.getBoundingClientRect().height ?? 0
  if (pageHeight <= 0) return

  const gapPx = readGapPx(stack)
  const marginTop = readMarginTopPx(content)
  const stride = pageHeight + gapPx

  const stackTop = stack.getBoundingClientRect().top
  const breakTop = dom.getBoundingClientRect().top
  const stackY = breakTop - stackTop

  const pageIndex = Math.max(0, Math.floor(stackY / stride))
  const nextContentTop = (pageIndex + 1) * stride + marginTop
  const spacer = Math.max(28, nextContentTop - stackY)

  dom.style.height = `${spacer}px`
}

const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-break",
        class: "editor-page-break",
        contenteditable: "false",
      }),
      ["span", { class: "editor-page-break__label" }, "Henti halaman"],
    ]
  },

  addNodeView() {
    return () => {
      const dom = document.createElement("div")
      dom.dataset.type = "page-break"
      dom.className = "editor-page-break"
      dom.contentEditable = "false"

      const label = document.createElement("span")
      label.className = "editor-page-break__label"
      label.textContent = "Henti halaman"
      dom.appendChild(label)

      let ro: ResizeObserver | null = null
      let raf = 0

      const schedule = () => {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => updatePageBreakHeight(dom))
      }

      const mountObservers = () => {
        ro?.disconnect()
        const stack = dom.closest("[data-a4-stack]")
        const content = dom.closest("[data-a4-content]")
        ro = new ResizeObserver(schedule)
        if (stack) ro.observe(stack)
        if (content) ro.observe(content)
        ro.observe(dom)
        window.addEventListener("resize", schedule)
        schedule()
      }

      // NodeView may mount before layout; defer observer attach
      requestAnimationFrame(mountObservers)

      return {
        dom,
        update() {
          schedule()
          return true
        },
        destroy() {
          cancelAnimationFrame(raf)
          ro?.disconnect()
          window.removeEventListener("resize", schedule)
        },
      }
    }
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name })
            .createParagraphNear()
            .run(),
    }
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.setPageBreak(),
    }
  },

  onCreate() {
    injectPageBreakStyles()
  },

  onTransaction({ editor }) {
    // Refresh spacers after doc/layout changes
    requestAnimationFrame(() => {
      editor.view.dom
        .querySelectorAll<HTMLElement>(".editor-page-break")
        .forEach(updatePageBreakHeight)
    })
  },
})

export const EditorPageBreakExtension = createEditorExtension({
  extension: PageBreak,
  commands: [
    {
      key: "pageBreak",
      icon: SeparatorHorizontal,
      label: "Henti halaman",
      description: "Sisipkan page break",
      execute: (editor: Editor) => editor.chain().focus().setPageBreak().run(),
      canExecute: () => true,
    },
  ],
})
