import { beforeEach, describe, expect, it } from "vitest"
import {
  createDocument,
  deleteDocument,
  DOCUMENTS_KEY,
  DOCUMENTS_KEY_LEGACY,
  listDocuments,
  loadDocument,
  renameDocument,
  saveDocument,
} from "./document-store"
import { migrateDocument } from "./migrate-document"
import { emptyDraft } from "@/features/playground/components/contract-draft"

function installLocalStorage() {
  const store = new Map<string, string>()
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
  })
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  })
}

installLocalStorage()

beforeEach(() => {
  localStorage.clear()
})

describe("document-store", () => {
  it("creates and lists a document", () => {
    const doc = createDocument({ title: "Perjanjian uji", draft: emptyDraft() })
    expect(doc.id).toBeTruthy()
    expect(doc.status).toBe("draf")
    expect(listDocuments()).toHaveLength(1)
    expect(loadDocument(doc.id)?.title).toBe("Perjanjian uji")
  })

  it("updates status on save", () => {
    const doc = createDocument({ title: "X", draft: emptyDraft() })
    saveDocument({ ...doc, status: "dalam_review" })
    expect(loadDocument(doc.id)?.status).toBe("dalam_review")
  })

  it("renames a document", () => {
    const doc = createDocument({ title: "Lama", draft: emptyDraft() })
    const next = renameDocument(doc.id, "Baru")
    expect(next?.title).toBe("Baru")
    expect(loadDocument(doc.id)?.title).toBe("Baru")
  })

  it("deletes a document", () => {
    const doc = createDocument({ title: "Hapus saya", draft: emptyDraft() })
    expect(deleteDocument(doc.id)).toBe(true)
    expect(listDocuments()).toHaveLength(0)
    expect(loadDocument(doc.id)).toBeNull()
  })

  it("seeds ops and metadata on create", () => {
    const doc = createDocument({ title: "Baru", draft: emptyDraft() })
    expect(doc.number).toBeNull()
    expect(doc.subject).toBeNull()
    expect(doc.contractDate).toBeNull()
    expect(doc.ops.paymentPlan.currency).toBe("IDR")
    expect(loadDocument(doc.id)?.ops.paymentPlan.id).toBe(doc.ops.paymentPlan.id)
  })

  it("seeds two parties on create", () => {
    const doc = createDocument({ title: "Dengan pihak" })
    expect(doc.ops.parties).toHaveLength(2)
    expect(doc.ops.parties[0]!.kind).toBe("initiator")
    expect(doc.ops.parties[1]!.kind).toBe("counterparty")
    expect(doc.ops.signatures).toHaveLength(2)
  })

  it("migrates legacy v1 documents from old key", () => {
    const legacy = {
      id: "legacy-1",
      title: "Legacy",
      status: "draf",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      draft: emptyDraft(),
    }
    localStorage.setItem(DOCUMENTS_KEY_LEGACY, JSON.stringify([legacy]))
    const listed = listDocuments()
    expect(listed).toHaveLength(1)
    expect(listed[0]!.id).toBe("legacy-1")
    expect(listed[0]!.ops.stamp.status).toBe("not_required")
    // rewritten to v2 key
    expect(localStorage.getItem(DOCUMENTS_KEY)).toBeTruthy()
  })

  it("round-trips ops through saveDocument", () => {
    const doc = createDocument({ title: "Ops", draft: emptyDraft() })
    const next = migrateDocument({
      ...doc,
      number: "AGD-9",
      ops: {
        ...doc.ops,
        stamp: { required: true, status: "pending", attachedAt: null },
      },
    })
    saveDocument(next)
    expect(loadDocument(doc.id)?.number).toBe("AGD-9")
    expect(loadDocument(doc.id)?.ops.stamp.required).toBe(true)
  })
})
