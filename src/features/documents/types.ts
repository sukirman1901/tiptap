import type { ContractDraft } from "@/features/playground/components/contract-draft"
import type { ContractOps } from "./domain/contract-ops"
import type { DocumentStatus } from "./domain/status"

export type AgreedDocument = {
  id: string
  title: string
  status: DocumentStatus
  /** Contract number for lists/search (e.g. AGD-2026-0001) */
  number: string | null
  /** Perihal */
  subject: string | null
  /** ISO date YYYY-MM-DD */
  contractDate: string | null
  createdAt: string
  updatedAt: string
  /** Layer A — TipTap body + custom Properti + comments */
  draft: ContractDraft
  /** Layer B — structured contract operations */
  ops: ContractOps
}

export type UserTemplate = {
  id: string
  title: string
  createdAt: string
  draft: ContractDraft
}
