import { describe, expect, it } from "vitest"
import { emptyDraft } from "@/features/playground/components/contract-draft"
import { seededContractOps } from "@/features/documents/domain/parties"
import { buildDocumentSnapshot } from "./snapshot"
import type { AgreedDocument } from "@/features/documents/types"

describe("buildDocumentSnapshot", () => {
  it("copies public fields and preview html", () => {
    const doc: AgreedDocument = {
      id: "d1",
      title: "Kontrak",
      status: "draf",
      number: "AGD-1",
      subject: "Web",
      contractDate: "2026-08-09",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      draft: { ...emptyDraft(), contentHtml: "<p>Isi</p>" },
      ops: seededContractOps(),
    }
    const snap = buildDocumentSnapshot(doc)
    expect(snap.documentId).toBe("d1")
    expect(snap.number).toBe("AGD-1")
    expect(snap.parties).toHaveLength(2)
    expect(snap.contentHtml).toContain("Isi")
  })
})
