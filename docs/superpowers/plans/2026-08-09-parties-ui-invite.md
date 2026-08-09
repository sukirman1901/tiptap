# Parties UI + Invite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a thin-list Properti panel (Informasi kontrak + Para pihak + stubs + Properti kustom) bound to `AgreedDocument`, seed two parties on create, and support email invites with server snapshots so guests can open review mode on another device.

**Architecture:** Keep initiator docs in localStorage. Domain helpers seed/sync parties + signatures. Properti UI writes metadata/`ops` via existing `persist`. Invite API stores JSON under `.data/invites/` (InviteRecord + DocumentSnapshot); optional Resend; `/invite/[token]` sets cookie and guest workspace loads snapshot instead of localStorage.

**Tech Stack:** Next.js App Router, Vitest, existing shadcn Input/Label/Button, `resend` package (optional at runtime), `fs` JSON store, existing `ContractOps` / `resolveSystemTokens` / `buildPreviewHtml`

**Spec:** `docs/superpowers/specs/2026-08-09-parties-ui-invite-design.md`

**Locked defaults (open questions):**
1. Initiator `displayName` default `""` (empty; user fills)
2. Redeem does **not** auto-change initiator document status
3. Re-Undang for same partyId **overwrites** snapshot + rotates token record (keep latest)

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/documents/domain/parties.ts` | Create | Seed two parties, add/remove, sync signature stubs, email validation |
| `src/features/documents/domain/parties.test.ts` | Create | Unit tests |
| `src/features/documents/storage/document-store.ts` | Modify | Use `seededContractOps()` in `createDocument` |
| `src/features/documents/storage/document-store.test.ts` | Modify | Assert seeded parties |
| `src/features/invites/types.ts` | Create | InviteRecord, DocumentSnapshot |
| `src/features/invites/store.ts` | Create | Filesystem CRUD under `.data/invites` |
| `src/features/invites/store.test.ts` | Create | Store tests (temp dir) |
| `src/features/invites/snapshot.ts` | Create | Build snapshot from AgreedDocument |
| `src/features/invites/email.ts` | Create | sendInviteEmail (Resend or log) |
| `src/features/invites/email.test.ts` | Create | Mock Resend path |
| `src/app/api/invites/route.ts` | Create | POST create invite |
| `src/app/api/invites/[token]/route.ts` | Create | GET redeem + document |
| `src/app/(web)/invite/[token]/page.tsx` | Create | Redeem UI / redirect |
| `src/features/playground/components/document-properties-panel.tsx` | Create | Thin-list Properti sections |
| `src/features/playground/components/contract-variables-panel.tsx` | Modify | Support heading-less / section embed OR wrap under “Properti kustom” |
| `src/features/playground/ui/index.tsx` | Modify | Wire panel; guest snapshot load |
| `.gitignore` | Modify | `.data/` |
| `.env.example` | Create/Modify | `RESEND_API_KEY`, `INVITE_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL` |
| Spec status | Modify | Approved |

---

### Task 1: Party domain helpers (seed / add / remove / signatures)

**Files:**
- Create: `src/features/documents/domain/parties.ts`
- Create: `src/features/documents/domain/parties.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/features/documents/domain/parties.test.ts
import { describe, expect, it } from "vitest"
import { emptyContractOps } from "./contract-ops"
import {
  addCounterparty,
  isValidEmail,
  removeParty,
  seededContractOps,
  syncSignaturesWithParties,
  updateParty,
} from "./parties"

describe("seededContractOps", () => {
  it("creates initiator + counterparty and matching signature stubs", () => {
    const ops = seededContractOps()
    expect(ops.parties).toHaveLength(2)
    expect(ops.parties[0]!.kind).toBe("initiator")
    expect(ops.parties[1]!.kind).toBe("counterparty")
    expect(ops.parties[0]!.displayName).toBe("")
    expect(ops.signatures).toHaveLength(2)
    expect(ops.signatures.every((s) => s.signedAt === null)).toBe(true)
  })
})

describe("removeParty", () => {
  it("refuses to go below 2 parties", () => {
    const ops = seededContractOps()
    const next = removeParty(ops, ops.parties[1]!.id)
    expect(next.ok).toBe(false)
  })

  it("removes when more than 2", () => {
    let ops = seededContractOps()
    ops = addCounterparty(ops)
    expect(ops.parties).toHaveLength(3)
    const result = removeParty(ops, ops.parties[2]!.id)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.ops.parties).toHaveLength(2)
      expect(result.ops.signatures).toHaveLength(2)
    }
  })
})

describe("isValidEmail", () => {
  it("accepts simple emails", () => {
    expect(isValidEmail("a@b.co")).toBe(true)
    expect(isValidEmail("")).toBe(false)
    expect(isValidEmail("nope")).toBe(false)
  })
})

describe("updateParty", () => {
  it("updates email and keeps signatures aligned", () => {
    const ops = seededContractOps()
    const id = ops.parties[1]!.id
    const next = updateParty(ops, id, { email: "x@y.z" })
    expect(next.parties.find((p) => p.id === id)?.email).toBe("x@y.z")
  })
})

describe("syncSignaturesWithParties", () => {
  it("drops signatures for removed non-signers and keeps signedAt when party remains", () => {
    const ops = seededContractOps()
    ops.signatures[0]!.signedAt = "2026-01-01T00:00:00.000Z"
    const synced = syncSignaturesWithParties(ops)
    expect(synced.signatures[0]!.signedAt).toBe("2026-01-01T00:00:00.000Z")
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm exec vitest run src/features/documents/domain/parties.test.ts`  
Expected: FAIL module not found

- [ ] **Step 3: Implement**

```ts
// src/features/documents/domain/parties.ts
import {
  createParty,
  emptyContractOps,
  type ContractOps,
  type Party,
  type Signature,
} from "./contract-ops"

export type PartyPatch = Partial<
  Pick<Party, "displayName" | "email" | "isSigner" | "isReviewer" | "kind">
>

export function isValidEmail(email: string): boolean {
  const t = email.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export function syncSignaturesWithParties(ops: ContractOps): ContractOps {
  const signers = ops.parties.filter((p) => p.isSigner)
  const signatures: Signature[] = signers.map((party, index) => {
    const existing = ops.signatures.find((s) => s.partyId === party.id)
    return {
      id: existing?.id ?? crypto.randomUUID(),
      partyId: party.id,
      signOrder: party.signOrder || index + 1,
      signedAt: existing?.signedAt ?? null,
      method: existing?.method ?? "demo",
    }
  })
  return { ...ops, signatures }
}

export function seededContractOps(): ContractOps {
  const base = emptyContractOps()
  const p1 = createParty({
    displayName: "",
    kind: "initiator",
    sortOrder: 1,
    signOrder: 1,
    isSigner: true,
    isReviewer: true,
  })
  const p2 = createParty({
    displayName: "",
    kind: "counterparty",
    sortOrder: 2,
    signOrder: 2,
    isSigner: true,
    isReviewer: true,
  })
  return syncSignaturesWithParties({ ...base, parties: [p1, p2] })
}

export function addCounterparty(ops: ContractOps): ContractOps {
  const nextOrder =
    ops.parties.reduce((m, p) => Math.max(m, p.sortOrder), 0) + 1
  const party = createParty({
    displayName: "",
    kind: "counterparty",
    sortOrder: nextOrder,
    signOrder: nextOrder,
    isSigner: true,
    isReviewer: true,
  })
  return syncSignaturesWithParties({
    ...ops,
    parties: [...ops.parties, party],
  })
}

export function removeParty(
  ops: ContractOps,
  partyId: string
): { ok: true; ops: ContractOps } | { ok: false; reason: string } {
  if (ops.parties.length <= 2) {
    return { ok: false, reason: "Minimal dua pihak" }
  }
  const parties = ops.parties.filter((p) => p.id !== partyId)
  if (parties.length === ops.parties.length) {
    return { ok: false, reason: "Pihak tidak ditemukan" }
  }
  return {
    ok: true,
    ops: syncSignaturesWithParties({ ...ops, parties }),
  }
}

export function updateParty(
  ops: ContractOps,
  partyId: string,
  patch: PartyPatch
): ContractOps {
  const parties = ops.parties.map((p) => {
    if (p.id !== partyId) return p
    return {
      ...p,
      ...patch,
      displayName:
        patch.displayName !== undefined
          ? patch.displayName.trim()
          : p.displayName,
      email: patch.email !== undefined ? patch.email.trim() : p.email,
    }
  })
  return syncSignaturesWithParties({ ...ops, parties })
}
```

- [ ] **Step 4: Run tests — PASS**

Run: `pnpm exec vitest run src/features/documents/domain/parties.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/domain/parties.ts src/features/documents/domain/parties.test.ts
git commit -m "feat(documents): add party seed and sync helpers"
```

---

### Task 2: Seed parties in `createDocument`

**Files:**
- Modify: `src/features/documents/storage/document-store.ts`
- Modify: `src/features/documents/storage/document-store.test.ts`

- [ ] **Step 1: Add failing test**

In `document-store.test.ts`:

```ts
  it("seeds two parties on create", () => {
    const doc = createDocument({ title: "Dengan pihak" })
    expect(doc.ops.parties).toHaveLength(2)
    expect(doc.ops.parties[0]!.kind).toBe("initiator")
    expect(doc.ops.parties[1]!.kind).toBe("counterparty")
    expect(doc.ops.signatures).toHaveLength(2)
  })
```

- [ ] **Step 2: Run — expect FAIL** (empty parties from `emptyContractOps`)

Run: `pnpm exec vitest run src/features/documents/storage/document-store.test.ts`

- [ ] **Step 3: Change createDocument**

Replace `ops: emptyContractOps()` with:

```ts
import { seededContractOps } from "../domain/parties"
// ...
ops: seededContractOps(),
```

Remove unused `emptyContractOps` import if unused.

- [ ] **Step 4: Run document-store tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/storage/document-store.ts src/features/documents/storage/document-store.test.ts
git commit -m "feat(documents): seed two parties when creating a document"
```

---

### Task 3: Invite filesystem store + snapshot builder

**Files:**
- Create: `src/features/invites/types.ts`
- Create: `src/features/invites/store.ts`
- Create: `src/features/invites/store.test.ts`
- Create: `src/features/invites/snapshot.ts`
- Create: `src/features/invites/snapshot.test.ts`
- Modify: `.gitignore` — add `.data/`

- [ ] **Step 1: Failing store + snapshot tests**

```ts
// src/features/invites/store.test.ts
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
```

```ts
// src/features/invites/snapshot.test.ts
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
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement types, store, snapshot**

```ts
// src/features/invites/types.ts
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
```

```ts
// src/features/invites/snapshot.ts
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
```

```ts
// src/features/invites/store.ts
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
```

Add `.data/` to `.gitignore`.

- [ ] **Step 4: Tests PASS**

Run: `pnpm exec vitest run src/features/invites`

- [ ] **Step 5: Commit**

```bash
git add src/features/invites .gitignore
git commit -m "feat(invites): add filesystem invite store and document snapshot"
```

---

### Task 4: Email helper + POST `/api/invites`

**Files:**
- Create: `src/features/invites/email.ts`
- Create: `src/features/invites/email.test.ts`
- Create: `src/app/api/invites/route.ts`
- Create/Modify: `.env.example`
- Run: `pnpm add resend` (dependency)

- [ ] **Step 1: Email tests**

```ts
// src/features/invites/email.test.ts
import { afterEach, describe, expect, it, vi } from "vitest"
import { sendInviteEmail } from "./email"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("sendInviteEmail", () => {
  it("logs and skips when no API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    const result = await sendInviteEmail({
      to: "a@b.co",
      documentTitle: "Uji",
      inviteUrl: "http://localhost:3001/invite/abc",
    })
    expect(result.sent).toBe(false)
    expect(log).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Implement email + route**

```ts
// src/features/invites/email.ts
export async function sendInviteEmail(input: {
  to: string
  documentTitle: string
  inviteUrl: string
}): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    console.info("[invite] RESEND_API_KEY missing; link:", input.inviteUrl)
    return { sent: false }
  }
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(key)
    const from =
      process.env.INVITE_FROM_EMAIL?.trim() || "Agreed <onboarding@resend.dev>"
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: `Undangan review: ${input.documentTitle}`,
      text: `Anda diundang mereview perjanjian "${input.documentTitle}".\n\nBuka tautan ini:\n${input.inviteUrl}\n`,
    })
    if (error) return { sent: false, error: error.message }
    return { sent: true }
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : "Gagal mengirim email",
    }
  }
}
```

```ts
// src/app/api/invites/route.ts
import { NextResponse } from "next/server"
import { isValidEmail } from "@/features/documents/domain/parties"
import { buildDocumentSnapshot } from "@/features/invites/snapshot"
import { createInvite, markSent } from "@/features/invites/store"
import { sendInviteEmail } from "@/features/invites/email"
import type { AgreedDocument } from "@/features/documents/types"
import { migrateDocument } from "@/features/documents/storage/migrate-document"

export async function POST(req: Request) {
  const body = (await req.json()) as {
    document?: unknown
    partyId?: string
  }
  if (!body.partyId || !body.document) {
    return NextResponse.json({ error: "Payload tidak lengkap" }, { status: 400 })
  }
  const doc = migrateDocument(body.document) as AgreedDocument
  const party = doc.ops.parties.find((p) => p.id === body.partyId)
  if (!party) {
    return NextResponse.json({ error: "Pihak tidak ditemukan" }, { status: 404 })
  }
  if (!isValidEmail(party.email)) {
    return NextResponse.json({ error: "Email pihak tidak valid" }, { status: 400 })
  }
  const snapshot = buildDocumentSnapshot(doc)
  const invite = createInvite({
    documentId: doc.id,
    partyId: party.id,
    email: party.email,
    snapshot,
    ttlDays: 14,
  })
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin
  const inviteUrl = `${base}/invite/${invite.token}`
  const mail = await sendInviteEmail({
    to: party.email,
    documentTitle: doc.title,
    inviteUrl,
  })
  if (mail.sent) markSent(invite.token)
  return NextResponse.json({
    token: invite.token,
    inviteUrl,
    emailSent: mail.sent,
    emailError: mail.error ?? null,
  })
}
```

`.env.example`:

```
NEXT_PUBLIC_APP_URL=http://localhost:3001
RESEND_API_KEY=
INVITE_FROM_EMAIL=Agreed <onboarding@resend.dev>
```

- [ ] **Step 3: `pnpm add resend` + run email tests PASS**

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/features/invites/email.ts src/features/invites/email.test.ts src/app/api/invites/route.ts .env.example
git commit -m "feat(invites): add invite API and optional Resend email"
```

---

### Task 5: Redeem route + invite page

**Files:**
- Create: `src/app/api/invites/[token]/route.ts`
- Create: `src/app/(web)/invite/[token]/page.tsx`
- Create: `src/features/invites/cookie.ts` (cookie name constant)

- [ ] **Step 1: Implement GET API**

```ts
// src/app/api/invites/[token]/route.ts
import { NextResponse } from "next/server"
import { getInviteByToken, markRedeemed } from "@/features/invites/store"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params
  const invite = getInviteByToken(token)
  if (!invite) {
    return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 })
  }
  if (invite.status === "expired") {
    return NextResponse.json({ error: "Undangan kedaluwarsa" }, { status: 410 })
  }
  markRedeemed(token)
  return NextResponse.json({
    documentId: invite.documentId,
    partyId: invite.partyId,
    snapshot: invite.snapshot,
  })
}
```

- [ ] **Step 2: Invite page (server redirect helper via client redeem)**

```tsx
// src/app/(web)/invite/[token]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

const COOKIE = "agreed_invite_token"

export default function InviteRedeemPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/invites/${token}`)
      const data = await res.json()
      if (cancelled) return
      if (!res.ok) {
        setError(data.error || "Undangan tidak valid")
        return
      }
      document.cookie = `${COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${14 * 86400}; samesite=lax`
      sessionStorage.setItem(
        `agreed:snapshot:${data.documentId}`,
        JSON.stringify(data.snapshot)
      )
      router.replace(`/dokumen/${data.documentId}?review=1&invite=1`)
    })()
    return () => {
      cancelled = true
    }
  }, [token, router])

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Undangan tidak dapat dibuka</h1>
        <p className="text-muted-foreground mt-2 text-sm">{error}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Minta pengirim mengundang ulang.
        </p>
        <Link href="/dokumen" className="mt-6 inline-block text-sm underline">
          Ke beranda
        </Link>
      </div>
    )
  }

  return (
    <div className="text-muted-foreground mx-auto max-w-md px-4 py-16 text-center text-sm">
      Membuka undangan…
    </div>
  )
}
```

- [ ] **Step 3: Manual smoke** — `pnpm run dev`, POST invite with curl using a minimal document JSON, open `/invite/{token}`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/invites/[token]/route.ts "src/app/(web)/invite/[token]/page.tsx"
git commit -m "feat(invites): redeem invite token and redirect to review"
```

---

### Task 6: Guest snapshot load in playground

**Files:**
- Modify: `src/features/playground/ui/index.tsx`

- [ ] **Step 1: When `invite=1` (or cookie present), load snapshot into a synthetic AgreedDocument for display**

Add helper in same file or `src/features/invites/guest-document.ts`:

```ts
// src/features/invites/guest-document.ts
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
```

In `PlaygroundInner` load effect:

```ts
  const inviteMode = searchParams.get("invite") === "1"

  useEffect(() => {
    if (!documentId) {
      setDoc(null)
      return
    }
    if (inviteMode) {
      const raw = sessionStorage.getItem(`agreed:snapshot:${documentId}`)
      if (raw) {
        const snap = JSON.parse(raw) as DocumentSnapshot
        setDoc(agreedDocumentFromSnapshot(snap))
        return
      }
      setDoc(null)
      return
    }
    setDoc(loadDocument(documentId))
  }, [documentId, inviteMode])
```

Guest `persist` for draft comments only writes sessionStorage comments key (or skip saveDocument when inviteMode):

```ts
  const persist = useCallback((next: AgreedDocument) => {
    docRef.current = next
    if (!inviteMode) saveDocument(next)
    else {
      sessionStorage.setItem(
        `agreed:guest-comments:${next.id}`,
        JSON.stringify(next.draft.comments)
      )
    }
    setDoc(next)
  }, [inviteMode])
```

On invite load, merge guest comments from session if present.

- [ ] **Step 2: Verify TypeScript / manual guest path**

- [ ] **Step 3: Commit**

```bash
git add src/features/invites/guest-document.ts src/features/playground/ui/index.tsx
git commit -m "feat(playground): load invite snapshot for guest review"
```

---

### Task 7: Document properties panel (thin list UI)

**Files:**
- Create: `src/features/playground/components/document-properties-panel.tsx`
- Modify: `src/features/playground/components/contract-variables-panel.tsx` — add optional `hideChromeTitle?: boolean` if needed; or render variables section without outer “Properti” h2 when embedded
- Modify: `src/features/playground/ui/index.tsx` — replace `ContractVariablesPanel` alone with `DocumentPropertiesPanel`
- Modify: `src/features/playground/components/index.ts` — export new panel

- [ ] **Step 1: Implement panel** (structure; keep styling minimal)

Props:

```ts
export type DocumentPropertiesPanelProps = {
  document: AgreedDocument
  onChange: (next: AgreedDocument) => void
  bare?: boolean
  className?: string
}
```

Sections:
1. INFORMASI KONTRAK — Input number, date, subject → patch document fields via `onChange`
2. PARA PIHAK — map parties; Input name/email; text “Signer”/“Reviewer”; Undang button calls `fetch('/api/invites', { method:'POST', body: JSON.stringify({ document, partyId }) })` then show `inviteUrl` in a small read-only input + copy; disable Undang if `!isValidEmail(email)` or `kind === 'initiator'` (only invite counterparties by default)
3. LAINNYA — rows Pembayaran / Jangka waktu / Dokumen terkait using `formatTempoLabel` and milestone/attachment counts
4. Embed `<ContractVariablesPanel draft={document.draft} onChange={...} bare />` under heading “Properti kustom” (strip duplicate top title inside variables panel via prop `embedded`)

Undang UX: on success set local state `inviteLinks[partyId] = inviteUrl` and short feedback string; if `emailError`, show muted text but still show link.

- [ ] **Step 2: Wire in `ui/index.tsx`**

```tsx
const propertiesPanel = (
  <DocumentPropertiesPanel
    document={doc}
    onChange={persist}
    bare
  />
)
// use propertiesPanel where variablesPanel was used (initiator edit mode)
```

- [ ] **Step 3: Visual check at `/dokumen/{id}` — thin list, no AI/avatars**

- [ ] **Step 4: Commit**

```bash
git add src/features/playground/components/document-properties-panel.tsx src/features/playground/components/contract-variables-panel.tsx src/features/playground/ui/index.tsx src/features/playground/components/index.ts
git commit -m "feat(ui): add thin-list Properti panel for metadata and parties"
```

---

### Task 8: Spec approved + full test pass

**Files:**
- Modify: `docs/superpowers/specs/2026-08-09-parties-ui-invite-design.md` status → `Approved`

- [ ] **Step 1: Update status line**

- [ ] **Step 2: Run `pnpm test` and `pnpm exec tsc --noEmit`**

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-09-parties-ui-invite-design.md
git commit -m "docs: mark parties UI invite spec approved"
```

---

## Self-review

| Spec item | Task |
|-----------|------|
| Thin-list Properti sections | 7 |
| Metadata bind | 7 |
| Seed 2 parties | 1–2 |
| Invite + Resend optional + link | 3–4 |
| Snapshot guest | 3, 5–6 |
| Custom fields preserved | 7 |
| No AI/risk | 7 (omitted) |
| Min 2 parties | 1 |

No TBD steps. Types: `InviteRecord`, `DocumentSnapshot`, `seededContractOps`, `createInvite` consistent across tasks.

---

## After this plan

Next plans: payment/tempo editors behind Lainnya rows; guest comment sync; real auth.
