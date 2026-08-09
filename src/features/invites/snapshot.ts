import { buildPreviewHtml } from "@/features/playground/components/contract-draft"
import type { AgreedDocument } from "@/features/documents/types"
import type { DocumentSnapshot } from "./types"

export function buildDocumentSnapshot(doc: AgreedDocument): DocumentSnapshot {
  return {
    documentId: doc.id,
    title: doc.title,
    number: doc.number,
    subject: doc.subject,
    contractDate: doc.contractDate,
    status: doc.status,
    contentHtml: buildPreviewHtml(doc.draft),
    parties: [...doc.ops.parties]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        kind: p.kind,
        sortOrder: p.sortOrder,
        isSigner: p.isSigner,
        isReviewer: p.isReviewer,
      })),
    createdAt: new Date().toISOString(),
  }
}
