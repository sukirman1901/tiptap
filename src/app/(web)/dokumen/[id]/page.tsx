"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { statusLabel } from "@/features/documents/domain/status"
import { loadDocument } from "@/features/documents/storage/document-store"
import type { AgreedDocument } from "@/features/documents/types"
import PlaygroundPage from "@/features/playground/ui"

export default function DokumenWorkspacePage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const [doc, setDoc] = useState<AgreedDocument | null | undefined>(undefined)

  useEffect(() => {
    if (!id) {
      setDoc(null)
      return
    }
    setDoc(loadDocument(id))
  }, [id])

  if (doc === undefined) return null

  if (!doc) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Dokumen tidak ditemukan</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Dokumen ini mungkin sudah dihapus atau tautannya tidak valid.
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

  return (
    <div>
      <div className="border-border/60 bg-muted/30 text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-xs sm:px-6">
        <span className="text-foreground font-medium">{doc.title}</span>
        <span className="bg-background text-foreground rounded-md border px-1.5 py-0.5">
          {statusLabel(doc.status)}
        </span>
        {/* TODO(Task 6): pass documentId into PlaygroundPage; persist via saveDocument */}
        <span className="opacity-80">Editor dihubungkan di Task 6</span>
      </div>
      <PlaygroundPage />
    </div>
  )
}
