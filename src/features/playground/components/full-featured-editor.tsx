"use client"

/**
 * Full-Featured Editor
 *
 * Contract workspace editor: A4 canvas, formatting toolbar, slash menu,
 * tables/images, and live document variables from the meta form.
 */

import type { Editor } from "@tiptap/react"
import { useState, type ReactNode } from "react"

import {
  EditorBubbleMenu,
  EditorBubbleMenuButton,
  EditorBubbleMenuContent,
  EditorBubbleMenuForm,
  EditorBubbleMenuFormActions,
  EditorBubbleMenuFormCancel,
  EditorBubbleMenuFormSubmit,
  EditorBubbleMenuGroup,
  EditorBubbleMenuInput,
  EditorBubbleMenuPopover,
  EditorBubbleMenuPopoverContent,
  EditorBubbleMenuPopoverTrigger,
  EditorBubbleMenuSeparator,
  EditorButton,
  EditorButtonGroup,
  EditorContent,
  EditorDropdown,
  EditorLabel,
  EditorProvider,
  EditorSeparator,
  EditorToolbar,
  useEditor,
} from "@/registry/editor/editor"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { DocumentCanvas } from "./document-canvas"
import { DUMMY_CONTRACT_CONTENT } from "./dummy-contract-content"
import { ContractMetaForm } from "./contract-meta-form"
import { ContractMetaStoreSync } from "./contract-meta-store"
import { EditorContractVariableExtension } from "./editor-contract-variable"
import { CONTRACT_VARIABLES } from "./contract-variables"
import { type ContractMeta } from "./contract-meta"

import { EditorImageExtension } from "@/registry/editor/editor-image"
import { EditorTableExtensions } from "@/registry/editor/editor-table"

import {
  defaultSlashMenuItems,
  EditorSlashMenuExtension,
} from "@/registry/editor/editor-slash-menu"

import {
  EditorColorExtension,
  EditorColorPicker,
  EditorColorPickerContent,
  EditorColorPickerCustom,
  EditorColorPickerGrid,
  EditorColorPickerIndicator,
  EditorColorPickerItem,
  EditorColorPickerLabel,
  EditorColorPickerTrigger,
  EditorToolbarHighlightColor,
  EditorToolbarTextColor,
} from "@/registry/editor/editor-color"
import { EditorEssentialExtension } from "@/registry/editor/editor-essential"
import {
  EditorFontExtension,
  EditorFontFamilySelect,
  EditorFontSizeSelect,
} from "@/registry/editor/editor-font"
import { EditorHighlightExtension } from "@/registry/editor/editor-highlight"
import { EditorIndentExtension } from "@/registry/editor/editor-indent"
import { EditorLinkExtensions } from "@/registry/editor/editor-link"
import { EditorPageBreakExtension } from "@/registry/editor/editor-page-break"
import { EditorPageGapExtension } from "@/registry/editor/editor-page-gap"
import { EditorPlaceholderExtension } from "@/registry/editor/editor-placeholder"
import { EditorTaskListExtensions } from "@/registry/editor/editor-task-list"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  CheckSquare,
  Code,
  ImageUp,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreVertical,
  Redo,
  SeparatorHorizontal,
  Strikethrough,
  Table,
  Type,
  Underline,
  Undo,
  IndentDecrease,
  IndentIncrease,
  PanelRight,
} from "lucide-react"

// =============================================================================
// Color Palettes (defined at usage place for customization flexibility)
// =============================================================================

const TEXT_COLORS = [
  { name: "default", value: "inherit", label: "Default" },
  { name: "gray", value: "#9b9a97", label: "Gray" },
  { name: "brown", value: "#64473a", label: "Brown" },
  { name: "orange", value: "#d9730d", label: "Orange" },
  { name: "yellow", value: "#cb8700", label: "Yellow" },
  { name: "green", value: "#448361", label: "Green" },
  { name: "blue", value: "#337ea9", label: "Blue" },
  { name: "purple", value: "#9065b0", label: "Purple" },
  { name: "pink", value: "#c14c8a", label: "Pink" },
  { name: "red", value: "#d44c47", label: "Red" },
] as const

const HIGHLIGHT_COLORS = [
  { name: "default", value: "transparent", label: "No background" },
  { name: "gray", value: "#e3e2e0", label: "Gray" },
  { name: "brown", value: "#eee0da", label: "Brown" },
  { name: "orange", value: "#fadec9", label: "Orange" },
  { name: "yellow", value: "#fdecc8", label: "Yellow" },
  { name: "green", value: "#dbeddb", label: "Green" },
  { name: "blue", value: "#d3e5ef", label: "Blue" },
  { name: "purple", value: "#e8deee", label: "Purple" },
  { name: "pink", value: "#f5e0e9", label: "Pink" },
  { name: "red", value: "#ffe2dd", label: "Red" },
] as const

// Bubble menu should show for text selection, excluding tables/images
const shouldShowTextBubbleMenu = ({
  editor,
  from,
  to,
}: {
  editor: Editor
  from: number
  to: number
}) => {
  if (from === to) return false
  if (editor.isActive("table")) return false
  if (editor.isActive("image")) return false
  if (editor.isActive("contractVariable")) return false
  if (editor.isActive("pageBreak")) return false
  return true
}

const slashMenuItems = [
  ...defaultSlashMenuItems,
  {
    title: "Henti halaman",
    description: "Sisipkan page break untuk cetak/PDF",
    icon: SeparatorHorizontal,
    searchTerms: ["page", "break", "henti", "halaman", "pagebreak"],
    command: (editor: Editor | null) => {
      editor?.chain().focus().setPageBreak().run()
    },
  },
  ...CONTRACT_VARIABLES.map((v) => ({
    title: `{${v.token}}`,
    description: `Variabel: ${v.label}`,
    icon: Braces,
    searchTerms: ["var", "variable", "variabel", ...v.searchTerms],
    command: (editor: Editor | null) => {
      editor?.chain().focus().insertContractVariable(v.key).run()
    },
  })),
]

function ToolbarOverflowMenu() {
  const { editor, registry } = useEditor()
  if (!editor) return null

  const run = (action: string) => {
    registry.execute(editor, action)
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Lainnya"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[min(70dvh,24rem)] w-56 overflow-y-auto p-1"
      >
        {/* Tools that hide from the main bar on smaller breakpoints */}
        <div className="lg:hidden">
          <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
            Font
          </DropdownMenuLabel>
          <div
            className="flex gap-1.5 px-2 pb-1.5"
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <EditorFontFamilySelect className="h-8 min-w-0 flex-1 text-xs" />
            <EditorFontSizeSelect className="h-8 w-[5.75rem] shrink-0 text-xs" />
          </div>
          <DropdownMenuSeparator />
        </div>

        <div className="md:hidden">
          <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
            Warna
          </DropdownMenuLabel>
          <div onPointerDown={(e) => e.stopPropagation()}>
            <EditorToolbarTextColor variant="menu" />
            <EditorToolbarHighlightColor variant="menu" />
          </div>
          <DropdownMenuSeparator />
        </div>

        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Format
        </DropdownMenuLabel>
        <div className="sm:hidden">
          <DropdownMenuItem onSelect={() => run("underline")} className="gap-2">
            <Underline className="size-4" />
            Garis bawah
          </DropdownMenuItem>
        </div>
        <DropdownMenuItem onSelect={() => run("strike")} className="gap-2">
          <Strikethrough className="size-4" />
          Coret
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("code")} className="gap-2">
          <Code className="size-4" />
          Kode sebaris
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("outdent")} className="gap-2">
          <IndentDecrease className="size-4" />
          Kurangi indentasi
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("indent")} className="gap-2">
          <IndentIncrease className="size-4" />
          Tambah indentasi
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Perataan
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run("left")} className="gap-2">
          <AlignLeft className="size-4" />
          Kiri
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("center")} className="gap-2">
          <AlignCenter className="size-4" />
          Tengah
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("right")} className="gap-2">
          <AlignRight className="size-4" />
          Kanan
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("justify")} className="gap-2">
          <AlignJustify className="size-4" />
          Rata kiri-kanan
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Daftar
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run("bulletList")} className="gap-2">
          <List className="size-4" />
          Poin
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("orderedList")} className="gap-2">
          <ListOrdered className="size-4" />
          Bernomor
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("taskList")} className="gap-2">
          <CheckSquare className="size-4" />
          Checklist
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Sisipkan
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run("setLink")} className="gap-2">
          <Link2 className="size-4" />
          Tautan
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("image")} className="gap-2">
          <ImageUp className="size-4" />
          Gambar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("insertTable")} className="gap-2">
          <Table className="size-4" />
          Tabel
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("pageBreak")} className="gap-2">
          <SeparatorHorizontal className="size-4" />
          Henti halaman
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface FullFeaturedEditorProps {
  content?: string
  onUpdate?: (html: string) => void
  meta: ContractMeta
  onMetaChange: (next: ContractMeta) => void
  /** Desktop sidebar (lg+). Mobile uses sheet. */
  sidebar?: ReactNode
}

export function FullFeaturedEditor({
  content = DUMMY_CONTRACT_CONTENT,
  onUpdate,
  meta,
  onMetaChange,
  sidebar,
}: FullFeaturedEditorProps) {
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <EditorProvider
      content={content}
      extensions={[
        // Essential extension
        EditorEssentialExtension,

        // Link extension
        EditorLinkExtensions,

        // Task list extension
        EditorTaskListExtensions,

        // Placeholder extension
        EditorPlaceholderExtension,

        // Color extension (includes TextStyle + text color and highlight)
        EditorColorExtension,

        // Font family + size (depends on TextStyle from color extension)
        EditorFontExtension,

        // Indent / outdent
        EditorIndentExtension,

        // Page break
        EditorPageBreakExtension,
        EditorPageGapExtension,

        // Contract merge fields ({nilai}, @nilai, …)
        EditorContractVariableExtension,

        // Highlight extension
        EditorHighlightExtension,

        // Image with base64 upload (for demo, use server upload in production)
        EditorImageExtension.configure({
          uploadStrategy: "base64",
          maxFileSize: 10 * 1024 * 1024, // 10MB
        }),

        // Table with resizable columns
        EditorTableExtensions,

        // Slash menu
        EditorSlashMenuExtension.configure({
          items: slashMenuItems,
        }),
      ]}
      onUpdate={({ editor }) => {
        onUpdate?.(editor.getHTML())
      }}
    >
      <ContractMetaStoreSync meta={meta} />

      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-0 lg:py-4">
        {/* Digdaya-style wrap: toolbar + paper stage in one bordered card */}
        <div className="border-border/60 bg-background flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border lg:min-h-[calc(100dvh-3.5rem-2rem)]">
          <EditorToolbar className="bg-background flex max-w-full shrink-0 flex-nowrap items-center gap-0 border-b px-3 py-1.5 sm:px-4">
              <EditorButtonGroup>
                <EditorButton action="undo">
                  <Undo className="size-4" />
                </EditorButton>
                <EditorButton action="redo">
                  <Redo className="size-4" />
                </EditorButton>
              </EditorButtonGroup>

              <EditorSeparator />

              {/* Block + font — one cluster */}
              <EditorButtonGroup>
                <EditorDropdown
                  actions={[
                    "paragraph",
                    "heading1",
                    "heading2",
                    "heading3",
                    "blockquote",
                  ]}
                >
                  <EditorLabel pattern=":icon :label" />
                </EditorDropdown>
                <EditorFontFamilySelect className="hidden w-[10rem] lg:flex" />
                <EditorFontSizeSelect className="hidden w-[5.25rem] lg:flex" />
              </EditorButtonGroup>

              <EditorSeparator />

              <EditorButtonGroup>
                <EditorButton action="bold">
                  <Bold className="size-4" />
                </EditorButton>
                <EditorButton action="italic">
                  <Italic className="size-4" />
                </EditorButton>
                <EditorButton action="underline" className="max-sm:hidden">
                  <Underline className="size-4" />
                </EditorButton>
                <EditorButton action="strike" className="max-sm:hidden">
                  <Strikethrough className="size-4" />
                </EditorButton>
              </EditorButtonGroup>

              <EditorSeparator className="max-md:hidden" />

              <EditorButtonGroup className="max-md:hidden">
                <EditorToolbarTextColor />
                <EditorToolbarHighlightColor />
              </EditorButtonGroup>

              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 lg:hidden"
                      aria-label="Informasi dokumen"
                      title="Informasi dokumen"
                    >
                      <PanelRight className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-full gap-0 overflow-y-auto p-0 sm:max-w-sm"
                  >
                    <SheetHeader className="sr-only">
                      <SheetTitle>Informasi dokumen</SheetTitle>
                    </SheetHeader>
                    <ContractMetaForm
                      bare
                      meta={meta}
                      onChange={onMetaChange}
                      className="px-4 py-5"
                    />
                  </SheetContent>
                </Sheet>

                <ToolbarOverflowMenu />
              </div>
          </EditorToolbar>

          <DocumentCanvas>
            <EditorContent className="prose dark:prose-invert max-w-none [&_.ProseMirror]:min-h-[40dvh] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:text-justify md:[&_.ProseMirror]:min-h-0" />
          </DocumentCanvas>
        </div>

        <div className="hidden lg:block">{sidebar}</div>

        {/* Composable Bubble Menu for Text Selection */}
        <EditorBubbleMenu shouldShow={shouldShowTextBubbleMenu}>
          <EditorBubbleMenuContent>
            <EditorBubbleMenuGroup>
              <EditorBubbleMenuButton action="bold" title="Bold">
                <Bold className="size-3.5" />
              </EditorBubbleMenuButton>
              <EditorBubbleMenuButton action="italic" title="Italic">
                <Italic className="size-3.5" />
              </EditorBubbleMenuButton>
              <EditorBubbleMenuButton action="underline" title="Underline">
                <Underline className="size-3.5" />
              </EditorBubbleMenuButton>
              <EditorBubbleMenuButton action="strike" title="Strikethrough">
                <Strikethrough className="size-3.5" />
              </EditorBubbleMenuButton>
              <EditorBubbleMenuButton action="code" title="Code">
                <Code className="size-3.5" />
              </EditorBubbleMenuButton>
            </EditorBubbleMenuGroup>

            <EditorBubbleMenuSeparator />

            <EditorColorPicker>
              <EditorColorPickerTrigger>
                <EditorBubbleMenuButton title="Text color" className="relative">
                  <Type className="z-10 size-3.5" />
                  <EditorColorPickerIndicator />
                </EditorBubbleMenuButton>
              </EditorColorPickerTrigger>
              <EditorColorPickerContent align="start">
                <EditorColorPickerLabel>Text Color</EditorColorPickerLabel>
                <EditorColorPickerGrid>
                  {TEXT_COLORS.map((c) => (
                    <EditorColorPickerItem
                      key={c.name}
                      color={c.value}
                      variant="text"
                      title={c.label}
                    />
                  ))}
                  <EditorColorPickerCustom variant="text" />
                </EditorColorPickerGrid>

                <EditorColorPickerLabel>Highlight</EditorColorPickerLabel>
                <EditorColorPickerGrid>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <EditorColorPickerItem
                      key={c.name}
                      color={c.value}
                      variant="highlight"
                      title={c.label}
                    />
                  ))}
                  <EditorColorPickerCustom variant="highlight" />
                </EditorColorPickerGrid>
              </EditorColorPickerContent>
            </EditorColorPicker>

            <EditorBubbleMenuSeparator />

            <EditorBubbleMenuPopover>
              <EditorBubbleMenuPopoverTrigger asChild>
                <EditorBubbleMenuButton title="Add Link">
                  <Link2 className="size-3.5" />
                </EditorBubbleMenuButton>
              </EditorBubbleMenuPopoverTrigger>
              <EditorBubbleMenuPopoverContent align="end">
                <EditorBubbleMenuForm
                  className="flex gap-4"
                  onSubmit={(values, editor) =>
                    editor
                      ?.chain()
                      .focus()
                      .extendMarkRange("link")
                      .setLink({ href: values?.href })
                      .run()
                  }
                >
                  <EditorBubbleMenuInput
                    name="href"
                    binding="link.href"
                    placeholder="https://..."
                    type="url"
                  />
                  <EditorBubbleMenuFormActions>
                    <EditorBubbleMenuFormCancel />
                    <EditorBubbleMenuFormSubmit />
                  </EditorBubbleMenuFormActions>
                </EditorBubbleMenuForm>
              </EditorBubbleMenuPopoverContent>
            </EditorBubbleMenuPopover>
          </EditorBubbleMenuContent>
        </EditorBubbleMenu>
      </div>
    </EditorProvider>
  )
}
