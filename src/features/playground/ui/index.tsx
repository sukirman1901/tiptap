"use client"

import Link from "next/link"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import {
  canEditBody,
  type DocumentRole,
} from "@/features/documents/domain/actions"
import {
  canTransition,
  type DocumentStatus,
} from "@/features/documents/domain/status"
import {
  loadDocument,
  saveDocument,
} from "@/features/documents/storage/document-store"
import type { AgreedDocument } from "@/features/documents/types"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { MessageSquareText } from "lucide-react"

import { agreedDocumentFromSnapshot } from "@/features/invites/guest-document"
import type { DocumentSnapshot } from "@/features/invites/types"
import {
  type ContractComment,
  type ContractDraft,
} from "../components/contract-draft"
import { ContractCommentsPanel } from "../components/contract-comments-panel"
import { DocumentPropertiesPanel } from "../components/document-properties-panel"
import { FullFeaturedEditor } from "../components/full-featured-editor"

function SidebarTabs({
  tab,
  onTabChange,
  commentCount,
}: {
  tab: "variables" | "comments"
  onTabChange: (t: "variables" | "comments") => void
  commentCount: number
}) {
  return (
    <div
      className="border-border/60 flex shrink-0 gap-4 border-b px-4 sm:px-5"
      role="tablist"
      aria-label="Panel dokumen"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "variables"}
        onClick={() => onTabChange("variables")}
        className={cn(
          "-mb-px border-b-2 px-0.5 py-3 text-xs font-medium transition-colors",
          tab === "variables"
            ? "border-foreground text-foreground"
            : "text-muted-foreground hover:text-foreground border-transparent"
        )}
      >
        Properti
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "comments"}
        onClick={() => onTabChange("comments")}
        className={cn(
          "-mb-px border-b-2 px-0.5 py-3 text-xs font-medium transition-colors",
          tab === "comments"
            ? "border-foreground text-foreground"
            : "text-muted-foreground hover:text-foreground border-transparent"
        )}
      >
        Komentar
        {commentCount > 0 ? ` (${commentCount})` : ""}
      </button>
    </div>
  )
}

function NotFoundState() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">Dokumen tidak ditemukan</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Dokumen ini mungkin sudah dihapus, tautannya tidak valid, atau Anda
        membuka editor tanpa memilih dokumen.
      </p>
      <Link
        href="/dokumen"
        className="text-foreground mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline"
      >
        Kembali ke daftar dokumen
      </Link>
    </div>
  )
}

interface PlaygroundInnerProps {
  documentId?: string
}

function PlaygroundInner({ documentId }: PlaygroundInnerProps) {
  const searchParams = useSearchParams()
  const inviteMode = searchParams.get("invite") === "1"
  /** Review link (?review=1) = pihak lain; otherwise inisiator. */
  const role: DocumentRole =
    searchParams.get("review") === "1" ? "party" : "initiator"

  const [doc, setDoc] = useState<AgreedDocument | null | undefined>(undefined)
  const docRef = useRef<AgreedDocument | null | undefined>(undefined)
  const [tab, setTab] = useState<"variables" | "comments">("variables")
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [focusComment, setFocusComment] = useState<ContractComment | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    docRef.current = doc
  }, [doc])

  useEffect(() => {
    if (!documentId) {
      setDoc(null)
      return
    }
    if (inviteMode) {
      const raw = sessionStorage.getItem(`agreed:snapshot:${documentId}`)
      if (raw) {
        const snap = JSON.parse(raw) as DocumentSnapshot
        let next = agreedDocumentFromSnapshot(snap)
        const guestCommentsRaw = sessionStorage.getItem(
          `agreed:guest-comments:${documentId}`
        )
        if (guestCommentsRaw) {
          try {
            const comments = JSON.parse(guestCommentsRaw) as ContractComment[]
            if (Array.isArray(comments)) {
              next = { ...next, draft: { ...next.draft, comments } }
            }
          } catch {
            // ignore malformed guest comments
          }
        }
        setDoc(next)
        return
      }
      setDoc(null)
      return
    }
    setDoc(loadDocument(documentId))
  }, [documentId, inviteMode])

  useEffect(() => {
    if (!feedback) return
    const t = window.setTimeout(() => setFeedback(null), 3000)
    return () => window.clearTimeout(t)
  }, [feedback])

  const bodyEditable = doc ? canEditBody(doc.status, role) : false
  const isReviewLike = Boolean(doc) && !bodyEditable

  useEffect(() => {
    if (isReviewLike) setTab("comments")
  }, [isReviewLike])

  const persist = useCallback(
    (next: AgreedDocument) => {
      docRef.current = next
      if (!inviteMode) {
        saveDocument(next)
      } else {
        sessionStorage.setItem(
          `agreed:guest-comments:${next.id}`,
          JSON.stringify(next.draft.comments)
        )
      }
      setDoc(next)
    },
    [inviteMode]
  )

  function handleDraftChange(draft: ContractDraft) {
    const current = docRef.current
    if (!current) return
    persist({ ...current, draft })
  }

  function handleSave() {
    const current = docRef.current
    if (!current) return
    persist(current)
  }

  function handleStatusChange(status: DocumentStatus) {
    const current = docRef.current
    if (!current) return
    if (status !== current.status && !canTransition(current.status, status))
      return
    persist({ ...current, status })
    if (status === "menunggu_ttd_pihak") {
      setFeedback("TTD+materai dicatat (demo)")
    } else if (status === "selesai") {
      setFeedback("Dokumen selesai (demo)")
    }
  }

  if (doc === undefined) return null
  if (!doc) return <NotFoundState />

  const openCount = (doc.draft.comments ?? []).filter((c) => c.status === "open")
    .length

  const commentsPanel = (
    <ContractCommentsPanel
      draft={doc.draft}
      onChange={handleDraftChange}
      reviewerMode={isReviewLike}
      activeCommentId={activeCommentId}
      onFocusComment={(c) => {
        setActiveCommentId(c.id)
        setFocusComment(c)
        setMobileOpen(false)
      }}
      bare
    />
  )

  const propertiesPanel = (
    <DocumentPropertiesPanel document={doc} onChange={persist} bare />
  )

  const desktopSidebar = isReviewLike ? (
    <aside className="border-border/60 bg-background sticky top-[calc(3.5rem+1rem)] hidden max-h-[calc(100dvh-3.5rem-2rem)] w-80 shrink-0 overflow-hidden rounded-lg border lg:block">
      <div className="h-full overflow-y-auto">{commentsPanel}</div>
    </aside>
  ) : (
    <aside className="border-border/60 bg-background sticky top-[calc(3.5rem+1rem)] hidden max-h-[calc(100dvh-3.5rem-2rem)] w-80 shrink-0 flex-col overflow-hidden rounded-lg border lg:flex">
      <SidebarTabs
        tab={tab}
        onTabChange={setTab}
        commentCount={openCount}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "variables" ? propertiesPanel : commentsPanel}
      </div>
    </aside>
  )

  function openMobilePanel(preferred?: "variables" | "comments") {
    if (preferred) setTab(preferred)
    else if (isReviewLike) setTab("comments")
    setMobileOpen(true)
  }

  return (
    <div className="relative">
      <FullFeaturedEditor
        draft={doc.draft}
        onDraftChange={handleDraftChange}
        mode={isReviewLike ? "review" : "edit"}
        documentTitle={doc.title}
        documentStatus={doc.status}
        documentRole={role}
        onDocumentStatusChange={handleStatusChange}
        onDocumentSave={handleSave}
        documentFeedback={feedback}
        sidebar={desktopSidebar}
        activeCommentId={activeCommentId}
        onActiveCommentIdChange={setActiveCommentId}
        focusComment={focusComment}
        onFocusCommentHandled={() => setFocusComment(null)}
        onOpenMobilePanel={() => openMobilePanel("variables")}
        openCommentCount={openCount}
      />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        {isReviewLike && (
          <SheetTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="fixed right-3 bottom-3 z-20 size-11 rounded-full shadow-md lg:hidden"
              aria-label="Komentar"
            >
              <MessageSquareText className="size-5" />
              {openCount > 0 && (
                <span className="bg-background text-foreground absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-medium shadow">
                  {openCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
        )}
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
        >
          <SheetHeader className="border-border/60 border-b px-4 py-3 pr-12 text-left">
            <SheetTitle className="text-base">
              {isReviewLike ? "Komentar" : "Panel dokumen"}
            </SheetTitle>
          </SheetHeader>
          {!isReviewLike && (
            <SidebarTabs
              tab={tab}
              onTabChange={setTab}
              commentCount={openCount}
            />
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isReviewLike || tab === "comments"
              ? commentsPanel
              : propertiesPanel}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

interface PlaygroundPageProps {
  documentId?: string
}

const PlaygroundPage = ({ documentId }: PlaygroundPageProps) => {
  return (
    <Suspense fallback={null}>
      <PlaygroundInner documentId={documentId} />
    </Suspense>
  )
}

export default PlaygroundPage
