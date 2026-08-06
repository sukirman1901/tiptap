"use client"

/**
 * Full-Featured Editor
 *
 * Contract workspace editor: A4 canvas, formatting toolbar, slash menu,
 * tables/images, and live document variables from the draft store.
 */

import type { Editor } from "@tiptap/react"
import { useEffect, useRef, useState, type ReactNode } from "react"

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
  EditorContent,
  EditorProvider,
  useEditor,
} from "@/registry/editor/editor"

import { cn } from "@/lib/utils"
import type { DocumentRole } from "@/features/documents/domain/actions"
import type { DocumentStatus } from "@/features/documents/domain/status"

import { DocumentCanvas } from "./document-canvas"
import { DocumentBar } from "./document-bar"
import {
  ContractDraftStoreSync,
  getDraftStoreSnapshot,
} from "./contract-draft-store"
import {
  type ContractComment,
  type ContractDraft,
} from "./contract-draft"
import { ContractEditorToolbar } from "./contract-editor-toolbar"
import { EditorContractVariableExtension } from "./editor-contract-variable"
import { EditorReviewCommentsExtension } from "./editor-review-comments"
import {
  focusCommentInEditor,
  ReviewCommentBubble,
} from "./review-comment-bubble"

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
} from "@/registry/editor/editor-color"
import { EditorEssentialExtension } from "@/registry/editor/editor-essential"
import { EditorFontExtension } from "@/registry/editor/editor-font"
import { EditorSpacingExtension } from "@/registry/editor/editor-spacing"
import { EditorHighlightExtension } from "@/registry/editor/editor-highlight"
import { EditorIndentExtension } from "@/registry/editor/editor-indent"
import { EditorLinkExtensions } from "@/registry/editor/editor-link"
import { EditorPageBreakExtension } from "@/registry/editor/editor-page-break"
import { EditorPageGapExtension } from "@/registry/editor/editor-page-gap"
import { EditorPlaceholderExtension } from "@/registry/editor/editor-placeholder"
import { EditorTaskListExtensions } from "@/registry/editor/editor-task-list"
import {
  Bold,
  Braces,
  Italic,
  Link2,
  SeparatorHorizontal,
  Strikethrough,
  Type,
  Underline,
} from "lucide-react"

const TEXT_COLORS = [
  { name: "default", value: "inherit", label: "Bawaan" },
  { name: "gray", value: "#9b9a97", label: "Abu-abu" },
  { name: "brown", value: "#64473a", label: "Cokelat" },
  { name: "orange", value: "#d9730d", label: "Oranye" },
  { name: "yellow", value: "#cb8700", label: "Kuning" },
  { name: "green", value: "#448361", label: "Hijau" },
  { name: "blue", value: "#337ea9", label: "Biru" },
  { name: "purple", value: "#9065b0", label: "Ungu" },
  { name: "pink", value: "#c14c8a", label: "Merah muda" },
  { name: "red", value: "#d44c47", label: "Merah" },
] as const

const HIGHLIGHT_COLORS = [
  { name: "default", value: "transparent", label: "Tanpa latar" },
  { name: "gray", value: "#e3e2e0", label: "Abu-abu" },
  { name: "brown", value: "#eee0da", label: "Cokelat" },
  { name: "orange", value: "#fadec9", label: "Oranye" },
  { name: "yellow", value: "#fdecc8", label: "Kuning" },
  { name: "green", value: "#dbeddb", label: "Hijau" },
  { name: "blue", value: "#d3e5ef", label: "Biru" },
  { name: "purple", value: "#e8deee", label: "Ungu" },
  { name: "pink", value: "#f5e0e9", label: "Merah muda" },
  { name: "red", value: "#ffe2dd", label: "Merah" },
] as const

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
  if (editor.isActive("pageBreak")) return false
  return true
}

const staticSlashMenuItems = [
  ...defaultSlashMenuItems.filter((item) => item.title !== "Checklist"),
  {
    title: "Henti halaman",
    description: "Sisipkan page break untuk cetak/PDF",
    icon: SeparatorHorizontal,
    searchTerms: ["page", "break", "henti", "halaman", "pagebreak"],
    command: (editor: Editor | null) => {
      editor?.chain().focus().setPageBreak().run()
    },
  },
]

function ReviewCommentsSync({
  comments,
  activeId,
}: {
  comments: ContractComment[]
  activeId: string | null
}) {
  const { editor } = useEditor()
  useEffect(() => {
    if (!editor) return
    editor.commands.setReviewComments(comments)
  }, [editor, comments])
  useEffect(() => {
    if (!editor) return
    editor.commands.setActiveReviewComment(activeId)
  }, [editor, activeId])
  return null
}

function CommentFocusBridge({
  comment,
  onDone,
}: {
  comment: ContractComment | null
  onDone: () => void
}) {
  const { editor } = useEditor()
  useEffect(() => {
    if (!editor || !comment) return
    focusCommentInEditor(editor, comment)
    onDone()
  }, [editor, comment, onDone])
  return null
}

interface FullFeaturedEditorProps {
  draft: ContractDraft
  onDraftChange: (next: ContractDraft) => void
  /** Desktop sidebar (lg+). Mobile uses sheet. */
  sidebar?: ReactNode
  /** Review link mode: read-only + comment on selection */
  mode?: "edit" | "review"
  /** Document lifecycle (AgreedDocument workspace) */
  documentTitle: string
  documentStatus: DocumentStatus
  documentRole: DocumentRole
  onDocumentRoleChange: (role: DocumentRole) => void
  onDocumentStatusChange: (status: DocumentStatus) => void
  onDocumentSave: () => void
  onSaveAsTemplate?: () => void
  documentFeedback?: string | null
  activeCommentId?: string | null
  onActiveCommentIdChange?: (id: string | null) => void
  focusComment?: ContractComment | null
  onFocusCommentHandled?: () => void
  /** Mobile: open Variabel/Komentar sheet */
  onOpenMobilePanel?: () => void
  openCommentCount?: number
}

export function FullFeaturedEditor({
  draft,
  onDraftChange,
  sidebar,
  mode = "edit",
  documentTitle,
  documentStatus,
  documentRole,
  onDocumentRoleChange,
  onDocumentStatusChange,
  onDocumentSave,
  onSaveAsTemplate,
  documentFeedback = null,
  activeCommentId = null,
  onActiveCommentIdChange,
  focusComment = null,
  onFocusCommentHandled,
  onOpenMobilePanel,
  openCommentCount = 0,
}: FullFeaturedEditorProps) {
  const draftRef = useRef(draft)
  draftRef.current = draft
  const isReview = mode === "review"
  const [focusToken, setFocusToken] = useState<ContractComment | null>(null)

  useEffect(() => {
    if (focusComment) setFocusToken(focusComment)
  }, [focusComment])

  return (
    <EditorProvider
      key={mode}
      content={draft.contentHtml}
      editable={!isReview}
      extensions={[
        EditorEssentialExtension,
        EditorLinkExtensions,
        EditorTaskListExtensions,
        EditorPlaceholderExtension,
        EditorColorExtension,
        EditorFontExtension,
        EditorSpacingExtension,
        EditorIndentExtension,
        EditorPageBreakExtension,
        EditorPageGapExtension,
        EditorContractVariableExtension,
        EditorHighlightExtension,
        EditorReviewCommentsExtension,
        EditorImageExtension.configure({
          uploadStrategy: "base64",
          maxFileSize: 10 * 1024 * 1024,
        }),
        EditorTableExtensions,
        ...(isReview
          ? []
          : [
              EditorSlashMenuExtension.configure({
                items: () => [
                  ...staticSlashMenuItems,
                  ...getDraftStoreSnapshot().fields.map((f) => ({
                    title: `{${f.token}}`,
                    description: `Variabel: ${f.label}`,
                    icon: Braces,
                    searchTerms: [
                      "var",
                      "variabel",
                      f.token,
                      f.label.toLowerCase(),
                    ],
                    command: (editor: Editor | null) => {
                      editor
                        ?.chain()
                        .focus()
                        .insertContractVariable({ id: f.id, token: f.token })
                        .run()
                    },
                  })),
                ],
              }),
            ]),
      ]}
      onUpdate={({ editor }) => {
        if (isReview) return
        const html = editor.getHTML()
        onDraftChange({ ...draftRef.current, contentHtml: html })
      }}
    >
      <ContractDraftStoreSync fields={draft.fields} values={draft.values} />
      <ReviewCommentsSync
        comments={draft.comments ?? []}
        activeId={activeCommentId}
      />
      <CommentFocusBridge
        comment={focusToken}
        onDone={() => {
          setFocusToken(null)
          onFocusCommentHandled?.()
        }}
      />

      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start lg:py-4">
        <div className="border-border/60 bg-background flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border lg:min-h-[calc(100dvh-3.5rem-2rem)]">
          <DocumentBar
            draft={draft}
            title={documentTitle}
            status={documentStatus}
            role={documentRole}
            onRoleChange={onDocumentRoleChange}
            onStatusChange={onDocumentStatusChange}
            onSave={onDocumentSave}
            onSaveAsTemplate={onSaveAsTemplate}
            mode={mode}
            feedback={documentFeedback}
          />
          {!isReview && (
            <ContractEditorToolbar
              onOpenMobilePanel={onOpenMobilePanel}
              commentCount={openCommentCount}
            />
          )}

          <DocumentCanvas>
            <EditorContent
              className={cn(
                "prose dark:prose-invert max-w-none",
                "[&_.ProseMirror]:min-h-[40dvh] [&_.ProseMirror]:outline-none md:[&_.ProseMirror]:min-h-0",
                "[&_.ProseMirror]:font-['Times_New_Roman',Times,serif]",
                "[&_.ProseMirror]:text-[12pt]",
                "[&_.ProseMirror]:leading-[1.15]",
                "[&_.ProseMirror_p]:my-0 [&_.ProseMirror_p]:text-justify",
                "[&_.ProseMirror_h1]:my-0 [&_.ProseMirror_h2]:my-0 [&_.ProseMirror_h3]:my-0",
                "[&_.ProseMirror_h4]:my-0 [&_.ProseMirror_h5]:my-0 [&_.ProseMirror_h6]:my-0",
                "[&_.ProseMirror_blockquote]:my-0",
                "[&_.ProseMirror_li]:my-0",
                "[&_.ProseMirror_ul]:my-0 [&_.ProseMirror_ol]:my-0",
                "[&_.ProseMirror_li::marker]:[font-family:inherit] [&_.ProseMirror_li::marker]:[font-size:inherit]",
                isReview && "[&_.ProseMirror]:cursor-text"
              )}
            />
          </DocumentCanvas>
        </div>

        <div className="hidden lg:contents">{sidebar}</div>

        {isReview ? (
          <ReviewCommentBubble
            draft={draft}
            onDraftChange={(next) => {
              onDraftChange(next)
              const last = next.comments[next.comments.length - 1]
              if (last) onActiveCommentIdChange?.(last.id)
            }}
            enabled
          />
        ) : (
          <EditorBubbleMenu shouldShow={shouldShowTextBubbleMenu}>
            <EditorBubbleMenuContent>
              <EditorBubbleMenuGroup>
                <EditorBubbleMenuButton action="bold" title="Tebal">
                  <Bold className="size-3.5" />
                </EditorBubbleMenuButton>
                <EditorBubbleMenuButton action="italic" title="Miring">
                  <Italic className="size-3.5" />
                </EditorBubbleMenuButton>
                <EditorBubbleMenuButton action="underline" title="Garis bawah">
                  <Underline className="size-3.5" />
                </EditorBubbleMenuButton>
                <EditorBubbleMenuButton action="strike" title="Coret">
                  <Strikethrough className="size-3.5" />
                </EditorBubbleMenuButton>
              </EditorBubbleMenuGroup>

              <EditorBubbleMenuSeparator />

              <EditorColorPicker>
                <EditorColorPickerTrigger>
                  <EditorBubbleMenuButton title="Warna teks" className="relative">
                    <Type className="z-10 size-3.5" />
                    <EditorColorPickerIndicator />
                  </EditorBubbleMenuButton>
                </EditorColorPickerTrigger>
                <EditorColorPickerContent align="start">
                  <EditorColorPickerLabel>Warna teks</EditorColorPickerLabel>
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

                  <EditorColorPickerLabel>Sorotan</EditorColorPickerLabel>
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
                  <EditorBubbleMenuButton title="Tautan">
                    <Link2 className="size-3.5" />
                  </EditorBubbleMenuButton>
                </EditorBubbleMenuPopoverTrigger>
                <EditorBubbleMenuPopoverContent align="end">
                  <EditorBubbleMenuForm
                    className="flex gap-4"
                    onSubmit={(values, ed) =>
                      ed
                        ?.chain()
                        .focus()
                        .extendMarkRange("link")
                        .setLink({ href: values?.href })
                        .run()
                    }
                  >
                    <EditorBubbleMenuInput
                      name="href"
                      placeholder="https://"
                      className="min-w-[12rem]"
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
        )}
      </div>
    </EditorProvider>
  )
}
