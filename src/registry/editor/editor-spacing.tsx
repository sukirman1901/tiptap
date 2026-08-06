"use client"

import * as React from "react"
import { Extension } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import { useEditorState } from "@tiptap/react"
import type { Node } from "@tiptap/pm/model"
import type { Transaction } from "@tiptap/pm/state"
import { AllSelection, TextSelection } from "@tiptap/pm/state"
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

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spacing: {
      setLineHeight: (lineHeight: string | null) => ReturnType
      setParagraphSpaceBefore: (value: string | null) => ReturnType
      setParagraphSpaceAfter: (value: string | null) => ReturnType
      /** Set before+after in one transaction (avoids chain abort on no-op). */
      setParagraphSpacing: (
        spaceBefore: string | null,
        spaceAfter: string | null
      ) => ReturnType
    }
  }
}

const SPACING_TYPES = ["paragraph", "heading", "blockquote"]

export const LINE_HEIGHTS = [
  { label: "1", value: "1" },
  { label: "1,15", value: "1.15" },
  { label: "1,5", value: "1.5" },
  { label: "2", value: "2" },
  { label: "2,5", value: "2.5" },
  { label: "3", value: "3" },
] as const

export const DEFAULT_LINE_HEIGHT = "1.15" as const

/** Paragraph spacing after the block (pt). */
export const PARAGRAPH_SPACES = [
  { label: "0", value: "0" },
  { label: "6", value: "6pt" },
  { label: "12", value: "12pt" },
  { label: "18", value: "18pt" },
  { label: "24", value: "24pt" },
] as const

export const DEFAULT_PARAGRAPH_SPACE = "0" as const

type SpacingAttr = "lineHeight" | "spaceBefore" | "spaceAfter"

function patchSpacingMarkup(
  tr: Transaction,
  pos: number,
  patch: Partial<Record<SpacingAttr, string | null>>
): Transaction {
  const mapped = tr.mapping.map(pos)
  const node = tr.doc.nodeAt(mapped)
  if (!node) return tr
  const nextAttrs = { ...node.attrs }
  let changed = false
  for (const key of Object.keys(patch) as SpacingAttr[]) {
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

/** Collect spacing-block positions from the current selection (snapshot). */
function collectSpacingPositions(tr: Transaction): number[] {
  const { selection } = tr
  const positions: number[] = []

  if (selection instanceof CellSelection) {
    selection.forEachCell((cell, cellPos) => {
      const walk = (node: Node, pos: number) => {
        if (SPACING_TYPES.includes(node.type.name)) {
          positions.push(pos)
          return
        }
        node.forEach((child, offset) => walk(child, pos + 1 + offset))
      }
      walk(cell, cellPos)
    })
    return positions
  }

  if (selection instanceof TextSelection || selection instanceof AllSelection) {
    const { from, to } = selection
    tr.doc.nodesBetween(from, to, (node: Node, pos: number) => {
      if (SPACING_TYPES.includes(node.type.name)) {
        positions.push(pos)
        return false
      }
      return true
    })

    if (positions.length === 0 && from === to) {
      const $pos = tr.selection.$from
      for (let d = $pos.depth; d > 0; d--) {
        if (!SPACING_TYPES.includes($pos.node(d).type.name)) continue
        positions.push($pos.before(d))
        break
      }
    }
  }

  return positions
}

function updateSpacingInSelection(
  tr: Transaction,
  patch: Partial<Record<SpacingAttr, string | null>>
): Transaction {
  const positions = collectSpacingPositions(tr)
  for (const pos of positions) {
    tr = patchSpacingMarkup(tr, pos, patch)
  }
  return tr
}

function spacingCommand(patch: Partial<Record<SpacingAttr, string | null>>) {
  return ({
    tr,
    state,
    dispatch,
  }: {
    tr: Transaction
    state: { selection: Transaction["selection"] }
    dispatch?: (tr: Transaction) => void
  }) => {
    const next = updateSpacingInSelection(
      tr.setSelection(state.selection),
      patch
    )
    if (next.docChanged) {
      dispatch?.(next)
      return true
    }
    return false
  }
}

const Spacing = Extension.create({
  name: "spacing",

  addGlobalAttributes() {
    return [
      {
        types: SPACING_TYPES,
        attributes: {
          lineHeight: {
            default: null,
            keepOnSplit: true,
            parseHTML: (element) => {
              const data = element.getAttribute("data-line-height")
              if (data) return data
              return element.style.lineHeight || null
            },
            renderHTML: (attributes) => {
              const lineHeight = attributes.lineHeight as string | null
              if (lineHeight == null || lineHeight === "") return {}
              return {
                "data-line-height": lineHeight,
                style: `line-height: ${lineHeight}`,
              }
            },
          },
          spaceBefore: {
            default: null,
            keepOnSplit: true,
            parseHTML: (element) => {
              const data = element.getAttribute("data-space-before")
              if (data != null) return data
              const mt = element.style.marginTop
              return mt || null
            },
            renderHTML: (attributes) => {
              const spaceBefore = attributes.spaceBefore as string | null
              // Explicit "0" must still emit margin-top: 0 (falsy-check would skip it).
              if (spaceBefore == null || spaceBefore === "") return {}
              return {
                "data-space-before": spaceBefore,
                style: `margin-top: ${spaceBefore}`,
              }
            },
          },
          spaceAfter: {
            default: null,
            keepOnSplit: true,
            parseHTML: (element) => {
              const data = element.getAttribute("data-space-after")
              if (data != null) return data
              const mb = element.style.marginBottom
              return mb || null
            },
            renderHTML: (attributes) => {
              const spaceAfter = attributes.spaceAfter as string | null
              if (spaceAfter == null || spaceAfter === "") return {}
              return {
                "data-space-after": spaceAfter,
                style: `margin-bottom: ${spaceAfter}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        (props) =>
          spacingCommand({ lineHeight })(props),
      setParagraphSpaceBefore:
        (value) =>
        (props) =>
          spacingCommand({ spaceBefore: value })(props),
      setParagraphSpaceAfter:
        (value) =>
        (props) =>
          spacingCommand({ spaceAfter: value })(props),
      setParagraphSpacing:
        (spaceBefore, spaceAfter) =>
        (props) =>
          spacingCommand({ spaceBefore, spaceAfter })(props),
    }
  },
})

export const EditorSpacingExtension = createEditorExtension({
  extension: Spacing,
  commands: [],
})

function spacingAttrFromBlock(node: Node, attr: SpacingAttr): string | null {
  return (node.attrs[attr] as string | null) ?? null
}

/** First spacing block inside a cell (or the cell itself). */
function spacingAttrInTree(node: Node, attr: SpacingAttr): string | null | undefined {
  if (SPACING_TYPES.includes(node.type.name)) {
    return spacingAttrFromBlock(node, attr)
  }
  let found: string | null | undefined
  node.descendants((child) => {
    if (!SPACING_TYPES.includes(child.type.name)) return true
    found = spacingAttrFromBlock(child, attr)
    return false
  })
  return found
}

/**
 * Read spacing from the real selection — including table CellSelection,
 * where `isActive("paragraph")` is false and getAttributes() is empty.
 */
function activeBlockAttr(
  editor: Editor | null,
  attr: SpacingAttr
): string | null {
  if (!editor) return null
  const { selection, doc } = editor.state

  if (selection instanceof CellSelection) {
    let agreed: string | null | undefined
    let mixed = false
    selection.forEachCell((cell) => {
      if (mixed) return
      const value = spacingAttrInTree(cell, attr)
      if (value === undefined) return
      if (agreed === undefined) agreed = value
      else if (agreed !== value) mixed = true
    })
    if (mixed) return null
    return agreed === undefined ? null : agreed
  }

  const $from = selection.$from
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (SPACING_TYPES.includes(node.type.name)) {
      return spacingAttrFromBlock(node, attr)
    }
  }

  if (selection instanceof TextSelection && selection.from !== selection.to) {
    let found: string | null | undefined
    doc.nodesBetween(selection.from, selection.to, (node) => {
      if (!SPACING_TYPES.includes(node.type.name)) return true
      const value = spacingAttrFromBlock(node, attr)
      if (found === undefined) found = value
      else if (found !== value) {
        found = null
        return false
      }
      return false
    })
    if (found !== undefined) return found
  }

  for (const type of SPACING_TYPES) {
    if (editor.isActive(type)) {
      const value = editor.getAttributes(type)[attr] as string | null | undefined
      return value ?? null
    }
  }
  return null
}

export function EditorLineHeightSelect({
  className,
}: {
  className?: string
}) {
  const { editor } = useEditor()

  const lineHeight =
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) => activeBlockAttr(e, "lineHeight") ?? "",
    }) ?? ""

  if (!editor) return null

  const known = LINE_HEIGHTS.some((o) => o.value === lineHeight)
  const value = known ? lineHeight : DEFAULT_LINE_HEIGHT

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next === DEFAULT_LINE_HEIGHT) {
          editor.chain().focus().setLineHeight(null).run()
        } else {
          editor.chain().focus().setLineHeight(next).run()
        }
      }}
    >
      <SelectTrigger
        aria-label="Spasi baris"
        title="Spasi baris"
        className={cn("h-8 w-[4.5rem] shrink-0 shadow-none", className)}
      >
        <SelectValue placeholder={DEFAULT_LINE_HEIGHT.replace(".", ",")} />
      </SelectTrigger>
      <SelectContent>
        {LINE_HEIGHTS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function EditorParagraphSpaceSelect({
  className,
}: {
  className?: string
}) {
  const { editor } = useEditor()

  const spaceAfter =
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) => activeBlockAttr(e, "spaceAfter") ?? "",
    }) ?? ""

  if (!editor) return null

  const known = PARAGRAPH_SPACES.some((o) => o.value === spaceAfter)
  const value = known ? spaceAfter : DEFAULT_PARAGRAPH_SPACE

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        // One command = one transaction. Chaining setBefore+setAfter aborts when
        // before is already "0", so Ctrl+A / re-apply would not update after.
        editor.chain().focus().setParagraphSpacing("0", next).run()
      }}
    >
      <SelectTrigger
        aria-label="Spasi paragraf"
        title="Spasi setelah paragraf"
        className={cn("h-8 w-[4.25rem] shrink-0 shadow-none", className)}
      >
        <SelectValue placeholder="0" />
      </SelectTrigger>
      <SelectContent>
        {PARAGRAPH_SPACES.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
