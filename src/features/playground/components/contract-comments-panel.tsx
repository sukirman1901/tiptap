"use client"

import { useMemo, useState } from "react"
import { Check, MessageSquareText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { ContractComment, ContractDraft } from "./contract-draft"

export interface ContractCommentsPanelProps {
  draft: ContractDraft
  onChange: (next: ContractDraft) => void
  /** Jump to range in the editor */
  onFocusComment?: (comment: ContractComment) => void
  activeCommentId?: string | null
  /** Reviewer must pick a display name once */
  reviewerMode?: boolean
  className?: string
  bare?: boolean
}

const REVIEWER_NAME_KEY = "agreed:reviewer-name"

export function getStoredReviewerName(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(REVIEWER_NAME_KEY) ?? ""
}

export function setStoredReviewerName(name: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(REVIEWER_NAME_KEY, name.trim())
}

export function ContractCommentsPanel({
  draft,
  onChange,
  onFocusComment,
  activeCommentId,
  reviewerMode = false,
  className,
  bare = false,
}: ContractCommentsPanelProps) {
  const [filter, setFilter] = useState<"open" | "all">("open")
  const [name, setName] = useState(getStoredReviewerName)

  const comments = draft.comments ?? []
  const openCount = comments.filter((c) => c.status === "open").length
  const visible = useMemo(() => {
    const list = filter === "open" ? comments.filter((c) => c.status === "open") : comments
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [comments, filter])

  function resolve(id: string) {
    onChange({
      ...draft,
      comments: comments.map((c) =>
        c.id === id ? { ...c, status: "resolved" as const } : c
      ),
    })
  }

  function reopen(id: string) {
    onChange({
      ...draft,
      comments: comments.map((c) =>
        c.id === id ? { ...c, status: "open" as const } : c
      ),
    })
  }

  function saveName() {
    const next = name.trim()
    if (!next) return
    setStoredReviewerName(next)
    setName(next)
  }

  const body = (
    <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
      <div className="space-y-1.5">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
          Komentar
        </h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {reviewerMode
            ? "Blok teks di dokumen, lalu tambah komentar."
            : "Masukan dari tautan review. Klik item untuk lompat ke teks."}
        </p>
        <p className="text-muted-foreground text-xs" role="status">
          {openCount} terbuka · {comments.length} total
        </p>
      </div>

      {reviewerMode && (
        <div className="space-y-1.5">
          <label
            htmlFor="reviewer-name"
            className="text-muted-foreground text-[11px] font-medium"
          >
            Nama Anda
          </label>
          <div className="flex gap-2">
            <input
              id="reviewer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              placeholder="Nama reviewer"
              className="border-border/70 bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm shadow-none outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setFilter("open")}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition-colors",
            filter === "open"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Terbuka
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition-colors",
            filter === "all"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Semua
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-start gap-2 rounded-md border border-dashed border-border/70 px-3 py-4 text-xs leading-relaxed">
          <MessageSquareText className="size-4 opacity-70" aria-hidden />
          {filter === "open"
            ? "Belum ada komentar terbuka. Pilih teks di dokumen untuk menambah."
            : "Belum ada komentar."}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onFocusComment?.(c)}
                className={cn(
                  "w-full rounded-md border border-border/60 px-3 py-2.5 text-left transition-colors",
                  "hover:border-border hover:bg-muted/30",
                  activeCommentId === c.id && "border-amber-600/50 bg-amber-50/50 dark:bg-amber-950/20"
                )}
              >
                <p className="text-muted-foreground line-clamp-2 text-[11px] italic leading-snug">
                  “{c.quote || "…"}”
                </p>
                <p className="mt-1.5 text-sm leading-snug">{c.body}</p>
                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  <span>{c.authorName}</span>
                  <span>·</span>
                  <span>
                    {new Date(c.createdAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {c.status === "resolved" && (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      · Selesai
                    </span>
                  )}
                </div>
              </button>
              <div className="mt-1.5 flex justify-end gap-1">
                {c.status === "open" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => resolve(c.id)}
                  >
                    <Check className="size-3.5" aria-hidden />
                    Selesai
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => reopen(c.id)}
                  >
                    Buka lagi
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  if (bare) {
    return <div className={className}>{body}</div>
  }

  return (
    <aside
      className={cn(
        "bg-background flex w-full shrink-0 flex-col",
        "rounded-lg border border-border/60 lg:rounded-none lg:border-0",
        "lg:w-80",
        className
      )}
    >
      <div
        className={cn(
          "overflow-auto",
          "lg:sticky lg:top-[calc(3.5rem+1rem)] lg:max-h-[calc(100dvh-3.5rem-2rem)]"
        )}
      >
        {body}
      </div>
    </aside>
  )
}
