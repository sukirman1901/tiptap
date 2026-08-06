import type { ContractDraft } from "@/features/playground/components/contract-draft"
import type { DocumentStatus } from "./domain/status"

export type AgreedDocument = {
  id: string
  title: string
  status: DocumentStatus
  /** Local demo: who is "me" when opening the doc */
  createdAt: string
  updatedAt: string
  draft: ContractDraft
}

export type UserTemplate = {
  id: string
  title: string
  createdAt: string
  draft: ContractDraft
}
