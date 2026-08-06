"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { DropdownMenuContent as DropdownMenuContentPrimitive } from "@radix-ui/react-dropdown-menu"
import { Table, TableView } from "@tiptap/extension-table"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableRow } from "@tiptap/extension-table-row"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { BubbleMenu, useEditorState, type Editor } from "@tiptap/react"
import { Table as TableIcon } from "lucide-react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ChevronDown,
  Columns3,
  Combine,
  Grid2x2,
  Rows3,
  Split,
  Square,
  TableProperties,
  Trash2,
} from "lucide-react"
import * as React from "react"
import { EditorContext, createEditorExtension, EDITOR_BUBBLE_TIPPY_OPTIONS } from "./editor"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableBorders: {
      /** Show or hide visible cell borders (layout / alignment tables). */
      toggleTableBorders: () => ReturnType
      setTableBorders: (withBorders: boolean) => ReturnType
    }
  }
}

const TABLE_BASE_CLASS = cn(
  "w-full caption-bottom text-sm my-4 border-collapse table-fixed",
  "[&.resize-cursor]:cursor-col-resize"
)

/**
 * TipTap's default TableView (used when resizable) builds a bare <table>
 * and ignores HTMLAttributes / custom attrs — so data-borders never hit the DOM.
 */
class BorderAwareTableView extends TableView {
  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth)
    this.syncDom(node)
  }

  update(node: ProseMirrorNode) {
    const ok = super.update(node)
    if (ok) this.syncDom(node)
    return ok
  }

  private syncDom(node: ProseMirrorNode) {
    this.table.className = TABLE_BASE_CLASS
    this.table.dataset.borders =
      node.attrs.withBorders === false ? "false" : "true"
  }
}

/** Shared: hide grid when data-borders=false (editor + preview). */
export const TABLE_BORDER_STYLES = `
  table[data-borders="false"] td,
  table[data-borders="false"] th {
    border-color: transparent !important;
    background-color: transparent !important;
    color: inherit !important;
    font-weight: inherit !important;
  }
  table[data-borders="false"] thead,
  table[data-borders="false"] tbody tr {
    border-color: transparent !important;
  }
  /* Contract tables: header row reads as body text, not UI chrome */
  .ProseMirror th,
  .contract-doc-preview th {
    color: inherit;
    font-weight: inherit;
    background-color: transparent;
  }
`

/** Editor-only: scope under ProseMirror (legacy selector kept for clarity). */
const EDITOR_TABLE_BORDER_STYLES = `
  .ProseMirror table[data-borders="false"] td,
  .ProseMirror table[data-borders="false"] th {
    border-color: transparent !important;
    background-color: transparent !important;
    color: inherit !important;
    font-weight: inherit !important;
  }
  .ProseMirror table[data-borders="false"] thead,
  .ProseMirror table[data-borders="false"] tbody tr {
    border-color: transparent !important;
  }
  .ProseMirror th {
    color: inherit;
    font-weight: inherit;
    background-color: transparent;
  }
`

// =============================================================================
// EditorTableExtension
// =============================================================================

export interface EditorTableOptions {
  resizable?: boolean
  HTMLAttributes?: Record<string, unknown>
}

export const EditorTableExtension = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      withBorders: {
        default: true,
        parseHTML: (element) =>
          element.getAttribute("data-borders") !== "false",
        renderHTML: (attributes) => ({
          "data-borders":
            attributes.withBorders === false ? "false" : "true",
        }),
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      toggleTableBorders:
        () =>
        ({ commands, editor }) => {
          if (!editor.isActive("table")) return false
          const withBorders =
            editor.getAttributes("table").withBorders !== false
          return commands.updateAttributes("table", {
            withBorders: !withBorders,
          })
        },
      setTableBorders:
        (withBorders: boolean) =>
        ({ commands, editor }) => {
          if (!editor.isActive("table")) return false
          return commands.updateAttributes("table", { withBorders })
        },
    }
  },
}).configure({
  resizable: true,
  View: BorderAwareTableView,
  HTMLAttributes: {
    class: TABLE_BASE_CLASS,
  },
})

function TableBorderStyle() {
  return (
    <style dangerouslySetInnerHTML={{ __html: EDITOR_TABLE_BORDER_STYLES }} />
  )
}

export const EditorTableRowExtension = TableRow.configure({
  HTMLAttributes: {
    class:
      "transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
  },
})

export const EditorTableHeaderExtension = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: (element) =>
          element.style.textAlign || element.getAttribute("data-text-align"),
        renderHTML: (attributes) => {
          if (!attributes.textAlign) return {}
          return {
            style: `text-align: ${attributes.textAlign}`,
            "data-text-align": attributes.textAlign,
          }
        },
      },
      verticalAlign: {
        default: null,
        parseHTML: (element) =>
          element.style.verticalAlign ||
          element.getAttribute("data-vertical-align"),
        renderHTML: (attributes) => {
          if (!attributes.verticalAlign) return {}
          return {
            style: `vertical-align: ${attributes.verticalAlign}`,
            "data-vertical-align": attributes.verticalAlign,
          }
        },
      },
    }
  },
}).configure({
  HTMLAttributes: {
    class: cn(
      // Document-tight cells: no min-height / fat padding (Word-like identity tables)
      "px-1 py-0 text-left align-top",
      "border border-border",
      "relative box-border min-w-[1em]",
      "[&>p]:m-0",
      // Selected cell overlay using Tailwind after: pseudo-element
      "[&.selectedCell]:after:content-[''] [&.selectedCell]:after:absolute [&.selectedCell]:after:inset-0",
      "[&.selectedCell]:after:bg-primary [&.selectedCell]:after:opacity-[0.08] [&.selectedCell]:after:pointer-events-none"
    ),
  },
})

export const EditorTableCellExtension = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: (element) =>
          element.style.textAlign || element.getAttribute("data-text-align"),
        renderHTML: (attributes) => {
          if (!attributes.textAlign) return {}
          return {
            style: `text-align: ${attributes.textAlign}`,
            "data-text-align": attributes.textAlign,
          }
        },
      },
      verticalAlign: {
        default: null,
        parseHTML: (element) =>
          element.style.verticalAlign ||
          element.getAttribute("data-vertical-align"),
        renderHTML: (attributes) => {
          if (!attributes.verticalAlign) return {}
          return {
            style: `vertical-align: ${attributes.verticalAlign}`,
            "data-vertical-align": attributes.verticalAlign,
          }
        },
      },
    }
  },
}).configure({
  HTMLAttributes: {
    class: cn(
      // Document-tight cells: spacing controls own paragraph margins; padding stays minimal
      "px-1 py-0 align-top border border-border",
      "relative box-border min-w-[1em]",
      "[&>p]:m-0",
      // Selected cell overlay using Tailwind after: pseudo-element
      "[&.selectedCell]:after:content-[''] [&.selectedCell]:after:absolute [&.selectedCell]:after:inset-0",
      "[&.selectedCell]:after:bg-primary [&.selectedCell]:after:opacity-[0.08] [&.selectedCell]:after:pointer-events-none"
    ),
  },
})

export const EditorTableExtensions = createEditorExtension({
  extension: [
    EditorTableExtension,
    EditorTableRowExtension,
    EditorTableHeaderExtension,
    EditorTableCellExtension,
  ],
  bubbleMenu: EditorBubbleMenuTable,
  commands: [
    {
      key: "insertTable",
      icon: TableIcon,
      label: "Sisipkan tabel",
      description: "Sisipkan tabel baru",
      execute: (editor: Editor) =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
    },
    {
      key: "addColumnBefore",
      label: "Kolom sebelum",
      execute: (editor: Editor) =>
        editor.chain().focus().addColumnBefore().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().addColumnBefore().run(),
    },
    {
      key: "addColumnAfter",
      label: "Kolom sesudah",
      execute: (editor: Editor) =>
        editor.chain().focus().addColumnAfter().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().addColumnAfter().run(),
    },
    {
      key: "deleteColumn",
      label: "Hapus kolom",
      execute: (editor: Editor) => editor.chain().focus().deleteColumn().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().deleteColumn().run(),
    },
    {
      key: "addRowBefore",
      label: "Baris sebelum",
      execute: (editor: Editor) => editor.chain().focus().addRowBefore().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().addRowBefore().run(),
    },
    {
      key: "addRowAfter",
      label: "Baris sesudah",
      execute: (editor: Editor) => editor.chain().focus().addRowAfter().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().addRowAfter().run(),
    },
    {
      key: "deleteRow",
      label: "Hapus baris",
      execute: (editor: Editor) => editor.chain().focus().deleteRow().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().deleteRow().run(),
    },
    {
      key: "deleteTable",
      label: "Hapus tabel",
      execute: (editor: Editor) => editor.chain().focus().deleteTable().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().deleteTable().run(),
    },
    {
      key: "mergeCells",
      label: "Gabung sel",
      execute: (editor: Editor) => editor.chain().focus().mergeCells().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().mergeCells().run(),
    },
    {
      key: "splitCell",
      label: "Pisah sel",
      execute: (editor: Editor) => editor.chain().focus().splitCell().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().splitCell().run(),
    },
    {
      key: "toggleHeaderColumn",
      label: "Header kolom",
      execute: (editor: Editor) =>
        editor.chain().focus().toggleHeaderColumn().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().toggleHeaderColumn().run(),
    },
    {
      key: "toggleHeaderRow",
      label: "Header baris",
      execute: (editor: Editor) =>
        editor.chain().focus().toggleHeaderRow().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().toggleHeaderRow().run(),
    },
    {
      key: "toggleHeaderCell",
      label: "Header sel",
      execute: (editor: Editor) =>
        editor.chain().focus().toggleHeaderCell().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().toggleHeaderCell().run(),
    },
    {
      key: "toggleTableBorders",
      icon: Grid2x2,
      label: "Alihkan garis",
      description: "Tampilkan atau sembunyikan garis tabel",
      execute: (editor: Editor) =>
        editor.chain().focus().toggleTableBorders().run(),
      canExecute: (editor: Editor) => editor.isActive("table"),
    },
    {
      key: "mergeOrSplit",
      label: "Gabung atau pisah",
      execute: (editor: Editor) => editor.chain().focus().mergeOrSplit().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().mergeOrSplit().run(),
    },
    {
      key: "goToNextCell",
      label: "Sel berikutnya",
      execute: (editor: Editor) => editor.chain().focus().goToNextCell().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().goToNextCell().run(),
    },
    {
      key: "goToPreviousCell",
      label: "Sel sebelumnya",
      execute: (editor: Editor) =>
        editor.chain().focus().goToPreviousCell().run(),
      canExecute: (editor: Editor) =>
        editor.can().chain().focus().goToPreviousCell().run(),
    },
  ],
})

// =============================================================================
// EditorBubbleMenuTable
// =============================================================================

export interface EditorBubbleMenuTableProps extends Omit<
  React.ComponentProps<typeof BubbleMenu>,
  "editor" | "children"
> {}

export function EditorBubbleMenuTable(props: EditorBubbleMenuTableProps) {
  const ctx = React.useContext(EditorContext)
  const editor = ctx?.editor

  const {
    canMergeCells = false,
    canSplitCell = false,
    canDeleteColumn = false,
    canDeleteRow = false,
    withBorders = true,
  } = useEditorState({
    editor: editor ?? null,
    selector: ({
      editor: e,
    }): {
      canMergeCells: boolean
      canSplitCell: boolean
      canDeleteColumn: boolean
      canDeleteRow: boolean
      withBorders: boolean
    } => {
      if (!e) {
        return {
          canMergeCells: false,
          canSplitCell: false,
          canDeleteColumn: false,
          canDeleteRow: false,
          withBorders: true,
        }
      }
      return {
        canMergeCells: e.can().mergeCells(),
        canSplitCell: e.can().splitCell(),
        canDeleteColumn: e.can().deleteColumn(),
        canDeleteRow: e.can().deleteRow(),
        withBorders: e.getAttributes("table").withBorders !== false,
      }
    },
  }) ?? {}

  if (!editor) return null

  return (
    <>
      <TableBorderStyle />
      <BubbleMenu
      {...props}
      editor={editor}
      tippyOptions={{
        ...EDITOR_BUBBLE_TIPPY_OPTIONS,
        placement: "bottom",
        getReferenceClientRect: () => {
          const { view, state } = editor
          const domAtPos = view.domAtPos(state.selection.from)
          const node = domAtPos.node
          const tableElement =
            node instanceof Element
              ? node.closest("table")
              : node.parentElement?.closest("table")
          if (tableElement) {
            return tableElement.getBoundingClientRect()
          }
          return view.dom.getBoundingClientRect()
        },
      }}
      shouldShow={({ editor: e }) => e.isActive("table")}
      className="w-fit"
    >
      <div className="bg-popover text-popover-foreground flex items-center gap-0.5 rounded-md border p-0.5 shadow-md">
        {/* Column Actions */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
            >
              <Columns3 className="size-3.5" />
              Kolom
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContentPrimitive
            align="start"
            sideOffset={8}
            className={cn(
              "min-w-[160px]",
              "bg-popover text-popover-foreground z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]"
            )}
          >
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
            >
              <TableProperties className="mr-2 size-3.5" />
              Header
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
              <ArrowLeftToLine className="mr-2 size-3.5" />
              Sisipkan sebelum
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <ArrowRightToLine className="mr-2 size-3.5" />
              Sisipkan sesudah
            </DropdownMenuItem>
            <div className="bg-border my-1 h-px" />
            <DropdownMenuItem
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("textAlign", "left")
                  .run()
              }
            >
              <AlignLeft className="mr-2 size-3.5" />
              Rata kiri
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("textAlign", "center")
                  .run()
              }
            >
              <AlignCenter className="mr-2 size-3.5" />
              Rata tengah
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("textAlign", "right")
                  .run()
              }
            >
              <AlignRight className="mr-2 size-3.5" />
              Rata kanan
            </DropdownMenuItem>
            <div className="bg-border my-1 h-px" />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-3.5" />
              Hapus kolom
            </DropdownMenuItem>
          </DropdownMenuContentPrimitive>
        </DropdownMenu>

        {/* Row Actions */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
            >
              <Rows3 className="size-3.5" />
              Baris
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContentPrimitive
            align="start"
            sideOffset={8}
            className={cn(
              "min-w-[160px]",
              "bg-popover text-popover-foreground z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]"
            )}
          >
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            >
              <TableProperties className="mr-2 size-3.5" />
              Header
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
              <ArrowUpToLine className="mr-2 size-3.5" />
              Sisipkan di atas
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <ArrowDownToLine className="mr-2 size-3.5" />
              Sisipkan di bawah
            </DropdownMenuItem>

            <div className="bg-border my-1 h-px" />
            <DropdownMenuItem
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("verticalAlign", "top")
                  .run()
              }
            >
              <AlignVerticalJustifyStart className="mr-2 size-3.5" />
              Atas
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("verticalAlign", "middle")
                  .run()
              }
            >
              <AlignVerticalJustifyCenter className="mr-2 size-3.5" />
              Tengah
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("verticalAlign", "bottom")
                  .run()
              }
            >
              <AlignVerticalJustifyEnd className="mr-2 size-3.5" />
              Bawah
            </DropdownMenuItem>
            <div className="bg-border my-1 h-px" />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-3.5" />
              Hapus baris
            </DropdownMenuItem>
          </DropdownMenuContentPrimitive>
        </DropdownMenu>

        {/* Cell Actions */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
            >
              <Combine className="size-3.5" />
              Sel
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContentPrimitive
            align="start"
            sideOffset={8}
            className={cn(
              "min-w-[160px]",
              "bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            <DropdownMenuItem
              onClick={() => editor.chain().focus().mergeCells().run()}
              disabled={!canMergeCells}
            >
              <Combine className="mr-2 size-3.5" />
              Gabung sel
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().splitCell().run()}
              disabled={!canSplitCell}
            >
              <Split className="mr-2 size-3.5" />
              Pisah sel
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeaderCell().run()}
            >
              <TableProperties className="mr-2 size-3.5" />
              Header sel
            </DropdownMenuItem>
          </DropdownMenuContentPrimitive>
        </DropdownMenu>

        {/* Borders — layout tables often hide the grid */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1 px-2 text-xs",
            !withBorders && "bg-accent text-accent-foreground"
          )}
          onClick={() => editor.chain().focus().toggleTableBorders().run()}
          title={withBorders ? "Sembunyikan garis" : "Tampilkan garis"}
        >
          {withBorders ? (
            <Grid2x2 className="size-3.5" />
          ) : (
            <Square className="size-3.5" />
          )}
          Garis
        </Button>

        {/* Quick Delete Actions */}
        <div className="ml-0.5 flex items-center gap-0.5 border-l pl-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 gap-1 px-2 text-xs"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={!canDeleteColumn}
            title="Hapus kolom"
          >
            <Columns3 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 gap-1 px-2 text-xs"
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={!canDeleteRow}
            title="Hapus baris"
          >
            <Rows3 className="size-3.5" />
          </Button>
        </div>

        {/* Delete Table */}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
          onClick={() => editor.chain().focus().deleteTable().run()}
          title="Hapus tabel"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </BubbleMenu>
    </>
  )
}
