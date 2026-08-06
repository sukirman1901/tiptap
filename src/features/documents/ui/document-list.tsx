"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { Pencil, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { needsAction, statusLabel } from "@/features/documents/domain/status"
import {
  createDocument,
  deleteDocument,
  listDocuments,
  renameDocument,
} from "@/features/documents/storage/document-store"
import type { AgreedDocument } from "@/features/documents/types"
import {
  DRAFT_STORAGE_KEY,
  loadDraftFromStorage,
} from "@/features/playground/components/contract-draft"

type Filter = "all" | "needs_action"

const LOCAL_ROLE = "initiator" as const

function formatUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function DocumentList() {
  const router = useRouter()
  const [docs, setDocs] = useState<AgreedDocument[]>([])
  const [filter, setFilter] = useState<Filter>("all")
  const [ready, setReady] = useState(false)
  const [renameTarget, setRenameTarget] = useState<AgreedDocument | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<AgreedDocument | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState("")

  useEffect(() => {
    if (listDocuments().length === 0) {
      const legacy = loadDraftFromStorage()
      if (legacy) {
        createDocument({ title: "Draf lama", draft: legacy })
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY)
        } catch {
          /* ignore */
        }
      }
    }
    setDocs(listDocuments())
    setReady(true)
  }, [])

  function refresh() {
    setDocs(listDocuments())
  }

  function openCreate() {
    setCreateTitle("")
    setCreateOpen(true)
  }

  function confirmCreate() {
    const title = createTitle.trim() || "Dokumen tanpa judul"
    const doc = createDocument({ title })
    setCreateOpen(false)
    setCreateTitle("")
    refresh()
    router.push(`/dokumen/${doc.id}`)
  }

  function openRename(doc: AgreedDocument) {
    setRenameTarget(doc)
    setRenameValue(doc.title)
  }

  function confirmRename() {
    if (!renameTarget) return
    renameDocument(renameTarget.id, renameValue)
    setRenameTarget(null)
    refresh()
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteDocument(deleteTarget.id)
    setDeleteTarget(null)
    refresh()
  }

  const filtered =
    filter === "all"
      ? docs
      : docs.filter((d) => needsAction(d.status, LOCAL_ROLE))

  if (!ready) return null

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dokumen</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kelola draf dan dokumen yang sedang berjalan.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="w-full sm:w-auto">
          Buat dokumen
        </Button>
      </div>

      <div
        className="mt-6 flex gap-2"
        role="group"
        aria-label="Filter dokumen"
      >
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          Semua
        </FilterChip>
        <FilterChip
          active={filter === "needs_action"}
          onClick={() => setFilter("needs_action")}
        >
          Perlu tindakan
        </FilterChip>
      </div>

      {filtered.length === 0 ? (
        <div className="border-border/60 text-muted-foreground mt-8 rounded-lg border border-dashed px-4 py-12 text-center text-sm">
          {docs.length === 0 ? (
            <>
              Belum ada dokumen. Klik{" "}
              <span className="text-foreground font-medium">Buat dokumen</span>{" "}
              untuk memulai, atau pakai template di halaman Template.
            </>
          ) : (
            <>Tidak ada dokumen yang perlu tindakan saat ini.</>
          )}
        </div>
      ) : (
        <ul className="border-border/60 mt-6 divide-y rounded-lg border">
          {filtered.map((doc) => (
            <li
              key={doc.id}
              className="hover:bg-muted/40 flex flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <Link
                href={`/dokumen/${doc.id}`}
                className="min-w-0 flex-1 outline-none focus-visible:underline"
              >
                <p className="truncate font-medium">{doc.title}</p>
                <p className="text-muted-foreground mt-0.5 text-xs sm:hidden">
                  {formatUpdatedAt(doc.updatedAt)}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                  {statusLabel(doc.status)}
                </span>
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {formatUpdatedAt(doc.updatedAt)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={`Ubah nama ${doc.title}`}
                  onClick={() => openRename(doc)}
                >
                  <Pencil className="size-3.5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive size-8 shrink-0"
                  aria-label={`Hapus ${doc.title}`}
                  onClick={() => setDeleteTarget(doc)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setCreateTitle("")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat dokumen</DialogTitle>
            <DialogDescription>
              Beri nama dulu, lalu lanjut ke editor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="doc-create-title">Nama dokumen</Label>
            <Input
              id="doc-create-title"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  confirmCreate()
                }
              }}
              placeholder="Mis. Perjanjian Kerja Sama"
              className="text-base sm:text-sm"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Batal
            </Button>
            <Button type="button" onClick={confirmCreate}>
              Lanjut ke editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah nama dokumen</DialogTitle>
            <DialogDescription>
              Nama ini muncul di daftar dokumen dan bilah editor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="doc-rename">Nama</Label>
            <Input
              id="doc-rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  confirmRename()
                }
              }}
              className="text-base sm:text-sm"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameTarget(null)}
            >
              Batal
            </Button>
            <Button type="button" onClick={confirmRename}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus dokumen?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” akan dihapus permanen dari perangkat ini.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {children}
    </button>
  )
}
