import { emptyDraft, type ContractDraft } from "@/features/playground/components/contract-draft"
import type { AgreedDocument, UserTemplate } from "../types"

export const DOCUMENTS_KEY = "agreed:documents:v1"
export const TEMPLATES_KEY = "agreed:templates:v1"

function readDocs(): AgreedDocument[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AgreedDocument[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeDocs(docs: AgreedDocument[]) {
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs))
}

export function listDocuments(): AgreedDocument[] {
  return readDocs().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function loadDocument(id: string): AgreedDocument | null {
  return readDocs().find((d) => d.id === id) ?? null
}

export function createDocument(input: {
  title: string
  draft?: ContractDraft
}): AgreedDocument {
  const now = new Date().toISOString()
  const doc: AgreedDocument = {
    id: crypto.randomUUID(),
    title: input.title.trim() || "Dokumen tanpa judul",
    status: "draf",
    createdAt: now,
    updatedAt: now,
    draft: input.draft ?? emptyDraft(),
  }
  writeDocs([doc, ...readDocs()])
  return doc
}

export function saveDocument(doc: AgreedDocument): void {
  const next = { ...doc, updatedAt: new Date().toISOString() }
  const others = readDocs().filter((d) => d.id !== doc.id)
  writeDocs([next, ...others])
}

export function listTemplates(): UserTemplate[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as UserTemplate[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAsTemplate(input: {
  title: string
  draft: ContractDraft
}): UserTemplate {
  const t: UserTemplate = {
    id: crypto.randomUUID(),
    title: input.title.trim() || "Template",
    createdAt: new Date().toISOString(),
    draft: input.draft,
  }
  const all = listTemplates()
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify([t, ...all]))
  return t
}
