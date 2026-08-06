"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { createDocument, listTemplates } from "@/features/documents/storage/document-store"
import type { UserTemplate } from "@/features/documents/types"
import { createStarterPerjanjianDraft } from "@/features/playground/components/starter-perjanjian-ks"

export function TemplateList() {
  const router = useRouter()
  const [templates, setTemplates] = useState<UserTemplate[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setTemplates(listTemplates())
    setReady(true)
  }, [])

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

  if (!ready) return null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Template</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Mulai dari template sistem atau template yang Anda simpan.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium tracking-tight">Sistem</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          <li className="border-border/60 flex flex-col gap-3 rounded-lg border p-4">
            <div>
              <p className="font-medium">Perjanjian kosong</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Starter Perjanjian Kerja Sama dengan variabel siap pakai.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
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
          <div className="border-border/60 text-muted-foreground mt-3 rounded-lg border border-dashed px-4 py-10 text-center text-sm">
            Belum ada template milik Anda. Buka sebuah dokumen, lalu gunakan{" "}
            <span className="text-foreground font-medium">Simpan sebagai template</span> di
            bilah dokumen.
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="border-border/60 flex flex-col gap-3 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Disimpan{" "}
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                    }).format(new Date(t.createdAt))}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => handleUserTemplate(t)}
                >
                  Pakai
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
