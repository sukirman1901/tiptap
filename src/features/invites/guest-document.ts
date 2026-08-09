import { emptyDraft } from "@/features/playground/components/contract-draft"
import { emptyContractOps } from "@/features/documents/domain/contract-ops"
import type { AgreedDocument } from "@/features/documents/types"
import type { DocumentSnapshot } from "./types"

export function agreedDocumentFromSnapshot(
  snapshot: DocumentSnapshot
): AgreedDocument {
  const ops = emptyContractOps()
  ops.parties = snapshot.parties.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    email: "",
    kind: p.kind,
    isSigner: p.isSigner,
    isReviewer: p.isReviewer,
    sortOrder: p.sortOrder,
    signOrder: p.sortOrder,
    userId: null,
  }))
  return {
    id: snapshot.documentId,
    title: snapshot.title,
    status: snapshot.status,
    number: snapshot.number,
    subject: snapshot.subject,
    contractDate: snapshot.contractDate,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.createdAt,
    draft: {
      ...emptyDraft(),
      contentHtml: snapshot.contentHtml,
      comments: [],
    },
    ops,
  }
}
