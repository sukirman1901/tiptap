import { emptyDraft, type ContractDraft } from "@/features/playground/components/contract-draft"
import { emptyContractOps, type ContractOps } from "../domain/contract-ops"
import type { DocumentStatus } from "../domain/status"
import type { AgreedDocument } from "../types"

type LegacyDocument = {
  id?: unknown
  title?: unknown
  status?: unknown
  number?: unknown
  subject?: unknown
  contractDate?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  draft?: unknown
  ops?: unknown
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== "string") return null
  const t = value.trim()
  return t ? t : null
}

function normalizeDraft(raw: unknown): ContractDraft {
  if (!raw || typeof raw !== "object") return emptyDraft()
  const d = raw as Partial<ContractDraft>
  return {
    fields: Array.isArray(d.fields) ? d.fields : [],
    values: d.values && typeof d.values === "object" ? (d.values as Record<string, string>) : {},
    contentHtml: typeof d.contentHtml === "string" ? d.contentHtml : "<p></p>",
    comments: Array.isArray(d.comments) ? d.comments : [],
  }
}

function normalizeOps(raw: unknown): ContractOps {
  if (!raw || typeof raw !== "object") return emptyContractOps()
  const base = emptyContractOps()
  const o = raw as Partial<ContractOps>
  return {
    parties: Array.isArray(o.parties) ? o.parties : base.parties,
    paymentPlan:
      o.paymentPlan && typeof o.paymentPlan === "object"
        ? {
            ...base.paymentPlan,
            ...o.paymentPlan,
            milestones: Array.isArray(o.paymentPlan.milestones)
              ? o.paymentPlan.milestones
              : [],
          }
        : base.paymentPlan,
    tempo: o.tempo && typeof o.tempo === "object" ? { ...base.tempo, ...o.tempo } : base.tempo,
    signatures: Array.isArray(o.signatures) ? o.signatures : base.signatures,
    stamp: o.stamp && typeof o.stamp === "object" ? { ...base.stamp, ...o.stamp } : base.stamp,
    attachments: Array.isArray(o.attachments) ? o.attachments : base.attachments,
  }
}

const STATUSES: DocumentStatus[] = [
  "draf",
  "dalam_review",
  "review_disetujui",
  "menunggu_ttd_pihak",
  "selesai",
]

function normalizeStatus(raw: unknown): DocumentStatus {
  return STATUSES.includes(raw as DocumentStatus) ? (raw as DocumentStatus) : "draf"
}

/** Coerce any stored blob into AgreedDocument v2. */
export function migrateDocument(raw: unknown): AgreedDocument {
  const d = (raw && typeof raw === "object" ? raw : {}) as LegacyDocument
  const now = new Date().toISOString()
  return {
    id: asString(d.id, crypto.randomUUID()),
    title: asString(d.title, "Dokumen tanpa judul") || "Dokumen tanpa judul",
    status: normalizeStatus(d.status),
    number: asNullableString(d.number),
    subject: asNullableString(d.subject),
    contractDate: asNullableString(d.contractDate),
    createdAt: asString(d.createdAt, now),
    updatedAt: asString(d.updatedAt, now),
    draft: normalizeDraft(d.draft),
    ops: normalizeOps(d.ops),
  }
}
