"use client"

/**
 * Priority overflow toolbar — DOM-measured.
 * Groups that don't fit the slot move into ⋮. No width estimates.
 */

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

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
  EditorButton,
  EditorButtonGroup,
  EditorDropdown,
  EditorLabel,
  EditorSeparator,
  EditorToolbar,
  useEditor,
} from "@/registry/editor/editor"
import {
  EditorToolbarHighlightColor,
  EditorToolbarTextColor,
} from "@/registry/editor/editor-color"
import {
  EditorFontFamilySelect,
  EditorFontSizeSelect,
} from "@/registry/editor/editor-font"
import {
  EditorLineHeightSelect,
  EditorParagraphSpaceSelect,
} from "@/registry/editor/editor-spacing"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  ImageUp,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreVertical,
  PanelRight,
  Redo,
  SeparatorHorizontal,
  Strikethrough,
  Table,
  Underline,
  Undo,
} from "lucide-react"

/**
 * Priority for the bar (left → right). After font: warna + daftar (sering
 * dipakai), lalu align/spacing/… Packing skips groups that don't fit.
 */
const GROUP_ORDER = [
  "history",
  "block",
  "marksCore",
  "marksExtra",
  "font",
  "color",
  "list",
  "align",
  "spacing",
  "insert",
  "indent",
] as const

type GroupId = (typeof GROUP_ORDER)[number]

/** Minimum chrome — everything else is measured in/out of ⋮. */
const ALWAYS_VISIBLE: ReadonlySet<GroupId> = new Set(["history", "block"])

/** Prefer exact fit; clipping guarded by overflow-hidden + skip-if-over. */
const FIT_SAFETY_PX = 0

function setsEqual(a: ReadonlySet<GroupId>, b: ReadonlySet<GroupId>) {
  if (a.size !== b.size) return false
  for (const id of b) if (!a.has(id)) return false
  return true
}

function readMeasuredWidths(measureRoot: HTMLElement): {
  widths: Map<GroupId, number>
  sep: number
} {
  const widths = new Map<GroupId, number>()
  measureRoot.querySelectorAll<HTMLElement>("[data-toolbar-group]").forEach((el) => {
    const id = el.dataset.toolbarGroup as GroupId | undefined
    if (!id) return
    widths.set(id, el.getBoundingClientRect().width)
  })
  const sepEl = measureRoot.querySelector<HTMLElement>("[data-toolbar-sep]")
  const sep = sepEl?.getBoundingClientRect().width ?? 17
  return { widths, sep }
}

function computeVisibleFromWidths(
  availablePx: number,
  widths: Map<GroupId, number>,
  sep: number
): Set<GroupId> {
  const budget = Math.max(0, availablePx - FIT_SAFETY_PX)
  const next = new Set<GroupId>()
  let used = 0

  for (const id of GROUP_ORDER) {
    if (!ALWAYS_VISIBLE.has(id)) continue
    const w = widths.get(id) ?? 0
    const extra = next.size > 0 ? sep : 0
    used += extra + w
    next.add(id)
  }

  // Skip groups that don't fit — keep trying smaller later ones (fill gaps).
  for (const id of GROUP_ORDER) {
    if (ALWAYS_VISIBLE.has(id)) continue
    const w = widths.get(id) ?? 0
    const need = sep + w
    if (used + need > budget) continue
    used += need
    next.add(id)
  }

  return next
}

export function ContractEditorToolbar({
  onOpenMobilePanel,
  commentCount = 0,
}: {
  /** Opens Properti/Komentar sheet on small screens */
  onOpenMobilePanel?: () => void
  commentCount?: number
}) {
  const { editor, registry } = useEditor()
  const [visible, setVisible] = useState<ReadonlySet<GroupId>>(
    () => new Set(ALWAYS_VISIBLE)
  )

  const slotRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  const recompute = useCallback(() => {
    const slot = slotRef.current
    const measure = measureRef.current
    if (!slot || !measure) return

    const available = slot.clientWidth
    if (available <= 0) return

    const { widths, sep } = readMeasuredWidths(measure)
    if (widths.size === 0) return

    const next = computeVisibleFromWidths(available, widths, sep)
    setVisible((prev) => (setsEqual(prev, next) ? prev : next))
  }, [])

  useLayoutEffect(() => {
    if (!editor) return

    recompute()
    // Selects/fonts may settle one frame later — remeasure once.
    const raf = requestAnimationFrame(() => recompute())

    const slot = slotRef.current
    const measure = measureRef.current
    if (!slot || typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(raf)
    }

    const ro = new ResizeObserver(() => recompute())
    ro.observe(slot)
    if (measure) ro.observe(measure)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [editor, recompute])

  if (!editor) return null

  const run = (action: string) => registry.execute(editor, action)
  const overflowIds = GROUP_ORDER.filter((id) => !visible.has(id))

  return (
    <EditorToolbar
      className="bg-background relative flex max-w-full min-w-0 shrink-0 items-center gap-0 border-b px-2 py-1.5 sm:px-3"
      data-toolbar-visible={[...visible].join(",")}
    >
      {/*
        Off-screen measure rail: real controls, natural widths.
        Never use hardcoded px guesses for overflow decisions.
      */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none fixed top-0 -left-[9999px] z-[-1] flex items-center"
      >
        <GroupBodies mode="measure" />
        <EditorSeparator data-toolbar-sep />
      </div>

      <div
        ref={slotRef}
        className="flex min-w-0 flex-1 items-center gap-0 overflow-hidden"
      >
        <GroupBodies mode="bar" visible={visible} />
      </div>

      <div className="border-border/50 ml-1 flex shrink-0 items-center gap-0.5 border-l pl-1 sm:ml-2 sm:pl-2">
        {onOpenMobilePanel && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative size-8 shrink-0 lg:hidden"
            aria-label="Panel dokumen"
            title="Properti & komentar"
            onClick={onOpenMobilePanel}
          >
            <PanelRight className="size-4" />
            {commentCount > 0 && (
              <span className="bg-amber-600 absolute top-1 right-1 size-1.5 rounded-full" />
            )}
          </Button>
        )}

        <OverflowMenu overflowIds={overflowIds} run={run} />
      </div>
    </EditorToolbar>
  )
}

function GroupBodies({
  mode,
  visible,
}: {
  mode: "bar" | "measure"
  visible?: ReadonlySet<GroupId>
}) {
  const show = (id: GroupId) =>
    mode === "measure" ? true : Boolean(visible?.has(id))

  const nodes: ReactNode[] = []

  const push = (id: GroupId, node: ReactNode) => {
    if (!show(id)) return
    if (mode === "bar" && nodes.length > 0) {
      nodes.push(<EditorSeparator key={`sep-${id}`} />)
    }
    nodes.push(
      <EditorButtonGroup
        key={id}
        data-toolbar-group={id}
        className="shrink-0"
      >
        {node}
      </EditorButtonGroup>
    )
  }

  push(
    "history",
    <>
      <EditorButton action="undo">
        <Undo className="size-4" />
      </EditorButton>
      <EditorButton action="redo">
        <Redo className="size-4" />
      </EditorButton>
    </>
  )

  push(
    "block",
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
  )

  push(
    "marksCore",
    <>
      <EditorButton action="bold">
        <Bold className="size-4" />
      </EditorButton>
      <EditorButton action="italic">
        <Italic className="size-4" />
      </EditorButton>
    </>
  )

  push(
    "marksExtra",
    <>
      <EditorButton action="underline">
        <Underline className="size-4" />
      </EditorButton>
      <EditorButton action="strike">
        <Strikethrough className="size-4" />
      </EditorButton>
    </>
  )

  push(
    "font",
    <>
      <EditorFontFamilySelect className="w-[7rem]" />
      <EditorFontSizeSelect className="w-[4.25rem]" />
    </>
  )

  push(
    "color",
    <>
      <EditorToolbarTextColor />
      <EditorToolbarHighlightColor />
    </>
  )

  push(
    "list",
    <>
      <EditorButton action="bulletList">
        <List className="size-4" />
      </EditorButton>
      <EditorButton action="orderedList">
        <ListOrdered className="size-4" />
      </EditorButton>
    </>
  )

  push(
    "align",
    <>
      <EditorButton action="left">
        <AlignLeft className="size-4" />
      </EditorButton>
      <EditorButton action="justify">
        <AlignJustify className="size-4" />
      </EditorButton>
    </>
  )

  push(
    "spacing",
    <>
      <EditorLineHeightSelect />
      <EditorParagraphSpaceSelect />
    </>
  )

  push(
    "insert",
    <>
      <EditorButton action="setLink">
        <Link2 className="size-4" />
      </EditorButton>
      <EditorButton action="image">
        <ImageUp className="size-4" />
      </EditorButton>
      <EditorButton action="insertTable">
        <Table className="size-4" />
      </EditorButton>
      <EditorButton action="pageBreak">
        <SeparatorHorizontal className="size-4" />
      </EditorButton>
    </>
  )

  push(
    "indent",
    <>
      <EditorButton action="outdent">
        <IndentDecrease className="size-4" />
      </EditorButton>
      <EditorButton action="indent">
        <IndentIncrease className="size-4" />
      </EditorButton>
    </>
  )

  return <>{nodes}</>
}

function OverflowMenu({
  overflowIds,
  run,
}: {
  overflowIds: GroupId[]
  run: (action: string) => void
}) {
  const has = (id: GroupId) => overflowIds.includes(id)
  const sections: ReactNode[] = []

  if (has("font")) {
    sections.push(
      <div key="font">
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Font
        </DropdownMenuLabel>
        <div
          className="flex gap-1.5 px-2 pb-1.5"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <EditorFontFamilySelect className="h-8 min-w-0 flex-1 text-xs" />
          <EditorFontSizeSelect className="h-8 w-[4.25rem] shrink-0 text-xs" />
        </div>
      </div>
    )
  }

  if (has("spacing")) {
    sections.push(
      <div key="spacing">
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Spasi
        </DropdownMenuLabel>
        <div
          className="flex flex-col gap-1.5 px-2 pb-1.5"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <EditorLineHeightSelect className="w-full" />
          <EditorParagraphSpaceSelect className="w-full" />
        </div>
      </div>
    )
  }

  if (has("color")) {
    sections.push(
      <div key="color">
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Warna
        </DropdownMenuLabel>
        <div onPointerDown={(e) => e.stopPropagation()}>
          <EditorToolbarTextColor variant="menu" />
          <EditorToolbarHighlightColor variant="menu" />
        </div>
      </div>
    )
  }

  sections.push(
    <div key="format">
      <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
        Format
      </DropdownMenuLabel>
      {has("marksCore") ? (
        <>
          <DropdownMenuItem onSelect={() => run("bold")} className="gap-2">
            <Bold className="size-4" />
            Tebal
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run("italic")} className="gap-2">
            <Italic className="size-4" />
            Miring
          </DropdownMenuItem>
        </>
      ) : null}
      {has("marksExtra") ? (
        <>
          <DropdownMenuItem onSelect={() => run("underline")} className="gap-2">
            <Underline className="size-4" />
            Garis bawah
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run("strike")} className="gap-2">
            <Strikethrough className="size-4" />
            Coret
          </DropdownMenuItem>
        </>
      ) : null}
      <DropdownMenuItem onSelect={() => run("code")} className="gap-2">
        <Code className="size-4" />
        Kode sebaris
      </DropdownMenuItem>
      {has("indent") ? (
        <>
          <DropdownMenuItem onSelect={() => run("outdent")} className="gap-2">
            <IndentDecrease className="size-4" />
            Kurangi indentasi
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run("indent")} className="gap-2">
            <IndentIncrease className="size-4" />
            Tambah indentasi
          </DropdownMenuItem>
        </>
      ) : null}
    </div>
  )

  // Center/right always in ⋮ (bar only keeps left + justify for space).
  sections.push(
    <div key="align">
      <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
        Perataan
      </DropdownMenuLabel>
      {has("align") ? (
        <>
          <DropdownMenuItem onSelect={() => run("left")} className="gap-2">
            <AlignLeft className="size-4" />
            Kiri
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run("justify")} className="gap-2">
            <AlignJustify className="size-4" />
            Rata kiri-kanan
          </DropdownMenuItem>
        </>
      ) : null}
      <DropdownMenuItem onSelect={() => run("center")} className="gap-2">
        <AlignCenter className="size-4" />
        Tengah
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => run("right")} className="gap-2">
        <AlignRight className="size-4" />
        Kanan
      </DropdownMenuItem>
    </div>
  )

  // Checklist always available in ⋮ (bar keeps poin + bernomor only).
  sections.push(
    <div key="list">
      <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
        Daftar
      </DropdownMenuLabel>
      {has("list") ? (
        <>
          <DropdownMenuItem onSelect={() => run("bulletList")} className="gap-2">
            <List className="size-4" />
            Poin
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => run("orderedList")}
            className="gap-2"
          >
            <ListOrdered className="size-4" />
            Bernomor
          </DropdownMenuItem>
        </>
      ) : null}
      <DropdownMenuItem onSelect={() => run("taskList")} className="gap-2">
        <CheckSquare className="size-4" />
        Checklist
      </DropdownMenuItem>
    </div>
  )

  if (has("insert")) {
    sections.push(
      <div key="insert">
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
      </div>
    )
  }

  const withSeps = sections.flatMap((section, i) =>
    i === 0 ? [section] : [<DropdownMenuSeparator key={`sep-${i}`} />, section]
  )

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
        className="max-h-[min(70dvh,28rem)] w-56 overflow-y-auto p-1"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {withSeps}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
