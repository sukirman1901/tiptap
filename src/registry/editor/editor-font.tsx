"use client"

import * as React from "react"
import { Extension } from "@tiptap/core"
import FontFamily from "@tiptap/extension-text-style/font-family"
import FontSize from "@tiptap/extension-text-style/font-size"
import type { Editor } from "@tiptap/react"
import { useEditorState } from "@tiptap/react"
import type { Node } from "@tiptap/pm/model"
import type { Transaction } from "@tiptap/pm/state"
import { AllSelection, Plugin, TextSelection } from "@tiptap/pm/state"
import { CellSelection } from "@tiptap/pm/tables"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { createEditorExtension, useEditor } from "./editor"

/** Document defaults (also set on the A4 canvas CSS). */
export const DEFAULT_FONT_FAMILY =
  '"Times New Roman", Times, serif' as const
export const DEFAULT_FONT_LABEL = "Times New Roman" as const
export const DEFAULT_FONT_SIZE = "12pt" as const

export const FONT_FAMILIES = [
  {
    label: DEFAULT_FONT_LABEL,
    value: DEFAULT_FONT_FAMILY,
  },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
] as const

export const FONT_SIZES = [
  { label: "10", value: "10pt" },
  { label: "11", value: "11pt" },
  { label: "12", value: "12pt" },
  { label: "14", value: "14pt" },
  { label: "16", value: "16pt" },
  { label: "18", value: "18pt" },
  { label: "20", value: "20pt" },
  { label: "24", value: "24pt" },
  { label: "28", value: "28pt" },
  { label: "32", value: "32pt" },
] as const

const BLOCK_FONT_TYPES = ["paragraph", "heading", "blockquote", "listItem"]

type BlockFontAttr = "fontFamily" | "fontSize"

/**
 * Font/size on the block (paragraph) so Enter copies them to the next
 * paragraph — including inside list items. Marks alone are lost on empty
 * lines; block attrs + storedMarks keep toolbar styles alive.
 */
const BlockFont = Extension.create({
  name: "blockFont",

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_FONT_TYPES,
        attributes: {
          fontFamily: {
            default: null,
            keepOnSplit: true,
            parseHTML: (element) => {
              const data = element.getAttribute("data-font-family")
              if (data) return data
              return element.style.fontFamily || null
            },
            renderHTML: (attributes) => {
              const fontFamily = attributes.fontFamily as string | null
              if (fontFamily == null || fontFamily === "") return {}
              return {
                "data-font-family": fontFamily,
                style: `font-family: ${fontFamily}`,
              }
            },
          },
          fontSize: {
            default: null,
            keepOnSplit: true,
            parseHTML: (element) => {
              const data = element.getAttribute("data-font-size")
              if (data) return data
              return element.style.fontSize || null
            },
            renderHTML: (attributes) => {
              const fontSize = attributes.fontSize as string | null
              if (fontSize == null || fontSize === "") return {}
              return {
                "data-font-size": fontSize,
                style: `font-size: ${fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  /**
   * After Enter / split into an empty block, restore textStyle storedMarks
   * from the block's fontFamily/fontSize so the next keystrokes match toolbar.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_transactions, _oldState, newState) => {
          const { selection, schema, storedMarks } = newState
          if (!(selection instanceof TextSelection) || !selection.empty) {
            return null
          }

          const $from = selection.$from
          let block: Node | null = null
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d)
            if (BLOCK_FONT_TYPES.includes(node.type.name)) {
              block = node
              break
            }
          }
          if (!block) return null

          // Only sync when the textblock is empty (typical post-Enter list/paragraph).
          if (block.content.size > 0) return null

          const fontFamily = (block.attrs.fontFamily as string | null) ?? null
          const fontSize = (block.attrs.fontSize as string | null) ?? null
          if (!fontFamily && !fontSize) return null

          const textStyle = schema.marks.textStyle
          if (!textStyle) return null

          const current = storedMarks ?? $from.marks()
          const existing = current.find((m) => m.type === textStyle)
          const nextAttrs = {
            ...(existing?.attrs ?? {}),
            ...(fontFamily ? { fontFamily } : {}),
            ...(fontSize ? { fontSize } : {}),
          }

          const same =
            existing &&
            existing.attrs.fontFamily === nextAttrs.fontFamily &&
            existing.attrs.fontSize === nextAttrs.fontSize
          if (same) return null

          const nextMark = textStyle.create(nextAttrs)
          const others = current.filter((m) => m.type !== textStyle)
          return newState.tr.setStoredMarks([...others, nextMark])
        },
      }),
    ]
  },
})

function patchBlockFont(
  tr: Transaction,
  pos: number,
  patch: Partial<Record<BlockFontAttr, string | null>>
): Transaction {
  const mapped = tr.mapping.map(pos)
  const node = tr.doc.nodeAt(mapped)
  if (!node || !BLOCK_FONT_TYPES.includes(node.type.name)) return tr

  const nextAttrs = { ...node.attrs }
  let changed = false
  for (const key of Object.keys(patch) as BlockFontAttr[]) {
    if (!(key in patch)) continue
    const next = patch[key] as string | null
    const current = (node.attrs[key] as string | null) ?? null
    if (current === next) continue
    nextAttrs[key] = next
    changed = true
  }
  if (!changed) return tr
  return tr.setNodeMarkup(mapped, node.type, nextAttrs, node.marks)
}

function collectBlockFontPositions(tr: Transaction): number[] {
  const { selection } = tr
  const positions: number[] = []

  if (selection instanceof CellSelection) {
    selection.forEachCell((cell, cellPos) => {
      const walk = (node: Node, pos: number) => {
        if (BLOCK_FONT_TYPES.includes(node.type.name)) {
          positions.push(pos)
          return
        }
        node.forEach((child, offset) => walk(child, pos + 1 + offset))
      }
      walk(cell, cellPos)
    })
    return positions
  }

  if (
    !(selection instanceof TextSelection || selection instanceof AllSelection)
  ) {
    return positions
  }

  const { from, to } = selection
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!BLOCK_FONT_TYPES.includes(node.type.name)) return true
    positions.push(pos)
    return false
  })

  if (positions.length === 0 && from === to) {
    const $pos = selection.$from
    for (let d = $pos.depth; d > 0; d--) {
      if (!BLOCK_FONT_TYPES.includes($pos.node(d).type.name)) continue
      positions.push($pos.before(d))
      break
    }
  }

  // Collapsed caret inside a list → apply font to every item in that list
  // (toolbar change should restyle the whole poin/nomor block, not one line).
  if (from === to && positions.length > 0) {
    const $pos = selection.$from
    for (let d = $pos.depth; d > 0; d--) {
      const name = $pos.node(d).type.name
      if (
        name !== "bulletList" &&
        name !== "orderedList" &&
        name !== "taskList"
      ) {
        continue
      }
      const listPos = $pos.before(d)
      const listNode = $pos.node(d)
      const expanded: number[] = []
      listNode.descendants((child, offset) => {
        if (child.type.name === "listItem" || child.type.name === "taskItem") {
          expanded.push(listPos + 1 + offset)
          // Also the paragraph(s) inside this item
          child.forEach((grand, grandOffset) => {
            if (BLOCK_FONT_TYPES.includes(grand.type.name)) {
              expanded.push(listPos + 1 + offset + 1 + grandOffset)
            }
          })
          return false
        }
        return true
      })
      if (expanded.length) return expanded
    }
  }

  return positions
}

/**
 * Apply font/size to every target block:
 * - block attrs (survive Enter / list split)
 * - textStyle marks across the whole block (updates existing text even if caret is collapsed)
 * - storedMarks for the next keystroke
 */
function applyDocumentFont(
  editor: Editor,
  patch: Partial<Record<BlockFontAttr, string | null>>
) {
  const { state } = editor
  const textStyle = state.schema.marks.textStyle
  let tr = state.tr.setSelection(state.selection)
  const positions = collectBlockFontPositions(tr)

  for (const pos of positions) {
    tr = patchBlockFont(tr, pos, patch)
  }

  if (textStyle) {
    for (const pos of positions) {
      const mapped = tr.mapping.map(pos)
      const node = tr.doc.nodeAt(mapped)
      if (!node) continue
      const from = mapped + 1
      const to = mapped + node.nodeSize - 1
      if (from >= to) continue

      tr.doc.nodesBetween(from, to, (child, childPos) => {
        if (!child.isText) return true
        const existing = child.marks.find((m) => m.type === textStyle)
        const nextAttrs = { ...(existing?.attrs ?? {}) }
        let changed = false
        for (const key of Object.keys(patch) as BlockFontAttr[]) {
          if (!(key in patch)) continue
          const value = patch[key] as string | null
          if (value == null || value === "") {
            if (nextAttrs[key] != null) {
              delete nextAttrs[key]
              changed = true
            }
          } else if (nextAttrs[key] !== value) {
            nextAttrs[key] = value
            changed = true
          }
        }
        if (!changed && existing) return false

        const hasStyle =
          nextAttrs.fontFamily ||
          nextAttrs.fontSize ||
          nextAttrs.color ||
          nextAttrs.backgroundColor

        if (!hasStyle) {
          if (existing) {
            tr = tr.removeMark(childPos, childPos + child.nodeSize, textStyle)
          }
        } else {
          tr = tr.addMark(
            childPos,
            childPos + child.nodeSize,
            textStyle.create(nextAttrs)
          )
        }
        return false
      })
    }

    // Stored marks for empty blocks / caret after apply
    const base = tr.storedMarks ?? state.selection.$from.marks()
    const existing = base.find((m) => m.type === textStyle)
    const nextAttrs = { ...(existing?.attrs ?? {}) }
    for (const key of Object.keys(patch) as BlockFontAttr[]) {
      if (!(key in patch)) continue
      const value = patch[key] as string | null
      if (value == null || value === "") delete nextAttrs[key]
      else nextAttrs[key] = value
    }
    const others = base.filter((m) => m.type !== textStyle)
    const hasStyle =
      nextAttrs.fontFamily ||
      nextAttrs.fontSize ||
      nextAttrs.color ||
      nextAttrs.backgroundColor
    tr = tr.setStoredMarks(
      hasStyle ? [...others, textStyle.create(nextAttrs)] : others
    )
  }

  if (tr.docChanged || tr.storedMarks !== state.storedMarks) {
    editor.view.dispatch(tr)
  }
}

function activeBlockFont(
  editor: Editor | null,
  attr: BlockFontAttr
): string | null {
  if (!editor) return null
  const { selection, doc } = editor.state

  if (selection instanceof CellSelection) {
    let agreed: string | null | undefined
    let mixed = false
    selection.forEachCell((cell) => {
      if (mixed) return
      cell.descendants((child) => {
        if (!BLOCK_FONT_TYPES.includes(child.type.name)) return true
        const value = (child.attrs[attr] as string | null) ?? null
        if (agreed === undefined) agreed = value
        else if (agreed !== value) mixed = true
        return false
      })
    })
    if (mixed) return null
    return agreed === undefined ? null : agreed
  }

  const $from = selection.$from
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (BLOCK_FONT_TYPES.includes(node.type.name)) {
      return (node.attrs[attr] as string | null) ?? null
    }
  }

  if (selection instanceof TextSelection && selection.from !== selection.to) {
    let agreed: string | null | undefined
    let mixed = false
    doc.nodesBetween(selection.from, selection.to, (node) => {
      if (!BLOCK_FONT_TYPES.includes(node.type.name)) return true
      const value = (node.attrs[attr] as string | null) ?? null
      if (agreed === undefined) agreed = value
      else if (agreed !== value) mixed = true
      return false
    })
    if (!mixed && agreed !== undefined) return agreed
  }

  for (const type of BLOCK_FONT_TYPES) {
    if (editor.isActive(type)) {
      const value = editor.getAttributes(type)[attr] as string | null | undefined
      return value ?? null
    }
  }
  return null
}

/** FontFamily + FontSize marks + block attrs (persist across Enter / lists). */
export const EditorFontExtension = createEditorExtension({
  extension: [FontFamily, FontSize, BlockFont],
  commands: [],
})

function matchFontFamily(current: string | undefined): string {
  if (!current) return DEFAULT_FONT_FAMILY
  const byLabel = FONT_FAMILIES.find((f) => current.includes(f.label))
  if (byLabel) return byLabel.value
  const exact = FONT_FAMILIES.find((f) => f.value === current)
  return exact?.value ?? DEFAULT_FONT_FAMILY
}

export function EditorFontFamilySelect({
  className,
}: {
  className?: string
}) {
  const { editor } = useEditor()

  const resolved =
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) => {
        if (!e) return ""
        const mark =
          (e.getAttributes("textStyle").fontFamily as string | undefined) ?? ""
        const block = activeBlockFont(e, "fontFamily") ?? ""
        return mark || block || ""
      },
    }) ?? ""

  if (!editor) return null

  const value = matchFontFamily(resolved || undefined)

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        editor.chain().focus().run()
        if (next === DEFAULT_FONT_FAMILY) {
          applyDocumentFont(editor, { fontFamily: null })
        } else {
          applyDocumentFont(editor, { fontFamily: next })
        }
      }}
    >
      <SelectTrigger
        aria-label="Font"
        title="Font"
        className={cn("h-8 w-[7rem] shrink-0 shadow-none", className)}
      >
        <SelectValue placeholder={DEFAULT_FONT_LABEL} />
      </SelectTrigger>
      <SelectContent>
        {FONT_FAMILIES.map((font) => (
          <SelectItem
            key={font.value}
            value={font.value}
            style={{ fontFamily: font.value }}
          >
            {font.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function EditorFontSizeSelect({ className }: { className?: string }) {
  const { editor } = useEditor()

  const resolved =
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) => {
        if (!e) return ""
        const mark =
          (e.getAttributes("textStyle").fontSize as string | undefined) ?? ""
        const block = activeBlockFont(e, "fontSize") ?? ""
        return mark || block || ""
      },
    }) ?? ""

  if (!editor) return null

  const known = FONT_SIZES.some((s) => s.value === resolved)
  const value = known ? resolved : DEFAULT_FONT_SIZE

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        editor.chain().focus().run()
        if (next === DEFAULT_FONT_SIZE) {
          applyDocumentFont(editor, { fontSize: null })
        } else {
          applyDocumentFont(editor, { fontSize: next })
        }
      }}
    >
      <SelectTrigger
        aria-label="Ukuran"
        title="Ukuran"
        className={cn("h-8 w-[4.25rem] shrink-0 shadow-none", className)}
      >
        <SelectValue placeholder="12" />
      </SelectTrigger>
      <SelectContent>
        {FONT_SIZES.map((size) => (
          <SelectItem key={size.value} value={size.value}>
            {size.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
