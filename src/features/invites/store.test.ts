import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  createInvite,
  getInviteByToken,
  markRedeemed,
  setInvitesDataDirForTests,
} from "./store"
import type { DocumentSnapshot } from "./types"

const sampleSnapshot = (): DocumentSnapshot => ({
  documentId: "doc-1",
  title: "Uji",
  number: null,
  subject: null,
  contractDate: null,
  status: "draf",
  contentHtml: "<p>Hi</p>",
  parties: [],
  createdAt: "2026-08-09T00:00:00.000Z",
})

describe("invite store", () => {
  let dir: string
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "agreed-invites-"))
    setInvitesDataDirForTests(dir)
  })
  afterEach(() => {
    setInvitesDataDirForTests(null)
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it("creates and loads an invite with snapshot", () => {
    const created = createInvite({
      documentId: "doc-1",
      partyId: "p2",
      email: "a@b.co",
      snapshot: sampleSnapshot(),
      ttlDays: 14,
    })
    expect(created.token).toBeTruthy()
    const loaded = getInviteByToken(created.token)
    expect(loaded?.email).toBe("a@b.co")
    expect(loaded?.snapshot.contentHtml).toBe("<p>Hi</p>")
  })

  it("rejects path traversal tokens", () => {
    expect(getInviteByToken("../etc/passwd")).toBeNull()
  })

  it("marks redeemed", () => {
    const created = createInvite({
      documentId: "doc-1",
      partyId: "p2",
      email: "a@b.co",
      snapshot: sampleSnapshot(),
      ttlDays: 14,
    })
    markRedeemed(created.token)
    expect(getInviteByToken(created.token)?.status).toBe("redeemed")
    expect(getInviteByToken(created.token)?.redeemedAt).toBeTruthy()
  })
})
