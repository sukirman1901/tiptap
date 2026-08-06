"use client"

import type { Editor } from "@tiptap/react"
import { TextAlign } from "@tiptap/extension-text-align"
import TiptapTypography from "@tiptap/extension-typography"
import TiptapUnderline from "@tiptap/extension-underline"
import StarterKit from "@tiptap/starter-kit"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Italic,
  List,
  ListOrdered,
  Minus,
  Redo,
  Strikethrough,
  TextQuote,
  Type,
  Underline,
  Undo,
} from "lucide-react"
import { createEditorExtension, type EditorActionConfig } from "./editor"

const essentialCommands: EditorActionConfig<Editor>[] = [
  // History
  {
    key: "undo",
    icon: Undo,
    label: "Urungkan",
    description: "Batalkan aksi terakhir",
    execute: (editor) => editor.chain().focus().undo().run(),
    canExecute: (editor) => editor.can().chain().focus().undo().run(),
  },
  {
    key: "redo",
    icon: Redo,
    label: "Ulangi",
    description: "Ulangi aksi terakhir",
    execute: (editor) => editor.chain().focus().redo().run(),
    canExecute: (editor) => editor.can().chain().focus().redo().run(),
  },
  // Text formatting
  {
    key: "bold",
    icon: Bold,
    label: "Tebal",
    description: "Teks tebal",
    execute: (editor) => editor.chain().focus().toggleBold().run(),
    canExecute: (editor) => editor.can().chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
  },
  {
    key: "italic",
    icon: Italic,
    label: "Miring",
    description: "Teks miring",
    execute: (editor) => editor.chain().focus().toggleItalic().run(),
    canExecute: (editor) => editor.can().chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
  },
  {
    key: "underline",
    icon: Underline,
    label: "Garis bawah",
    description: "Garis bawah teks",
    execute: (editor) => editor.chain().focus().toggleUnderline().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive("underline"),
  },
  {
    key: "strike",
    icon: Strikethrough,
    label: "Coret",
    description: "Coret teks",
    execute: (editor) => editor.chain().focus().toggleStrike().run(),
    canExecute: (editor) => editor.can().chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
  },
  {
    key: "code",
    icon: Code,
    label: "Kode",
    description: "Format sebagai kode",
    execute: (editor) => editor.chain().focus().toggleCode().run(),
    canExecute: (editor) => editor.can().chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
  },
  // Block types
  {
    key: "paragraph",
    icon: Type,
    label: "Teks",
    description: "Teks biasa tanpa heading",
    execute: (editor) => editor.chain().focus().setParagraph().run(),
    canExecute: (editor) => editor.can().chain().focus().setParagraph().run(),
    isActive: (editor) => editor.isActive("paragraph"),
  },
  {
    key: "heading1",
    icon: Heading1,
    label: "Judul 1",
    description: "Judul utama dokumen",
    execute: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
  },
  {
    key: "heading2",
    icon: Heading2,
    label: "Judul 2",
    description: "Subjudul bagian",
    execute: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
  },
  {
    key: "heading3",
    icon: Heading3,
    label: "Judul 3",
    description: "Subjudul lebih kecil",
    execute: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
  },
  {
    key: "heading4",
    icon: Heading4,
    label: "Judul 4",
    description: "Detail bagian",
    execute: (editor) => editor.chain().focus().setHeading({ level: 4 }).run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setHeading({ level: 4 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 4 }),
  },
  {
    key: "heading5",
    icon: Heading5,
    label: "Judul 5",
    description: "Detail kecil",
    execute: (editor) => editor.chain().focus().setHeading({ level: 5 }).run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setHeading({ level: 5 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 5 }),
  },
  {
    key: "heading6",
    icon: Heading6,
    label: "Judul 6",
    description: "Detail terkecil",
    execute: (editor) => editor.chain().focus().setHeading({ level: 6 }).run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setHeading({ level: 6 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 6 }),
  },
  {
    key: "blockquote",
    icon: TextQuote,
    label: "Kutipan",
    description: "Blok kutipan",
    execute: (editor) => editor.chain().focus().toggleBlockquote().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
  },
  {
    key: "divider",
    icon: Minus,
    label: "Pemisah",
    description: "Garis pemisah antar blok",
    execute: (editor) => editor.chain().focus().setHorizontalRule().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setHorizontalRule().run(),
  },
  // Lists
  {
    key: "bulletList",
    icon: List,
    label: "Poin",
    description: "Daftar berpoin",
    execute: (editor) => editor.chain().focus().toggleBulletList().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
  },
  {
    key: "orderedList",
    icon: ListOrdered,
    label: "Bernomor",
    description: "Daftar bernomor",
    execute: (editor) => editor.chain().focus().toggleOrderedList().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
  },
  // Text alignment
  {
    key: "left",
    icon: AlignLeft,
    label: "Kiri",
    description: "Rata kiri",
    execute: (editor) => editor.chain().focus().setTextAlign("left").run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setTextAlign("left").run(),
    isActive: (editor) => editor.isActive({ textAlign: "left" }),
  },
  {
    key: "center",
    icon: AlignCenter,
    label: "Tengah",
    description: "Rata tengah",
    execute: (editor) => editor.chain().focus().setTextAlign("center").run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setTextAlign("center").run(),
    isActive: (editor) => editor.isActive({ textAlign: "center" }),
  },
  {
    key: "right",
    icon: AlignRight,
    label: "Kanan",
    description: "Rata kanan",
    execute: (editor) => editor.chain().focus().setTextAlign("right").run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setTextAlign("right").run(),
    isActive: (editor) => editor.isActive({ textAlign: "right" }),
  },
  {
    key: "justify",
    icon: AlignJustify,
    label: "Rata kiri-kanan",
    description: "Rata kiri dan kanan",
    execute: (editor) => editor.chain().focus().setTextAlign("justify").run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setTextAlign("justify").run(),
    isActive: (editor) => editor.isActive({ textAlign: "justify" }),
  },
]

export const EditorEssentialExtension = createEditorExtension({
  extension: [
    StarterKit.configure({
      codeBlock: false,
    }),
    TiptapUnderline.configure({
      HTMLAttributes: {
        class: "underline underline-offset-4",
      },
    }),
    TextAlign.configure({
      types: [
        "heading",
        "paragraph",
        "blockquote",
        "bulletList",
        "orderedList",
      ],
    }),
    TiptapTypography.configure({}),
  ],
  commands: essentialCommands,
})
