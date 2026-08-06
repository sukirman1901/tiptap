"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Extension } from "@tiptap/core"
import { ReactRenderer } from "@tiptap/react"
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion"
import {
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  ImageUp,
  List,
  ListOrdered,
  Minus,
  Table,
  TextQuote,
  Type,
} from "lucide-react"
import * as React from "react"
import tippy, { type Instance, type Props } from "tippy.js"

// =============================================================================
// Types
// =============================================================================

export interface SlashMenuItem {
  title: string
  description: string
  icon: React.ElementType
  searchTerms: string[]
  command: (
    editor: ReturnType<typeof import("@tiptap/react").useEditor>
  ) => void
}

interface SlashMenuListProps {
  items: SlashMenuItem[]
  command: (item: SlashMenuItem) => void
}

interface SlashMenuListRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

// =============================================================================
// Default Slash Menu Items
// =============================================================================

export const defaultSlashMenuItems: SlashMenuItem[] = [
  {
    title: "Teks",
    description: "Paragraf biasa",
    icon: Type,
    searchTerms: ["text", "teks", "paragraph", "paragraf", "plain"],
    command: (editor) => {
      if (editor) editor.chain().focus().setParagraph().run()
    },
  },
  {
    title: "Judul 1",
    description: "Judul besar",
    icon: Heading1,
    searchTerms: ["heading", "judul", "h1", "title", "large"],
    command: (editor) => {
      if (editor) editor.chain().focus().setHeading({ level: 1 }).run()
    },
  },
  {
    title: "Judul 2",
    description: "Judul sedang",
    icon: Heading2,
    searchTerms: ["heading", "judul", "h2", "subtitle", "medium"],
    command: (editor) => {
      if (editor) editor.chain().focus().setHeading({ level: 2 }).run()
    },
  },
  {
    title: "Judul 3",
    description: "Judul kecil",
    icon: Heading3,
    searchTerms: ["heading", "judul", "h3", "small"],
    command: (editor) => {
      if (editor) editor.chain().focus().setHeading({ level: 3 }).run()
    },
  },
  {
    title: "Daftar poin",
    description: "Buat daftar berpoin",
    icon: List,
    searchTerms: ["bullet", "list", "daftar", "poin", "unordered", "ul"],
    command: (editor) => {
      if (editor) editor.chain().focus().toggleBulletList().run()
    },
  },
  {
    title: "Daftar bernomor",
    description: "Buat daftar bernomor",
    icon: ListOrdered,
    searchTerms: ["numbered", "list", "daftar", "nomor", "ordered", "ol"],
    command: (editor) => {
      if (editor) editor.chain().focus().toggleOrderedList().run()
    },
  },
  {
    title: "Checklist",
    description: "Daftar dengan kotak centang",
    icon: CheckSquare,
    searchTerms: ["task", "todo", "checkbox", "checklist", "centang"],
    command: (editor) => {
      if (editor) editor.chain().focus().toggleTaskList().run()
    },
  },
  {
    title: "Kutipan",
    description: "Blok kutipan",
    icon: TextQuote,
    searchTerms: ["quote", "kutipan", "blockquote", "cite"],
    command: (editor) => {
      if (editor) editor.chain().focus().setBlockquote().run()
    },
  },
  {
    title: "Pemisah",
    description: "Garis pemisah antar blok",
    icon: Minus,
    searchTerms: ["divider", "hr", "pemisah", "horizontal", "rule", "line"],
    command: (editor) => {
      if (editor) editor.chain().focus().setHorizontalRule().run()
    },
  },
  {
    title: "Gambar",
    description: "Unggah atau sisipkan gambar",
    icon: ImageUp,
    searchTerms: ["image", "gambar", "img", "picture", "photo", "upload"],
    command: (editor) => {
      if (editor) {
        editor.chain().focus().setImage({ src: null }).run()
      }
    },
  },
  {
    title: "Tabel",
    description: "Sisipkan tabel",
    icon: Table,
    searchTerms: ["table", "tabel", "grid", "spreadsheet"],
    command: (editor) => {
      if (editor) {
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
      }
    },
  },
]

// =============================================================================
// SlashMenuList Component
// =============================================================================

const EditorSlashMenuList = React.forwardRef<
  SlashMenuListRef,
  SlashMenuListProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const isKeyboardNavigating = React.useRef(false)

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  React.useEffect(() => {
    const selectedItem = itemRefs.current[selectedIndex]
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  const handleMouseEnter = (index: number) => {
    if (isKeyboardNavigating.current) return
    setSelectedIndex(index)
  }

  const handleMouseMove = () => {
    isKeyboardNavigating.current = false
  }

  React.useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        isKeyboardNavigating.current = true
        setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1))
        return true
      }

      if (event.key === "ArrowDown") {
        isKeyboardNavigating.current = true
        setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1))
        return true
      }

      if (event.key === "Enter") {
        const item = items[selectedIndex]
        if (item) {
          command(item)
        }
        return true
      }

      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        Tidak ada hasil
      </div>
    )
  }

  return (
    <ScrollArea
      style={{
        height:
          items.length * Number(itemRefs.current[0]?.offsetHeight ?? 48) + 8,
      }}
      className="bg-popover text-popover-foreground max-h-[300px] overflow-auto rounded-md border p-1 shadow-md"
      onMouseMove={handleMouseMove}
    >
      {items.map((item, index) => (
        <button
          key={item.title}
          ref={(el) => {
            itemRefs.current[index] = el
          }}
          onClick={() => command(item)}
          onMouseEnter={() => handleMouseEnter(index)}
          className={cn(
            "text-popover-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none",
            "min-w-[256px]",
            index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <div
            className="border-border bg-background text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border"
            aria-hidden="true"
          >
            <item.icon
              size={16}
              strokeWidth={2}
              className="text-foreground opacity-70"
            />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{item.title}</span>
            <span className="text-muted-foreground text-xs">
              {item.description}
            </span>
          </div>
        </button>
      ))}
    </ScrollArea>
  )
})
EditorSlashMenuList.displayName = "EditorSlashMenuList"

// =============================================================================
// Slash Menu Suggestion
// =============================================================================

function createSlashMenuSuggestion(
  items: SlashMenuItem[] | (() => SlashMenuItem[]) = defaultSlashMenuItems
): Omit<SuggestionOptions, "editor"> {
  return {
    char: "/",
    items: ({ query }) => {
      const list = typeof items === "function" ? items() : items
      const normalizedQuery = query.toLowerCase()
      return list.filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.searchTerms.some((term) => term.includes(normalizedQuery))
      )
    },
    render: () => {
      let component: ReactRenderer<SlashMenuListRef> | null = null
      let popup: Instance<Props>[] | null = null

      return {
        onStart: (props) => {
          component = new ReactRenderer(EditorSlashMenuList, {
            props,
            editor: props.editor,
          })

          const getReferenceClientRect = () =>
            props.clientRect?.() ?? new DOMRect(0, 0, 0, 0)

          if (!props.clientRect) return

          popup = tippy("body", {
            getReferenceClientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            animation: "shift-toward-subtle",
            theme: "slash-menu",
          })
        },

        onUpdate: (props) => {
          component?.updateProps(props)

          if (!props.clientRect || !popup?.[0]) return

          popup[0].setProps({
            getReferenceClientRect: () =>
              props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
          })
        },

        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide()
            return true
          }

          return component?.ref?.onKeyDown(props.event) ?? false
        },

        onExit: () => {
          popup?.[0]?.destroy()
          component?.destroy()
        },
      }
    },
    command: ({ editor, range, props }) => {
      editor.chain().focus().deleteRange(range).run()
      props.command(editor)
    },
  }
}

// =============================================================================
// EditorSlashMenuExtension
// =============================================================================

export interface EditorSlashMenuOptions {
  items?: SlashMenuItem[] | (() => SlashMenuItem[])
}

export const EditorSlashMenuExtension =
  Extension.create<EditorSlashMenuOptions>({
    name: "slashMenu",

    addOptions() {
      return {
        items: defaultSlashMenuItems,
      }
    },

    onCreate() {
      injectSlashMenuStyles()
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...createSlashMenuSuggestion(this.options.items),
        }),
      ]
    },
  })

// =============================================================================
// Slash Menu Styles (for tippy.js)
// =============================================================================

const SLASH_MENU_STYLES = `
  .tippy-box[data-theme~='slash-menu'] {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: inherit !important;
  }
  .tippy-box[data-theme~='slash-menu'] > .tippy-content {
    padding: 0 !important;
    color: inherit !important;
  }
  .tippy-box[data-theme~='slash-menu'] > .tippy-arrow {
    display: none !important;
  }
`

const STYLE_ID = "editor-slash-menu-styles"

function injectSlashMenuStyles() {
  if (typeof document === "undefined") return
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = SLASH_MENU_STYLES
  document.head.appendChild(style)
}

// =============================================================================
// Exports
// =============================================================================

export { createSlashMenuSuggestion, EditorSlashMenuList }
