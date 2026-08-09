import fs from "node:fs"
import path from "node:path"
import type { DocumentSnapshot, InviteRecord } from "./types"

let testDir: string | null = null

export function setInvitesDataDirForTests(dir: string | null) {
  testDir = dir
}

function dataDir(): string {
  if (testDir) return testDir
  return path.join(process.cwd(), ".data", "invites")
}

function ensureDir() {
  fs.mkdirSync(dataDir(), { recursive: true })
}

function filePath(token: string) {
  return path.join(dataDir(), `${token}.json`)
}

export function createInvite(input: {
  documentId: string
  partyId: string
  email: string
  snapshot: DocumentSnapshot
  ttlDays: number
}): InviteRecord {
  ensureDir()
  // Overwrite prior pending invites for same documentId+partyId
  for (const name of fs.readdirSync(dataDir())) {
    if (!name.endsWith(".json")) continue
    const raw = JSON.parse(
      fs.readFileSync(path.join(dataDir(), name), "utf8")
    ) as InviteRecord
    if (
      raw.documentId === input.documentId &&
      raw.partyId === input.partyId &&
      raw.status !== "redeemed"
    ) {
      fs.unlinkSync(path.join(dataDir(), name))
    }
  }
  const now = Date.now()
  const token = crypto.randomUUID().replace(/-/g, "")
  const record: InviteRecord = {
    token,
    documentId: input.documentId,
    partyId: input.partyId,
    email: input.email.trim(),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + input.ttlDays * 86400000).toISOString(),
    redeemedAt: null,
    status: "pending",
    snapshot: input.snapshot,
  }
  fs.writeFileSync(filePath(token), JSON.stringify(record, null, 2), "utf8")
  return record
}

export function getInviteByToken(token: string): InviteRecord | null {
  const fp = filePath(token)
  if (!fs.existsSync(fp)) return null
  const record = JSON.parse(fs.readFileSync(fp, "utf8")) as InviteRecord
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    if (record.status !== "expired") {
      record.status = "expired"
      fs.writeFileSync(fp, JSON.stringify(record, null, 2), "utf8")
    }
  }
  return record
}

export function markRedeemed(token: string): InviteRecord | null {
  const record = getInviteByToken(token)
  if (!record || record.status === "expired") return null
  record.status = "redeemed"
  record.redeemedAt = new Date().toISOString()
  fs.writeFileSync(filePath(token), JSON.stringify(record, null, 2), "utf8")
  return record
}

export function markSent(token: string): void {
  const record = getInviteByToken(token)
  if (!record) return
  if (record.status === "pending") {
    record.status = "sent"
    fs.writeFileSync(filePath(token), JSON.stringify(record, null, 2), "utf8")
  }
}
