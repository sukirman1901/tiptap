import type { DocumentStatus } from "@/features/documents/domain/status"
import type { PartyKind } from "@/features/documents/domain/contract-ops"

export type InviteStatus = "pending" | "sent" | "redeemed" | "expired"

export type SnapshotParty = {
  id: string
  displayName: string
  kind: PartyKind
  sortOrder: number
  isSigner: boolean
  isReviewer: boolean
}

export type DocumentSnapshot = {
  documentId: string
  title: string
  number: string | null
  subject: string | null
  contractDate: string | null
  status: DocumentStatus
  contentHtml: string
  parties: SnapshotParty[]
  createdAt: string
}

export type InviteRecord = {
  token: string
  documentId: string
  partyId: string
  email: string
  createdAt: string
  expiresAt: string
  redeemedAt: string | null
  status: InviteStatus
  snapshot: DocumentSnapshot
}
