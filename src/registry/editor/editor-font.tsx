"use client"

import * as React from "react"
import FontFamily from "@tiptap/extension-text-style/font-family"
import FontSize from "@tiptap/extension-text-style/font-size"
import { useEditorState } from "@tiptap/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { createEditorExtension, useEditor } from "./editor"

export const FONT_FAMILIES = [
  { label: "Bawaan", value: "default" },
  { label: "Times New Roman", value: "\"Times New Roman\", Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Courier New", value: "\"Courier New\", Courier, monospace" },
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

/** FontFamily + FontSize (TextStyle already provided by color extension). */
export const EditorFontExtension = createEditorExtension({
  extension: [FontFamily, FontSize],
  commands: [],
})

function matchFontFamily(current: string | undefined): string {
  if (!current) return "default"
  const found = FONT_FAMILIES.find(
    (f) => f.value !== "default" && current.includes(f.label)
  )
  if (found) return found.value
  const exact = FONT_FAMILIES.find((f) => f.value === current)
  return exact?.value ?? "default"
}

export function EditorFontFamilySelect({
  className,
}: {
  className?: string
}) {
  const { editor } = useEditor()

  const fontFamily =
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) =>
        (e?.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
    }) ?? ""

  if (!editor) return null

  const value = matchFontFamily(fontFamily || undefined)

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next === "default") {
          editor.chain().focus().unsetFontFamily().run()
        } else {
          editor.chain().focus().setFontFamily(next).run()
        }
      }}
    >
      <SelectTrigger
        aria-label="Jenis font"
        className={cn(
          "h-8 w-[9.5rem] shrink-0 shadow-none md:w-[11rem]",
          className
        )}
      >
        <SelectValue placeholder="Jenis" />
      </SelectTrigger>
      <SelectContent>
        {FONT_FAMILIES.map((font) => (
          <SelectItem
            key={font.value}
            value={font.value}
            style={
              font.value === "default"
                ? undefined
                : { fontFamily: font.value }
            }
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

  const fontSize =
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) =>
        (e?.getAttributes("textStyle").fontSize as string | undefined) ?? "",
    }) ?? ""

  if (!editor) return null

  const known = FONT_SIZES.some((s) => s.value === fontSize)
  const value = known ? fontSize : undefined

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        editor.chain().focus().setFontSize(next).run()
      }}
    >
      <SelectTrigger
        aria-label="Ukuran font"
        className={cn("h-8 w-[5.25rem] shrink-0 shadow-none", className)}
      >
        <SelectValue placeholder="Ukuran" />
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
