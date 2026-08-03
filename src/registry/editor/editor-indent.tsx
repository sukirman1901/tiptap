"use client"

import { Extension } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { Node } from "@tiptap/pm/model"
import type { Transaction } from "@tiptap/pm/state"
import { AllSelection, TextSelection } from "@tiptap/pm/state"
import { IndentDecrease, IndentIncrease } from "lucide-react"
import { createEditorExtension } from "./editor"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

const MAX_INDENT = 8
const INDENT_TYPES = ["paragraph", "heading", "blockquote"]

function clampIndent(level: number) {
  return Math.max(0, Math.min(MAX_INDENT, level))
}

function setNodeIndentMarkup(
  tr: Transaction,
  pos: number,
  delta: number
): Transaction {
  const node = tr.doc.nodeAt(pos)
  if (!node) return tr

  const current = Number(node.attrs.indent ?? 0)
  const next = clampIndent(current + delta)
  if (next === current) return tr

  return tr.setNodeMarkup(
    pos,
    node.type,
    { ...node.attrs, indent: next },
    node.marks
  )
}

function updateIndentLevel(tr: Transaction, delta: number): Transaction {
  const { selection } = tr
  const { from, to } = selection

  if (selection instanceof TextSelection || selection instanceof AllSelection) {
    tr.doc.nodesBetween(from, to, (node: Node, pos: number) => {
      if (INDENT_TYPES.includes(node.type.name)) {
        tr = setNodeIndentMarkup(tr, pos, delta)
        return false
      }
      return true
    })
  }

  return tr
}

const Indent = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [
      {
        types: INDENT_TYPES,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const value = element.getAttribute("data-indent")
              return value ? Number.parseInt(value, 10) || 0 : 0
            },
            renderHTML: (attributes) => {
              const indent = Number(attributes.indent ?? 0)
              if (!indent) return {}
              return {
                "data-indent": String(indent),
                style: `padding-left: ${indent * 1.5}rem`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const next = updateIndentLevel(tr.setSelection(state.selection), 1)
          if (next.docChanged) {
            dispatch?.(next)
            return true
          }
          return false
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const next = updateIndentLevel(tr.setSelection(state.selection), -1)
          if (next.docChanged) {
            dispatch?.(next)
            return true
          }
          return false
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.sinkListItem("listItem")
        }
        return this.editor.commands.indent()
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.liftListItem("listItem")
        }
        return this.editor.commands.outdent()
      },
    }
  },
})

export const EditorIndentExtension = createEditorExtension({
  extension: Indent,
  commands: [
    {
      key: "indent",
      icon: IndentIncrease,
      label: "Indent",
      description: "Tambah indentasi",
      execute: (editor: Editor) => editor.chain().focus().indent().run(),
      canExecute: () => true,
    },
    {
      key: "outdent",
      icon: IndentDecrease,
      label: "Outdent",
      description: "Kurangi indentasi",
      execute: (editor: Editor) => editor.chain().focus().outdent().run(),
      canExecute: () => true,
    },
  ],
})
