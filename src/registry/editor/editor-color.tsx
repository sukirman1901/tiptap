"use client"

import * as React from "react"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import Highlight from "@tiptap/extension-highlight"
import type { Editor } from "@tiptap/react"
import { useEditorState } from "@tiptap/react"
import { HexColorPicker } from "react-colorful"
import { Highlighter, Palette, Type } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  createEditorExtension,
  EditorBubbleMenuDropdown,
  EditorBubbleMenuDropdownContent,
  EditorBubbleMenuDropdownLabel,
  EditorBubbleMenuDropdownTrigger,
  useEditor,
} from "./editor"

// =============================================================================
// EditorColorPicker Context
// =============================================================================

interface EditorColorPickerContextValue {
  currentTextColor: string
  currentHighlightColor: string
  setTextColor: (color: string) => void
  setHighlightColor: (color: string) => void
}

const EditorColorPickerContext =
  React.createContext<EditorColorPickerContextValue | null>(null)

function useEditorColorPicker() {
  const ctx = React.useContext(EditorColorPickerContext)
  if (!ctx) {
    throw new Error(
      "useEditorColorPicker must be used within EditorColorPicker"
    )
  }
  return ctx
}

// =============================================================================
// EditorColorPicker
// =============================================================================

export interface EditorColorPickerProps {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function EditorColorPicker({ children, ...props }: EditorColorPickerProps) {
  const { editor } = useEditor()

  const { currentTextColor, currentHighlightColor } = useEditorState({
    editor: editor ?? null,
    selector: ({ editor: e }) => ({
      currentTextColor:
        (e?.getAttributes("textStyle").color as string) || "inherit",
      currentHighlightColor:
        (e?.getAttributes("highlight").color as string) || "transparent",
    }),
  }) ?? { currentTextColor: "inherit", currentHighlightColor: "transparent" }

  const setTextColor = React.useCallback(
    (color: string) => {
      if (!editor) return
      if (color === "inherit") {
        editor.chain().focus().unsetColor().run()
      } else {
        editor.chain().focus().setColor(color).run()
      }
    },
    [editor]
  )

  const setHighlightColor = React.useCallback(
    (color: string) => {
      if (!editor) return
      if (color === "transparent") {
        editor.chain().focus().unsetHighlight().run()
      } else {
        editor.chain().focus().setHighlight({ color }).run()
      }
    },
    [editor]
  )

  const contextValue = React.useMemo<EditorColorPickerContextValue>(
    () => ({
      currentTextColor,
      currentHighlightColor,
      setTextColor,
      setHighlightColor,
    }),
    [currentTextColor, currentHighlightColor, setTextColor, setHighlightColor]
  )

  if (!editor) return null

  return (
    <EditorColorPickerContext.Provider value={contextValue}>
      <EditorBubbleMenuDropdown {...props}>{children}</EditorBubbleMenuDropdown>
    </EditorColorPickerContext.Provider>
  )
}
EditorColorPicker.displayName = "EditorColorPicker"

// =============================================================================
// EditorColorPickerTrigger
// =============================================================================

export interface EditorColorPickerTriggerProps {
  children: React.ReactNode
}

function EditorColorPickerTrigger({ children }: EditorColorPickerTriggerProps) {
  return (
    <EditorBubbleMenuDropdownTrigger>
      {children}
    </EditorBubbleMenuDropdownTrigger>
  )
}
EditorColorPickerTrigger.displayName = "EditorColorPickerTrigger"

// =============================================================================
// EditorColorPickerContent
// =============================================================================

export interface EditorColorPickerContentProps extends React.ComponentProps<
  typeof EditorBubbleMenuDropdownContent
> {}

const EditorColorPickerContent = React.forwardRef<
  React.ElementRef<typeof EditorBubbleMenuDropdownContent>,
  EditorColorPickerContentProps
>(({ className, children, ...props }, ref) => (
  <EditorBubbleMenuDropdownContent
    ref={ref}
    className={cn("w-48", className)}
    {...props}
  >
    {children}
  </EditorBubbleMenuDropdownContent>
))
EditorColorPickerContent.displayName = "EditorColorPickerContent"

// =============================================================================
// EditorColorPickerLabel
// =============================================================================

export interface EditorColorPickerLabelProps extends React.ComponentProps<
  typeof EditorBubbleMenuDropdownLabel
> {}

const EditorColorPickerLabel = React.forwardRef<
  React.ElementRef<typeof EditorBubbleMenuDropdownLabel>,
  EditorColorPickerLabelProps
>((props, ref) => <EditorBubbleMenuDropdownLabel ref={ref} {...props} />)
EditorColorPickerLabel.displayName = "EditorColorPickerLabel"

// =============================================================================
// EditorColorPickerGrid
// =============================================================================

export interface EditorColorPickerGridProps extends React.ComponentProps<"div"> {}

const EditorColorPickerGrid = React.forwardRef<
  HTMLDivElement,
  EditorColorPickerGridProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("grid grid-cols-5 gap-1 px-1 py-1", className)}
      {...props}
    >
      {children}
    </div>
  )
})
EditorColorPickerGrid.displayName = "EditorColorPickerGrid"

// =============================================================================
// EditorColorPickerItem
// =============================================================================

export interface EditorColorPickerItemProps extends Omit<
  React.ComponentProps<"button">,
  "color"
> {
  color: string
  variant: "text" | "highlight"
}

const EditorColorPickerItem = React.forwardRef<
  HTMLButtonElement,
  EditorColorPickerItemProps
>(({ color, variant, className, onClick, ...props }, ref) => {
  const {
    currentTextColor,
    currentHighlightColor,
    setTextColor,
    setHighlightColor,
  } = useEditorColorPicker()

  const isActive =
    variant === "text"
      ? currentTextColor === color
      : currentHighlightColor === color

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === "text") {
      setTextColor(color)
    } else {
      setHighlightColor(color)
    }
    onClick?.(e)
  }

  const isDefault = color === "inherit" || color === "transparent"

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex size-7 items-center justify-center rounded-full transition-all",
        "hover:ring-ring hover:ring-2 hover:ring-offset-1",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
        isActive && "ring-primary ring-2 ring-offset-1",
        className
      )}
      style={
        variant === "highlight"
          ? { backgroundColor: isDefault ? "#e3e2e0" : color }
          : undefined
      }
      onClick={handleClick}
      {...props}
    >
      {variant === "text" && (
        <span
          className={cn(
            "text-sm font-semibold",
            isDefault && "text-foreground"
          )}
          style={!isDefault ? { color } : undefined}
        >
          A
        </span>
      )}
      {variant === "highlight" && isDefault && (
        <span className="text-muted-foreground relative size-full">
          <span className="bg-destructive absolute top-1/2 left-1/2 h-px w-5/6 -translate-x-1/2 -translate-y-1/2 rotate-45" />
        </span>
      )}
    </button>
  )
})
EditorColorPickerItem.displayName = "EditorColorPickerItem"

// =============================================================================
// EditorColorPickerIndicator
// =============================================================================

export interface EditorColorPickerIndicatorProps extends React.ComponentProps<"div"> {}

const EditorColorPickerIndicator = React.forwardRef<
  HTMLDivElement,
  EditorColorPickerIndicatorProps
>(({ className, ...props }, ref) => {
  const { currentTextColor, currentHighlightColor } = useEditorColorPicker()

  const backgroundColor =
    currentHighlightColor !== "transparent"
      ? currentHighlightColor
      : currentTextColor !== "inherit"
        ? currentTextColor
        : "currentColor"

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-x-1.5 bottom-1 h-0.5 rounded-full",
        className
      )}
      style={{ backgroundColor }}
      {...props}
    />
  )
})
EditorColorPickerIndicator.displayName = "EditorColorPickerIndicator"

// =============================================================================
// EditorColorPickerCustom
// =============================================================================

export interface EditorColorPickerCustomProps extends Omit<
  React.ComponentProps<"button">,
  "onChange" | "color"
> {
  variant: "text" | "highlight"
}

const EditorColorPickerCustom = React.forwardRef<
  HTMLButtonElement,
  EditorColorPickerCustomProps
>(({ variant, className, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const {
    currentTextColor,
    currentHighlightColor,
    setTextColor,
    setHighlightColor,
  } = useEditorColorPicker()

  const currentColor =
    variant === "text" ? currentTextColor : currentHighlightColor

  const displayColor =
    currentColor === "inherit" || currentColor === "transparent"
      ? "#000000"
      : currentColor

  const handleChange = (color: string) => {
    if (variant === "text") {
      setTextColor(color)
    } else {
      setHighlightColor(color)
    }
  }

  const handlePointerDown = () => {
    setIsDragging(true)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  React.useEffect(() => {
    if (open) {
      window.addEventListener("pointerup", handlePointerUp)
      return () => window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [open])

  const handleInteractOutside = (e: Event) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  const isDefault = currentColor === "inherit" || currentColor === "transparent"
  const hasCustomColor = !isDefault

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          type="button"
          className={cn(
            "flex size-7 items-center justify-center rounded-full transition-all",
            "hover:ring-ring hover:ring-2 hover:ring-offset-1",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
            hasCustomColor
              ? "ring-primary ring-2 ring-offset-1"
              : "bg-muted border-border border border-dashed",
            className
          )}
          style={
            variant === "highlight" && hasCustomColor
              ? { backgroundColor: currentColor }
              : undefined
          }
          title="Custom color"
          {...props}
        >
          {variant === "text" ? (
            <span
              className={cn(
                "text-sm font-semibold",
                !hasCustomColor && "text-muted-foreground"
              )}
              style={hasCustomColor ? { color: currentColor } : undefined}
            >
              A
            </span>
          ) : (
            !hasCustomColor && (
              <Palette className="text-muted-foreground size-3.5" />
            )
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[9999] w-auto p-3"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={handleInteractOutside}
        onInteractOutside={handleInteractOutside}
      >
        <div onPointerDown={handlePointerDown}>
          <HexColorPicker
            color={displayColor}
            onChange={handleChange}
            style={{ width: "180px", height: "140px" }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
})
EditorColorPickerCustom.displayName = "EditorColorPickerCustom"

// =============================================================================
// EditorColorExtension
// =============================================================================

export const EditorColorExtension = createEditorExtension({
  extension: [
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
      HTMLAttributes: {
        class: "px-0.5 rounded",
      },
    }),
  ],
  commands: [
    {
      key: "setTextColor",
      icon: Type,
      label: "Warna teks",
      description: "Change text color",
      execute: (editor: Editor, options) =>
        editor
          .chain()
          .focus()
          .setColor(options?.color as string)
          .run(),
      canExecute: () => true,
      isActive: (editor: Editor) =>
        editor.getAttributes("textStyle").color !== undefined,
    },
    {
      key: "unsetTextColor",
      icon: Type,
      label: "Hapus warna teks",
      description: "Remove text color",
      execute: (editor: Editor) => editor.chain().focus().unsetColor().run(),
      canExecute: (editor: Editor) =>
        editor.getAttributes("textStyle").color !== undefined,
      isActive: () => false,
    },
    {
      key: "setHighlightColor",
      icon: Type,
      label: "Sorotan",
      description: "Highlight selected text",
      execute: (editor: Editor, options) =>
        editor
          .chain()
          .focus()
          .setHighlight({ color: options?.color as string })
          .run(),
      canExecute: () => true,
      isActive: (editor: Editor) => editor.isActive("highlight"),
    },
    {
      key: "unsetHighlightColor",
      icon: Type,
      label: "Hapus sorotan",
      description: "Remove highlight",
      execute: (editor: Editor) =>
        editor.chain().focus().unsetHighlight().run(),
      canExecute: (editor: Editor) => editor.isActive("highlight"),
      isActive: () => false,
    },
  ],
})

// =============================================================================
// Toolbar color controls (text + highlight)
// =============================================================================

const TOOLBAR_TEXT_COLORS = [
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

const TOOLBAR_HIGHLIGHT_COLORS = [
  { name: "default", value: "transparent", label: "Tanpa latar" },
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

function ToolbarColorSwatch({
  color,
  active,
  onClick,
  title,
  bordered,
}: {
  color: string
  active: boolean
  onClick: () => void
  title: string
  bordered?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "size-6 rounded-sm border border-transparent",
        active && "ring-ring ring-2 ring-offset-1",
        bordered && "border-border"
      )}
      style={{
        backgroundColor:
          color === "inherit" || color === "transparent" ? undefined : color,
      }}
    >
      {(color === "inherit" || color === "transparent") && (
        <span className="text-muted-foreground flex size-full items-center justify-center text-[10px]">
          /
        </span>
      )}
    </button>
  )
}

const menuItemTriggerClass =
  "hover:bg-accent focus:bg-accent relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none"

type ToolbarColorVariant = "icon" | "menu"

/** Icon + color bar constrained to the same 16×16 footprint as Bold/Italic/Underline. */
function ToolbarColorGlyph({
  icon: Icon,
  color,
  muted = false,
}: {
  icon: LucideIcon
  color: string
  muted?: boolean
}) {
  return (
    <span
      className="relative inline-flex size-4 shrink-0 items-center justify-center"
      aria-hidden
    >
      <Icon className="size-3.5 -translate-y-px" strokeWidth={2} />
      <span
        className="absolute inset-x-[3px] bottom-0 h-[2px] rounded-[1px]"
        style={{
          backgroundColor: color,
          opacity: muted ? 0.35 : 1,
        }}
      />
    </span>
  )
}

/** Plain "A" + one color bar — avoids Lucide Baseline's built-in underline (double line). */
function ToolbarTextColorGlyph({ color }: { color: string }) {
  return (
    <span
      className="relative inline-flex size-4 shrink-0 items-center justify-center"
      aria-hidden
    >
      <span className="text-[12px] leading-none font-semibold -translate-y-px">
        A
      </span>
      <span
        className="absolute inset-x-[3px] bottom-0 h-[2px] rounded-[1px]"
        style={{ backgroundColor: color }}
      />
    </span>
  )
}

export function EditorToolbarTextColor({
  variant = "icon",
}: {
  variant?: ToolbarColorVariant
}) {
  const { editor } = useEditor()
  const current =
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) =>
        (e?.getAttributes("textStyle").color as string) || "inherit",
    }) ?? "inherit"

  if (!editor) return null

  const swatchColor = current === "inherit" ? "currentColor" : current

  const swatches = (
    <div className="grid grid-cols-5 gap-1">
      {TOOLBAR_TEXT_COLORS.map((c) => (
        <ToolbarColorSwatch
          key={c.name}
          color={c.value}
          title={c.label}
          active={current === c.value}
          bordered={c.value === "inherit"}
          onClick={() => {
            if (c.value === "inherit") {
              editor.chain().focus().unsetColor().run()
            } else {
              editor.chain().focus().setColor(c.value).run()
            }
          }}
        />
      ))}
    </div>
  )

  const glyph = <ToolbarTextColorGlyph color={swatchColor} />

  return (
    <Popover>
      <PopoverTrigger asChild>
        {variant === "menu" ? (
          <button
            type="button"
            className={menuItemTriggerClass}
            aria-label="Warna huruf"
          >
            {glyph}
            Warna huruf
          </button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Warna huruf"
            title="Warna huruf"
          >
            {glyph}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-2" sideOffset={6}>
        {variant === "icon" ? (
          <p className="text-muted-foreground mb-1.5 px-1 text-xs font-medium">
            Warna huruf
          </p>
        ) : null}
        {swatches}
      </PopoverContent>
    </Popover>
  )
}

export function EditorToolbarHighlightColor({
  variant = "icon",
}: {
  variant?: ToolbarColorVariant
}) {
  const { editor } = useEditor()
  const current =
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) =>
        (e?.getAttributes("highlight").color as string) || "transparent",
    }) ?? "transparent"

  if (!editor) return null

  const isClear = current === "transparent"
  const swatchColor = isClear ? "currentColor" : current

  const swatches = (
    <div className="grid grid-cols-5 gap-1">
      {TOOLBAR_HIGHLIGHT_COLORS.map((c) => (
        <ToolbarColorSwatch
          key={c.name}
          color={c.value}
          title={c.label}
          active={current === c.value}
          bordered={c.value === "transparent"}
          onClick={() => {
            if (c.value === "transparent") {
              editor.chain().focus().unsetHighlight().run()
            } else {
              editor.chain().focus().setHighlight({ color: c.value }).run()
            }
          }}
        />
      ))}
    </div>
  )

  const glyph = (
    <ToolbarColorGlyph
      icon={Highlighter}
      color={swatchColor}
      muted={isClear}
    />
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        {variant === "menu" ? (
          <button
            type="button"
            className={menuItemTriggerClass}
            aria-label="Warna latar"
          >
            {glyph}
            Warna latar
          </button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Warna latar"
            title="Warna latar"
          >
            {glyph}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-2" sideOffset={6}>
        {variant === "icon" ? (
          <p className="text-muted-foreground mb-1.5 px-1 text-xs font-medium">
            Warna latar
          </p>
        ) : null}
        {swatches}
      </PopoverContent>
    </Popover>
  )
}

// =============================================================================
// Exports
// =============================================================================

export {
  EditorColorPicker,
  EditorColorPickerTrigger,
  EditorColorPickerContent,
  EditorColorPickerLabel,
  EditorColorPickerGrid,
  EditorColorPickerItem,
  EditorColorPickerIndicator,
  EditorColorPickerCustom,
  useEditorColorPicker,
}
