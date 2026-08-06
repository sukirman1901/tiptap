"use client"

import { useCallback, useEffect, useState } from "react"
import { MessageSquarePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  EditorBubbleMenu,
  EditorBubbleMenuContent,
  useEditor,
} from "@/registry/editor/editor"
import { cn } from "@/lib/utils"

import { createComment, type ContractComment, type ContractDraft } from "./contract-draft"
import {
  getStoredReviewerName,
  setStoredReviewerName,
} from "./contract-comments-panel"

export function ReviewCommentBubble({
  draft,
  onDraftChange,
  enabled,
}: {
  draft: ContractDraft
  onDraftChange: (next: ContractDraft) => void
  enabled: boolean
}) {
  const { editor } = useEditor()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [authorName, setAuthorName] = useState(getStoredReviewerName)
  const [range, setRange] = useState<{ from: number; to: number; quote: string } | null>(
    null
  )

  useEffect(() => {
    if (!enabled) {
      setOpen(false)
      setRange(null)
    }
  }, [enabled])

  const shouldShow = useCallback(
    ({ from, to }: { from: number; to: number }) => {
      if (!enabled || !editor) return false
      if (from === to) return false
      if (editor.isActive("image")) return false
      return true
    },
    [editor, enabled]
  )

  if (!editor || !enabled) return null

  function beginCompose() {
    const { from, to } = editor!.state.selection
    if (from === to) return
    const quote = editor!.state.doc.textBetween(from, to, " ")
    setRange({ from, to, quote })
    setAuthorName(getStoredReviewerName())
    setBody("")
    setOpen(true)
  }

  function submit() {
    if (!range || !body.trim()) return
    const name = authorName.trim() || "Anonim"
    setStoredReviewerName(name)
    const comment = createComment({
      from: range.from,
      to: range.to,
      quote: range.quote,
      body,
      authorName: name,
    })
    onDraftChange({
      ...draft,
      comments: [...(draft.comments ?? []), comment],
    })
    editor?.commands.setActiveReviewComment(comment.id)
    setOpen(false)
    setRange(null)
    setBody("")
  }

  return (
    <EditorBubbleMenu
      shouldShow={shouldShow}
      tippyOptions={{
        placement: "top",
        maxWidth: 360,
        onHide: () => {
          if (!open) return
        },
      }}
    >
      <EditorBubbleMenuContent className={cn(open && "min-w-[16rem] p-2")}>
        {!open ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={beginCompose}
          >
            <MessageSquarePlus className="size-3.5" aria-hidden />
            Komentar
          </Button>
        ) : (
          <div className="flex w-[min(18rem,80vw)] flex-col gap-2">
            <p className="text-muted-foreground line-clamp-2 text-[11px] italic">
              “{range?.quote}”
            </p>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Nama Anda"
              className="border-border/70 bg-background h-8 rounded-md border px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tulis komentar…"
              rows={3}
              className="border-border/70 bg-background min-h-[4rem] resize-none rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setOpen(false)
                  setRange(null)
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={!body.trim()}
                onClick={submit}
              >
                Kirim
              </Button>
            </div>
          </div>
        )}
      </EditorBubbleMenuContent>
    </EditorBubbleMenu>
  )
}

export function focusCommentInEditor(
  editor: NonNullable<ReturnType<typeof useEditor>["editor"]>,
  comment: ContractComment
) {
  const size = editor.state.doc.content.size
  let from = comment.from
  let to = comment.to
  if (from < 0 || to > size || from >= to) {
    // Fallback: find quote text
    const needle = comment.quote.trim()
    if (needle) {
      let foundFrom = -1
      let foundTo = -1
      editor.state.doc.descendants((node, pos) => {
        if (foundFrom >= 0 || !node.isText || !node.text) return
        const idx = node.text.indexOf(needle.slice(0, Math.min(24, needle.length)))
        if (idx >= 0) {
          foundFrom = pos + idx
          foundTo = pos + idx + Math.min(needle.length, node.text.length - idx)
        }
      })
      if (foundFrom >= 0) {
        from = foundFrom
        to = foundTo
      } else {
        return
      }
    } else {
      return
    }
  }
  editor.chain().focus().setTextSelection({ from, to }).run()
  editor.commands.setActiveReviewComment(comment.id)
  const dom = editor.view.domAtPos(from)
  const el =
    dom.node instanceof HTMLElement
      ? dom.node
      : dom.node.parentElement
  el?.scrollIntoView({ behavior: "smooth", block: "center" })
}
