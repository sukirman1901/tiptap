import { describe, expect, it } from "vitest"
import { emptyDraft } from "@/features/playground/components/contract-draft"
import { migrateDocument } from "./migrate-document"

describe("migrateDocument", () => {
  it("fills ops and metadata on legacy v1 shape", () => {
    const legacy = {
      id: "doc-1",
      title: "Lama",
      status: "draf",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      draft: emptyDraft(),
    }
    const next = migrateDocument(legacy)
    expect(next.number).toBeNull()
    expect(next.subject).toBeNull()
    expect(next.contractDate).toBeNull()
    expect(next.ops.parties).toEqual([])
    expect(next.ops.paymentPlan.lockedAt).toBeNull()
    expect(next.ops.stamp.required).toBe(false)
    expect(next.draft).toEqual(emptyDraft())
  })

  it("preserves existing ops when already present", () => {
    const base = migrateDocument({
      id: "doc-2",
      title: "X",
      status: "draf",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      draft: emptyDraft(),
    })
    base.number = "AGD-1"
    base.ops.stamp.required = true
    base.ops.stamp.status = "pending"
    const again = migrateDocument(base)
    expect(again.number).toBe("AGD-1")
    expect(again.ops.stamp.required).toBe(true)
    expect(again.ops.stamp.status).toBe("pending")
  })
})
