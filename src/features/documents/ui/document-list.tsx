"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { needsAction, statusLabel } from "@/features/documents/domain/status"
import {
  createDocument,
  listDocuments,
} from "@/features/documents/storage/document-store"
import type { AgreedDocument } from "@/features/documents/types"

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

  useEffect(() => {
    setDocs(listDocuments())
    setReady(true)
  }, [])

  function refresh() {
    setDocs(listDocuments())
  }

  function handleCreate() {
    const doc = createDocument({ title: "Dokumen tanpa judul" })
    refresh()
    router.push(`/dokumen/${doc.id}`)
  }

  const filtered =
    filter === "all"
      ? docs
      : docs.filter((d) => needsAction(d.status, LOCAL_ROLE))

  if (!ready) return null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dokumen</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kelola draf dan dokumen yang sedang berjalan.
          </p>
        </div>
        <Button type="button" onClick={handleCreate} className="w-full sm:w-auto">
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
              Belum ada dokumen. Klik <span className="text-foreground font-medium">Buat dokumen</span>{" "}
              untuk memulai, atau pakai template di halaman Template.
            </>
          ) : (
            <>Tidak ada dokumen yang perlu tindakan saat ini.</>
          )}
        </div>
      ) : (
        <ul className="border-border/60 mt-6 divide-y rounded-lg border">
          {filtered.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/dokumen/${doc.id}`}
                className="hover:bg-muted/40 flex flex-col gap-1 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs sm:hidden">
                    {formatUpdatedAt(doc.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                    {statusLabel(doc.status)}
                  </span>
                  <span className="text-muted-foreground hidden text-xs sm:inline">
                    {formatUpdatedAt(doc.updatedAt)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
