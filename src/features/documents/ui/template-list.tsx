"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"

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
  createDocument,
  deleteTemplate,
  listTemplates,
} from "@/features/documents/storage/document-store"
import type { UserTemplate } from "@/features/documents/types"
import { createStarterPerjanjianDraft } from "@/features/playground/components/starter-perjanjian-ks"

export function TemplateList() {
  const router = useRouter()
  const [templates, setTemplates] = useState<UserTemplate[]>([])
  const [ready, setReady] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserTemplate | null>(null)

  useEffect(() => {
    setTemplates(listTemplates())
    setReady(true)
  }, [])

  function refresh() {
    setTemplates(listTemplates())
  }

  function useDraft(title: string, draft: Parameters<typeof createDocument>[0]["draft"]) {
    const doc = createDocument({ title, draft })
    router.push(`/dokumen/${doc.id}`)
  }

  function handleSystemStarter() {
    useDraft("Perjanjian Kerja Sama", createStarterPerjanjianDraft())
  }

  function handleUserTemplate(t: UserTemplate) {
    useDraft(t.title, t.draft)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteTemplate(deleteTarget.id)
    setDeleteTarget(null)
    refresh()
  }

  if (!ready) return null

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Template</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Mulai dari template sistem atau template yang Anda simpan.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium tracking-tight">Sistem</h2>
        {/* 1 kolom mobile · 2 kolom ≥640 · 3 kolom ≥1024 */}
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li className="border-border/60 flex flex-col gap-3 rounded-lg border p-4">
            <div>
              <p className="font-medium">Perjanjian Kerja Sama</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Starter dengan properti siap pakai.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full shadow-none sm:h-8"
              onClick={handleSystemStarter}
            >
              Pakai
            </Button>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium tracking-tight">Milik saya</h2>
        {templates.length === 0 ? (
          <div className="border-border/60 text-muted-foreground mt-3 w-full rounded-lg border border-dashed px-4 py-10 text-center text-sm leading-relaxed">
            Belum ada template milik Anda. Untuk sekarang, pakai template sistem di
            atas, atau buat dokumen baru dari daftar Dokumen.
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <li
                key={t.id}
                className="border-border/60 flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Disimpan{" "}
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                    }).format(new Date(t.createdAt))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 min-w-0 flex-1 shadow-none sm:h-8"
                    onClick={() => handleUserTemplate(t)}
                  >
                    Pakai
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive size-9 shrink-0 sm:size-8"
                    aria-label={`Hapus template ${t.title}`}
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus template?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” akan dihapus permanen. Tindakan ini tidak
              bisa dibatalkan.
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
