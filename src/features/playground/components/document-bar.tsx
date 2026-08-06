"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Eye, Link2, PenLine, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { TABLE_BORDER_STYLES } from "@/registry/editor/editor-table"
import {
  availableActions,
  type DocumentAction,
  type DocumentRole,
} from "@/features/documents/domain/actions"
import {
  canTransition,
  statusLabel,
  type DocumentStatus,
} from "@/features/documents/domain/status"

import {
  buildPreviewHtml,
  type ContractDraft,
} from "./contract-draft"
import { A4_CSS_VARS } from "./use-a4-page-count"

export interface DocumentBarProps {
  draft: ContractDraft
  title: string
  status: DocumentStatus
  role: DocumentRole
  onStatusChange: (status: DocumentStatus) => void
  onSave: () => void
  /** Derived: !canEditBody → review-like chrome */
  mode?: "edit" | "review"
  feedback?: string | null
  className?: string
}

function formatSavedAt(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const paperShadow =
  "shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.35)]"

const ACTION_META: Partial<
  Record<
    DocumentAction,
    { label: string; icon: typeof Save; variant?: "default" | "outline" }
  >
> = {
  preview: { label: "Preview", icon: Eye, variant: "outline" },
  bagikan_review: { label: "Bagikan", icon: Link2, variant: "outline" },
  simpan: { label: "Simpan", icon: Save, variant: "default" },
  approve_review: { label: "Approve", icon: Check, variant: "default" },
  ttd_materai: { label: "TTD + materai", icon: PenLine, variant: "default" },
  ttd_pihak: { label: "TTD pihak", icon: PenLine, variant: "default" },
}

export function DocumentBar({
  draft,
  title,
  status,
  role,
  onStatusChange,
  onSave,
  mode = "edit",
  feedback = null,
  className,
}: DocumentBarProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const isReview = mode === "review"
  const actions = availableActions(status, role)

  const previewHtml = useMemo(
    () => (previewOpen ? buildPreviewHtml(draft) : ""),
    [draft, previewOpen]
  )

  const openComments = (draft.comments ?? []).filter((c) => c.status === "open")
    .length

  useEffect(() => {
    if (!justSaved) return
    const t = window.setTimeout(() => setJustSaved(false), 2000)
    return () => window.clearTimeout(t)
  }, [justSaved])

  useEffect(() => {
    if (!linkCopied) return
    const t = window.setTimeout(() => setLinkCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [linkCopied])

  function handleSave() {
    onSave()
    setSavedAt(new Date())
    setJustSaved(true)
  }

  async function handleShareReview() {
    onSave()
    if (canTransition(status, "dalam_review")) {
      onStatusChange("dalam_review")
    }
    const url = new URL(window.location.href)
    url.searchParams.set("review", "1")
    try {
      await navigator.clipboard.writeText(url.toString())
      setLinkCopied(true)
    } catch {
      window.prompt("Salin tautan review:", url.toString())
    }
  }

  function handleApprove() {
    if (!canTransition(status, "review_disetujui")) return
    onStatusChange("review_disetujui")
  }

  function handleTtdMaterai() {
    if (!canTransition(status, "menunggu_ttd_pihak")) return
    onStatusChange("menunggu_ttd_pihak")
  }

  function handleTtdPihak() {
    if (!canTransition(status, "selesai")) return
    onStatusChange("selesai")
  }

  function runAction(action: DocumentAction) {
    switch (action) {
      case "preview":
        setPreviewOpen(true)
        break
      case "simpan":
        handleSave()
        break
      case "bagikan_review":
        void handleShareReview()
        break
      case "approve_review":
        handleApprove()
        break
      case "ttd_materai":
        handleTtdMaterai()
        break
      case "ttd_pihak":
        handleTtdPihak()
        break
      default:
        break
    }
  }

  const phaseActions = actions.filter(
    (a) => a !== "edit_body" && a !== "kirim_review" && ACTION_META[a]
  )

  const subtitle = feedback
    ? feedback
    : isReview
      ? openComments > 0
        ? `${statusLabel(status)} · ${openComments} komentar terbuka`
        : `${statusLabel(status)} · Pilih teks untuk berkomentar`
      : justSaved
        ? `${statusLabel(status)} · Tersimpan · ${savedAt ? formatSavedAt(savedAt) : ""}`
        : savedAt
          ? `${statusLabel(status)} · Terakhir disimpan · ${formatSavedAt(savedAt)}`
          : `${statusLabel(status)} · Autosave lokal aktif`

  return (
    <>
      <div
        className={cn(
          "border-border/60 flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4",
          className
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium tracking-tight">
            {title || (isReview ? "Review draf" : "Draf kontrak")}
          </p>
          <p
            className="text-muted-foreground text-xs"
            role="status"
            aria-live="polite"
          >
            {subtitle}
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
          {phaseActions.map((action) => {
            const meta = ACTION_META[action]
            if (!meta) return null
            const Icon = meta.icon
            const label =
              action === "bagikan_review" && linkCopied
                ? "Tautan disalin"
                : meta.label
            return (
              <Button
                key={action}
                type="button"
                variant={meta.variant ?? "outline"}
                size="sm"
                className="h-9 flex-1 shadow-none sm:h-8 sm:flex-initial sm:px-3"
                onClick={() => runAction(action)}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </Button>
            )
          })}
        </div>
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          side="right"
          className={cn(
            "flex h-full flex-col gap-0 p-0",
            "!w-full !max-w-none",
            "md:!max-w-[min(100vw,calc(210mm+5rem))]"
          )}
        >
          <SheetHeader className="border-border/60 shrink-0 border-b px-4 py-3 pr-12 text-left sm:px-6">
            <SheetTitle className="text-base">Preview dokumen</SheetTitle>
          </SheetHeader>

          <div
            className={cn(
              "bg-muted/50 min-h-0 flex-1 overflow-x-hidden overflow-y-auto",
              "p-0 sm:p-4 md:p-8"
            )}
            style={A4_CSS_VARS}
          >
            <style dangerouslySetInnerHTML={{ __html: TABLE_BORDER_STYLES }} />
            <div
              className={cn(
                "bg-background text-foreground mx-auto box-border w-full",
                "max-w-none md:w-[210mm] md:max-w-[210mm]",
                "sm:rounded-md",
                paperShadow
              )}
            >
              <article
                className={cn(
                  "contract-doc-preview box-border w-full",
                  "min-h-[60dvh] md:min-h-[var(--a4-page-h)]",
                  "px-4 py-6 sm:px-6 sm:py-8",
                  "md:px-[var(--a4-margin-l)] md:pt-[var(--a4-margin-t)] md:pr-[var(--a4-margin-r)] md:pb-[var(--a4-margin-b)]",
                  "prose dark:prose-invert max-w-none",
                  "font-['Times_New_Roman',Times,serif] text-[12pt] leading-[1.15]",
                  "[&_p]:my-0 [&_p]:text-justify",
                  "[&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0",
                  "[&_table]:my-4 [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse",
                  "[&_td]:border [&_td]:border-border [&_td]:px-1 [&_td]:py-0 [&_td]:align-top [&_td]:break-words",
                  "[&_th]:border [&_th]:border-border [&_th]:px-1 [&_th]:py-0 [&_th]:align-top [&_th]:break-words",
                  "[&_th]:bg-transparent [&_th]:font-normal [&_th]:text-inherit",
                  "[&_table[data-borders=false]_td]:border-transparent",
                  "[&_table[data-borders=false]_th]:border-transparent"
                )}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
