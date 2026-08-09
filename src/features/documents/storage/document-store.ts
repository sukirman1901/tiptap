import { emptyDraft, type ContractDraft } from "@/features/playground/components/contract-draft"
import { seededContractOps } from "../domain/parties"
import type { AgreedDocument, UserTemplate } from "../types"
import { migrateDocument } from "./migrate-document"

/** Current persistence key */
export const DOCUMENTS_KEY = "agreed:documents:v2"
/** Pre-ops documents */
export const DOCUMENTS_KEY_LEGACY = "agreed:documents:v1"
export const TEMPLATES_KEY = "agreed:templates:v1"

function readDocs(): AgreedDocument[] {
  if (typeof window === "undefined") return []
  try {
    const rawV2 = localStorage.getItem(DOCUMENTS_KEY)
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.map(migrateDocument)
    }
    const rawV1 = localStorage.getItem(DOCUMENTS_KEY_LEGACY)
    if (!rawV1) return []
    const parsed = JSON.parse(rawV1) as unknown
    if (!Array.isArray(parsed)) return []
    const migrated = parsed.map(migrateDocument)
    writeDocs(migrated)
    localStorage.removeItem(DOCUMENTS_KEY_LEGACY)
    return migrated
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
    number: null,
    subject: null,
    contractDate: null,
    createdAt: now,
    updatedAt: now,
    draft: input.draft ?? emptyDraft(),
    ops: seededContractOps(),
  }
  writeDocs([doc, ...readDocs()])
  return doc
}

export function saveDocument(doc: AgreedDocument): void {
  const next = migrateDocument({
    ...doc,
    updatedAt: new Date().toISOString(),
  })
  const others = readDocs().filter((d) => d.id !== next.id)
  writeDocs([next, ...others])
}

export function deleteDocument(id: string): boolean {
  const before = readDocs()
  const next = before.filter((d) => d.id !== id)
  if (next.length === before.length) return false
  writeDocs(next)
  return true
}

export function renameDocument(id: string, title: string): AgreedDocument | null {
  const doc = loadDocument(id)
  if (!doc) return null
  const next = migrateDocument({
    ...doc,
    title: title.trim() || "Dokumen tanpa judul",
    updatedAt: new Date().toISOString(),
  })
  const others = readDocs().filter((d) => d.id !== id)
  writeDocs([next, ...others])
  return next
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

export function deleteTemplate(id: string): boolean {
  if (typeof window === "undefined") return false
  const all = listTemplates()
  const next = all.filter((t) => t.id !== id)
  if (next.length === all.length) return false
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next))
  return true
}
