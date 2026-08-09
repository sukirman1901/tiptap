# Contract Data Model (Types + Persistence) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed Layer B contract-ops graph (parties, payment plan/milestones, tempo, signatures, stamp, attachments) plus contract metadata and lock/token-bridge domain rules on top of the existing local `AgreedDocument` store—without building ops UI yet.

**Architecture:** Keep TipTap `draft` (contentHtml + fields/values + comments) as Layer A. Add sibling `ops: ContractOps` and metadata (`number`, `subject`, `contractDate`) on `AgreedDocument`. Pure domain modules own lock + milestone validation + system tokens. Bump localStorage key and migrate v1 docs on read. No DB/auth/UI panels in this plan.

**Tech Stack:** TypeScript, Vitest, existing `document-store` localStorage pattern, Next.js App Router (types only—no new routes)

**Spec:** `docs/superpowers/specs/2026-08-09-contract-data-model-design.md`

**MVP defaults for open questions:**
1. `number` uniqueness — not enforced locally (display/search only)
2. Payment plan `mode: "percent" | "amount"` — **forced XOR** per plan
3. Lock lifecycle gate uses status `selesai` **or** all signers signed (lock may fire when signing completes; UI may set `selesai` in a later plan)
4. `Stamp.required` default **`false`**

**Deferred (separate plans — do not implement here):**
- Parties UI + invite
- Payment / milestones UI + lock UX
- Tempo + attachments UI
- Real e-sign / e-materai providers
- Addendum after lock
- Server/DB persistence

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/documents/domain/contract-ops.ts` | Create | Party, PaymentPlan, Milestone, Tempo, Signature, Stamp, Attachment, ContractOps types + factories |
| `src/features/documents/domain/contract-ops.test.ts` | Create | Factory / empty-ops shape tests |
| `src/features/documents/domain/payment-lock.ts` | Create | `canLockPaymentPlan`, `assertPlanEditable`, percent-sum validation |
| `src/features/documents/domain/payment-lock.test.ts` | Create | Lock rule + mutation guard tests |
| `src/features/documents/domain/system-tokens.ts` | Create | Reserved token names + `resolveSystemTokens(doc)` |
| `src/features/documents/domain/system-tokens.test.ts` | Create | Token resolution + collision blocklist tests |
| `src/features/documents/types.ts` | Modify | Extend `AgreedDocument` with metadata + `ops` |
| `src/features/documents/storage/migrate-document.ts` | Create | Normalize legacy docs → v2 shape |
| `src/features/documents/storage/migrate-document.test.ts` | Create | Migration tests |
| `src/features/documents/storage/document-store.ts` | Modify | Key `v2`, migrate on read, seed `ops` on create |
| `src/features/documents/storage/document-store.test.ts` | Modify | Assert new fields; v1 → v2 migration |
| `docs/superpowers/specs/2026-08-09-contract-data-model-design.md` | Modify | Status → Approved |

---

### Task 1: Contract ops types + empty factories

**Files:**
- Create: `src/features/documents/domain/contract-ops.ts`
- Create: `src/features/documents/domain/contract-ops.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/documents/domain/contract-ops.test.ts
import { describe, expect, it } from "vitest"
import {
  emptyContractOps,
  emptyPaymentPlan,
  emptyStamp,
  emptyTempo,
} from "./contract-ops"

describe("emptyContractOps", () => {
  it("starts with no parties, unlocked percent plan, optional stamp", () => {
    const ops = emptyContractOps()
    expect(ops.parties).toEqual([])
    expect(ops.signatures).toEqual([])
    expect(ops.attachments).toEqual([])
    expect(ops.paymentPlan.mode).toBe("percent")
    expect(ops.paymentPlan.currency).toBe("IDR")
    expect(ops.paymentPlan.lockedAt).toBeNull()
    expect(ops.paymentPlan.milestones).toEqual([])
    expect(ops.tempo).toEqual(emptyTempo())
    expect(ops.stamp).toEqual(emptyStamp())
    expect(ops.stamp.required).toBe(false)
    expect(ops.stamp.status).toBe("not_required")
  })
})

describe("emptyPaymentPlan", () => {
  it("creates a fresh unlocked plan id", () => {
    const a = emptyPaymentPlan()
    const b = emptyPaymentPlan()
    expect(a.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/features/documents/domain/contract-ops.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/documents/domain/contract-ops.ts
export type PartyKind = "initiator" | "counterparty"

export type Party = {
  id: string
  displayName: string
  email: string
  kind: PartyKind
  isSigner: boolean
  isReviewer: boolean
  /** 1-based display order among parties (Pihak Pertama = 1) */
  sortOrder: number
  /** Order among signers only; ignored if !isSigner */
  signOrder: number
  userId: string | null
}

export type MilestoneStatus = "planned" | "invoiced" | "paid" | "cancelled"

export type Milestone = {
  id: string
  sortOrder: number
  label: string
  /** Used when plan.mode === "percent"; else null */
  percent: number | null
  /** Digit string minor units / whole IDR digits when mode === "amount"; else null */
  amount: string | null
  dueDate: string | null
  status: MilestoneStatus
  paidAt: string | null
}

export type PaymentPlanMode = "percent" | "amount"

export type PaymentPlan = {
  id: string
  currency: string
  mode: PaymentPlanMode
  lockedAt: string | null
  milestones: Milestone[]
}

export type Tempo = {
  startDate: string | null
  endDate: string | null
  durationDays: number | null
}

export type SignatureMethod = "demo"

export type Signature = {
  id: string
  partyId: string
  signOrder: number
  signedAt: string | null
  method: SignatureMethod
}

export type StampStatus = "not_required" | "pending" | "attached"

export type Stamp = {
  required: boolean
  status: StampStatus
  attachedAt: string | null
}

export type Attachment = {
  id: string
  name: string
  url: string
  uploadedAt: string
}

export type ContractOps = {
  parties: Party[]
  paymentPlan: PaymentPlan
  tempo: Tempo
  signatures: Signature[]
  stamp: Stamp
  attachments: Attachment[]
}

export function emptyTempo(): Tempo {
  return { startDate: null, endDate: null, durationDays: null }
}

export function emptyStamp(): Stamp {
  return { required: false, status: "not_required", attachedAt: null }
}

export function emptyPaymentPlan(
  overrides?: Partial<Pick<PaymentPlan, "mode" | "currency">>
): PaymentPlan {
  return {
    id: crypto.randomUUID(),
    currency: overrides?.currency ?? "IDR",
    mode: overrides?.mode ?? "percent",
    lockedAt: null,
    milestones: [],
  }
}

export function emptyContractOps(): ContractOps {
  return {
    parties: [],
    paymentPlan: emptyPaymentPlan(),
    tempo: emptyTempo(),
    signatures: [],
    stamp: emptyStamp(),
    attachments: [],
  }
}

export function createParty(input: {
  displayName: string
  kind: PartyKind
  sortOrder: number
  email?: string
  isSigner?: boolean
  isReviewer?: boolean
  signOrder?: number
}): Party {
  return {
    id: crypto.randomUUID(),
    displayName: input.displayName.trim(),
    email: (input.email ?? "").trim(),
    kind: input.kind,
    isSigner: input.isSigner ?? true,
    isReviewer: input.isReviewer ?? true,
    sortOrder: input.sortOrder,
    signOrder: input.signOrder ?? input.sortOrder,
    userId: null,
  }
}

export function createMilestone(input: {
  label: string
  sortOrder: number
  mode: PaymentPlanMode
  percent?: number | null
  amount?: string | null
  dueDate?: string | null
}): Milestone {
  const percent =
    input.mode === "percent" ? (input.percent ?? 0) : null
  const amount =
    input.mode === "amount" ? (input.amount ?? "") : null
  return {
    id: crypto.randomUUID(),
    sortOrder: input.sortOrder,
    label: input.label.trim() || `Termin ${input.sortOrder}`,
    percent,
    amount,
    dueDate: input.dueDate ?? null,
    status: "planned",
    paidAt: null,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/features/documents/domain/contract-ops.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/domain/contract-ops.ts src/features/documents/domain/contract-ops.test.ts
git commit -m "feat(documents): add ContractOps types and empty factories"
```

---

### Task 2: Payment plan lock + milestone validation

**Files:**
- Create: `src/features/documents/domain/payment-lock.ts`
- Create: `src/features/documents/domain/payment-lock.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/documents/domain/payment-lock.test.ts
import { describe, expect, it } from "vitest"
import {
  createMilestone,
  createParty,
  emptyContractOps,
  type ContractOps,
} from "./contract-ops"
import {
  assertPlanEditable,
  canLockPaymentPlan,
  milestonesPercentSum,
  validateMilestonesForLock,
} from "./payment-lock"

function opsReadyToLock(): ContractOps {
  const ops = emptyContractOps()
  const p1 = createParty({
    displayName: "A",
    kind: "initiator",
    sortOrder: 1,
    signOrder: 1,
  })
  const p2 = createParty({
    displayName: "B",
    kind: "counterparty",
    sortOrder: 2,
    signOrder: 2,
  })
  ops.parties = [p1, p2]
  ops.signatures = [
    {
      id: "s1",
      partyId: p1.id,
      signOrder: 1,
      signedAt: "2026-08-01T00:00:00.000Z",
      method: "demo",
    },
    {
      id: "s2",
      partyId: p2.id,
      signOrder: 2,
      signedAt: "2026-08-02T00:00:00.000Z",
      method: "demo",
    },
  ]
  ops.paymentPlan.milestones = [
    createMilestone({ label: "DP", sortOrder: 1, mode: "percent", percent: 50 }),
    createMilestone({ label: "Pelunasan", sortOrder: 2, mode: "percent", percent: 50 }),
  ]
  return ops
}

describe("milestonesPercentSum", () => {
  it("sums percents", () => {
    const ops = opsReadyToLock()
    expect(milestonesPercentSum(ops.paymentPlan.milestones)).toBe(100)
  })
})

describe("validateMilestonesForLock", () => {
  it("requires sum 100 in percent mode", () => {
    const ops = opsReadyToLock()
    ops.paymentPlan.milestones[0]!.percent = 40
    expect(validateMilestonesForLock(ops.paymentPlan).ok).toBe(false)
  })

  it("requires non-empty amount digits in amount mode", () => {
    const ops = emptyContractOps()
    ops.paymentPlan.mode = "amount"
    ops.paymentPlan.milestones = [
      createMilestone({
        label: "DP",
        sortOrder: 1,
        mode: "amount",
        amount: "",
      }),
    ]
    expect(validateMilestonesForLock(ops.paymentPlan).ok).toBe(false)
  })
})

describe("canLockPaymentPlan", () => {
  it("locks when all signers signed, stamp ok, milestones valid", () => {
    expect(canLockPaymentPlan(opsReadyToLock()).ok).toBe(true)
  })

  it("fails when a signer has not signed", () => {
    const ops = opsReadyToLock()
    ops.signatures[1]!.signedAt = null
    expect(canLockPaymentPlan(ops).ok).toBe(false)
  })

  it("requires stamp attached when stamp.required", () => {
    const ops = opsReadyToLock()
    ops.stamp = { required: true, status: "pending", attachedAt: null }
    expect(canLockPaymentPlan(ops).ok).toBe(false)
    ops.stamp = {
      required: true,
      status: "attached",
      attachedAt: "2026-08-01T00:00:00.000Z",
    }
    expect(canLockPaymentPlan(ops).ok).toBe(true)
  })

  it("fails when already locked", () => {
    const ops = opsReadyToLock()
    ops.paymentPlan.lockedAt = "2026-08-03T00:00:00.000Z"
    expect(canLockPaymentPlan(ops).ok).toBe(false)
  })
})

describe("assertPlanEditable", () => {
  it("throws when locked", () => {
    const ops = opsReadyToLock()
    ops.paymentPlan.lockedAt = "2026-08-03T00:00:00.000Z"
    expect(() => assertPlanEditable(ops.paymentPlan)).toThrow(/locked/i)
  })

  it("allows when unlocked", () => {
    expect(() => assertPlanEditable(opsReadyToLock().paymentPlan)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/features/documents/domain/payment-lock.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/documents/domain/payment-lock.ts
import type { ContractOps, Milestone, PaymentPlan } from "./contract-ops"

export type LockResult =
  | { ok: true }
  | { ok: false; reason: string }

export function milestonesPercentSum(milestones: Milestone[]): number {
  return milestones.reduce((sum, m) => sum + (m.percent ?? 0), 0)
}

export function validateMilestonesForLock(plan: PaymentPlan): LockResult {
  const active = plan.milestones.filter((m) => m.status !== "cancelled")
  if (active.length === 0) {
    return { ok: false, reason: "At least one milestone is required" }
  }
  if (plan.mode === "percent") {
    const sum = milestonesPercentSum(active)
    if (sum !== 100) {
      return { ok: false, reason: `Percent milestones must sum to 100 (got ${sum})` }
    }
    for (const m of active) {
      if (m.percent == null || m.percent < 0) {
        return { ok: false, reason: `Invalid percent on milestone ${m.id}` }
      }
    }
    return { ok: true }
  }
  for (const m of active) {
    if (!m.amount || !/^\d+$/.test(m.amount) || m.amount === "0") {
      return { ok: false, reason: `Invalid amount on milestone ${m.id}` }
    }
  }
  return { ok: true }
}

export function canLockPaymentPlan(ops: ContractOps): LockResult {
  if (ops.paymentPlan.lockedAt) {
    return { ok: false, reason: "Payment plan is already locked" }
  }
  const signers = ops.parties.filter((p) => p.isSigner)
  if (signers.length === 0) {
    return { ok: false, reason: "At least one signer is required" }
  }
  for (const party of signers) {
    const sig = ops.signatures.find((s) => s.partyId === party.id)
    if (!sig?.signedAt) {
      return { ok: false, reason: `Signer ${party.displayName || party.id} has not signed` }
    }
  }
  if (ops.stamp.required && ops.stamp.status !== "attached") {
    return { ok: false, reason: "Materai is required but not attached" }
  }
  const milestones = validateMilestonesForLock(ops.paymentPlan)
  if (!milestones.ok) return milestones
  return { ok: true }
}

/** Call before mutating milestone set / percents / amounts / mode. */
export function assertPlanEditable(plan: PaymentPlan): void {
  if (plan.lockedAt) {
    throw new Error("Payment plan is locked")
  }
}

export function lockPaymentPlan(ops: ContractOps, now = new Date()): ContractOps {
  const check = canLockPaymentPlan(ops)
  if (!check.ok) {
    throw new Error(check.reason)
  }
  return {
    ...ops,
    paymentPlan: {
      ...ops.paymentPlan,
      lockedAt: now.toISOString(),
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/features/documents/domain/payment-lock.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/domain/payment-lock.ts src/features/documents/domain/payment-lock.test.ts
git commit -m "feat(documents): add payment plan lock and milestone validation"
```

---

### Task 3: System merge tokens (bridge)

**Files:**
- Create: `src/features/documents/domain/system-tokens.ts`
- Create: `src/features/documents/domain/system-tokens.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/documents/domain/system-tokens.test.ts
import { describe, expect, it } from "vitest"
import { emptyContractOps, createParty } from "./contract-ops"
import {
  SYSTEM_TOKEN_NAMES,
  isReservedToken,
  resolveSystemTokens,
  formatTempoLabel,
} from "./system-tokens"
import type { DocumentStatus } from "./status"

const baseMeta = {
  number: "AGD-2026-0001",
  subject: "Pembuatan website",
  contractDate: "2026-08-09",
  status: "draf" as DocumentStatus,
}

describe("isReservedToken", () => {
  it("blocks system names", () => {
    expect(isReservedToken("pihak_pertama")).toBe(true)
    expect(isReservedToken("klausul_khusus")).toBe(false)
  })
})

describe("formatTempoLabel", () => {
  it("prefers durationDays", () => {
    expect(
      formatTempoLabel({ startDate: null, endDate: null, durationDays: 90 })
    ).toBe("90 hari")
  })

  it("derives days from start/end when duration missing", () => {
    expect(
      formatTempoLabel({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        durationDays: null,
      })
    ).toBe("30 hari")
  })
})

describe("resolveSystemTokens", () => {
  it("maps metadata and parties", () => {
    const ops = emptyContractOps()
    ops.parties = [
      createParty({ displayName: "PT Alpha", kind: "initiator", sortOrder: 1 }),
      createParty({ displayName: "PT Beta", kind: "counterparty", sortOrder: 2 }),
    ]
    ops.tempo = { startDate: null, endDate: null, durationDays: 90 }
    const tokens = resolveSystemTokens({ ...baseMeta, ops })
    expect(tokens.nomor_kontrak).toBe("AGD-2026-0001")
    expect(tokens.perihal).toBe("Pembuatan website")
    expect(tokens.tanggal_kontrak).toBe("2026-08-09")
    expect(tokens.pihak_pertama).toBe("PT Alpha")
    expect(tokens.pihak_kedua).toBe("PT Beta")
    expect(tokens.jangka_waktu).toBe("90 hari")
    expect(Object.keys(tokens).sort()).toEqual([...SYSTEM_TOKEN_NAMES].sort())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/features/documents/domain/system-tokens.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/documents/domain/system-tokens.ts
import type { ContractOps, Tempo } from "./contract-ops"

export const SYSTEM_TOKEN_NAMES = [
  "nomor_kontrak",
  "perihal",
  "tanggal_kontrak",
  "pihak_pertama",
  "pihak_kedua",
  "jangka_waktu",
] as const

export type SystemTokenName = (typeof SYSTEM_TOKEN_NAMES)[number]

export type SystemTokenValues = Record<SystemTokenName, string>

export function isReservedToken(token: string): boolean {
  return (SYSTEM_TOKEN_NAMES as readonly string[]).includes(token)
}

export function formatTempoLabel(tempo: Tempo): string {
  if (tempo.durationDays != null && tempo.durationDays > 0) {
    return `${tempo.durationDays} hari`
  }
  if (tempo.startDate && tempo.endDate) {
    const start = new Date(`${tempo.startDate}T00:00:00`)
    const end = new Date(`${tempo.endDate}T00:00:00`)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const ms = end.getTime() - start.getTime()
      const days = Math.round(ms / (24 * 60 * 60 * 1000))
      if (days > 0) return `${days} hari`
    }
  }
  return ""
}

export function resolveSystemTokens(input: {
  number: string | null
  subject: string | null
  contractDate: string | null
  ops: ContractOps
}): SystemTokenValues {
  const byOrder = [...input.ops.parties].sort((a, b) => a.sortOrder - b.sortOrder)
  return {
    nomor_kontrak: input.number?.trim() ?? "",
    perihal: input.subject?.trim() ?? "",
    tanggal_kontrak: input.contractDate?.trim() ?? "",
    pihak_pertama: byOrder[0]?.displayName?.trim() ?? "",
    pihak_kedua: byOrder[1]?.displayName?.trim() ?? "",
    jangka_waktu: formatTempoLabel(input.ops.tempo),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/features/documents/domain/system-tokens.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/domain/system-tokens.ts src/features/documents/domain/system-tokens.test.ts
git commit -m "feat(documents): add system merge token bridge"
```

---

### Task 4: Extend `AgreedDocument` + migrate legacy storage

**Files:**
- Modify: `src/features/documents/types.ts`
- Create: `src/features/documents/storage/migrate-document.ts`
- Create: `src/features/documents/storage/migrate-document.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/documents/storage/migrate-document.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/features/documents/storage/migrate-document.test.ts`

Expected: FAIL

- [ ] **Step 3: Update types + implement migrate**

```ts
// src/features/documents/types.ts
import type { ContractDraft } from "@/features/playground/components/contract-draft"
import type { ContractOps } from "./domain/contract-ops"
import type { DocumentStatus } from "./domain/status"

export type AgreedDocument = {
  id: string
  title: string
  status: DocumentStatus
  /** Contract number for lists/search (e.g. AGD-2026-0001) */
  number: string | null
  /** Perihal */
  subject: string | null
  /** ISO date YYYY-MM-DD */
  contractDate: string | null
  createdAt: string
  updatedAt: string
  /** Layer A — TipTap body + custom Properti + comments */
  draft: ContractDraft
  /** Layer B — structured contract operations */
  ops: ContractOps
}

export type UserTemplate = {
  id: string
  title: string
  createdAt: string
  draft: ContractDraft
}
```

```ts
// src/features/documents/storage/migrate-document.ts
import { emptyDraft, type ContractDraft } from "@/features/playground/components/contract-draft"
import { emptyContractOps, type ContractOps } from "../domain/contract-ops"
import type { DocumentStatus } from "../domain/status"
import type { AgreedDocument } from "../types"

type LegacyDocument = {
  id?: unknown
  title?: unknown
  status?: unknown
  number?: unknown
  subject?: unknown
  contractDate?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  draft?: unknown
  ops?: unknown
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== "string") return null
  const t = value.trim()
  return t ? t : null
}

function normalizeDraft(raw: unknown): ContractDraft {
  if (!raw || typeof raw !== "object") return emptyDraft()
  const d = raw as Partial<ContractDraft>
  return {
    fields: Array.isArray(d.fields) ? d.fields : [],
    values: d.values && typeof d.values === "object" ? (d.values as Record<string, string>) : {},
    contentHtml: typeof d.contentHtml === "string" ? d.contentHtml : "<p></p>",
    comments: Array.isArray(d.comments) ? d.comments : [],
  }
}

function normalizeOps(raw: unknown): ContractOps {
  if (!raw || typeof raw !== "object") return emptyContractOps()
  const base = emptyContractOps()
  const o = raw as Partial<ContractOps>
  return {
    parties: Array.isArray(o.parties) ? o.parties : base.parties,
    paymentPlan:
      o.paymentPlan && typeof o.paymentPlan === "object"
        ? {
            ...base.paymentPlan,
            ...o.paymentPlan,
            milestones: Array.isArray(o.paymentPlan.milestones)
              ? o.paymentPlan.milestones
              : [],
          }
        : base.paymentPlan,
    tempo: o.tempo && typeof o.tempo === "object" ? { ...base.tempo, ...o.tempo } : base.tempo,
    signatures: Array.isArray(o.signatures) ? o.signatures : base.signatures,
    stamp: o.stamp && typeof o.stamp === "object" ? { ...base.stamp, ...o.stamp } : base.stamp,
    attachments: Array.isArray(o.attachments) ? o.attachments : base.attachments,
  }
}

const STATUSES: DocumentStatus[] = [
  "draf",
  "dalam_review",
  "review_disetujui",
  "menunggu_ttd_pihak",
  "selesai",
]

function normalizeStatus(raw: unknown): DocumentStatus {
  return STATUSES.includes(raw as DocumentStatus) ? (raw as DocumentStatus) : "draf"
}

/** Coerce any stored blob into AgreedDocument v2. */
export function migrateDocument(raw: unknown): AgreedDocument {
  const d = (raw && typeof raw === "object" ? raw : {}) as LegacyDocument
  const now = new Date().toISOString()
  return {
    id: asString(d.id, crypto.randomUUID()),
    title: asString(d.title, "Dokumen tanpa judul") || "Dokumen tanpa judul",
    status: normalizeStatus(d.status),
    number: asNullableString(d.number),
    subject: asNullableString(d.subject),
    contractDate: asNullableString(d.contractDate),
    createdAt: asString(d.createdAt, now),
    updatedAt: asString(d.updatedAt, now),
    draft: normalizeDraft(d.draft),
    ops: normalizeOps(d.ops),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/features/documents/storage/migrate-document.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/types.ts src/features/documents/storage/migrate-document.ts src/features/documents/storage/migrate-document.test.ts
git commit -m "feat(documents): extend AgreedDocument with ops metadata and migrate helper"
```

---

### Task 5: Wire document-store (v2 key + create/read)

**Files:**
- Modify: `src/features/documents/storage/document-store.ts`
- Modify: `src/features/documents/storage/document-store.test.ts`

- [ ] **Step 1: Extend store tests (failing until wired)**

Add to `document-store.test.ts` (keep existing tests; they should keep passing after create seeds ops):

```ts
import { DOCUMENTS_KEY, DOCUMENTS_KEY_LEGACY } from "./document-store"
import { migrateDocument } from "./migrate-document"

// inside describe("document-store"):

  it("seeds ops and metadata on create", () => {
    const doc = createDocument({ title: "Baru", draft: emptyDraft() })
    expect(doc.number).toBeNull()
    expect(doc.subject).toBeNull()
    expect(doc.contractDate).toBeNull()
    expect(doc.ops.parties).toEqual([])
    expect(doc.ops.paymentPlan.currency).toBe("IDR")
    expect(loadDocument(doc.id)?.ops.paymentPlan.id).toBe(doc.ops.paymentPlan.id)
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
```

- [ ] **Step 2: Run tests — expect create/list failures on missing fields**

Run: `pnpm exec vitest run src/features/documents/storage/document-store.test.ts`

Expected: FAIL on new assertions until Step 3

- [ ] **Step 3: Update document-store**

Replace / update `document-store.ts` as follows (full file):

```ts
// src/features/documents/storage/document-store.ts
import { emptyDraft, type ContractDraft } from "@/features/playground/components/contract-draft"
import { emptyContractOps } from "../domain/contract-ops"
import type { AgreedDocument, UserTemplate } from "../types"
import { migrateDocument } from "./migrate-document"

/** Current persistence key */
export const DOCUMENTS_KEY = "agreed:documents:v2"
/** Pre-ops documents */
export const DOCUMENTS_KEY_LEGACY = "agreed:documents:v1"
export const TEMPLATES_KEY = "agreed:templates:v1"

function readDocs(): AgreedDocument[] {
  if (typeof window === "undefined") return []
  try {
    const rawV2 = localStorage.getItem(DOCUMENTS_KEY)
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.map(migrateDocument)
    }
    const rawV1 = localStorage.getItem(DOCUMENTS_KEY_LEGACY)
    if (!rawV1) return []
    const parsed = JSON.parse(rawV1) as unknown
    if (!Array.isArray(parsed)) return []
    const migrated = parsed.map(migrateDocument)
    writeDocs(migrated)
    localStorage.removeItem(DOCUMENTS_KEY_LEGACY)
    return migrated
  } catch {
    return []
  }
}

function writeDocs(docs: AgreedDocument[]) {
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs))
}

export function listDocuments(): AgreedDocument[] {
  return readDocs().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function loadDocument(id: string): AgreedDocument | null {
  return readDocs().find((d) => d.id === id) ?? null
}

export function createDocument(input: {
  title: string
  draft?: ContractDraft
}): AgreedDocument {
  const now = new Date().toISOString()
  const doc: AgreedDocument = {
    id: crypto.randomUUID(),
    title: input.title.trim() || "Dokumen tanpa judul",
    status: "draf",
    number: null,
    subject: null,
    contractDate: null,
    createdAt: now,
    updatedAt: now,
    draft: input.draft ?? emptyDraft(),
    ops: emptyContractOps(),
  }
  writeDocs([doc, ...readDocs()])
  return doc
}

export function saveDocument(doc: AgreedDocument): void {
  const next = migrateDocument({
    ...doc,
    updatedAt: new Date().toISOString(),
  })
  const others = readDocs().filter((d) => d.id !== next.id)
  writeDocs([next, ...others])
}

export function deleteDocument(id: string): boolean {
  const before = readDocs()
  const next = before.filter((d) => d.id !== id)
  if (next.length === before.length) return false
  writeDocs(next)
  return true
}

export function renameDocument(id: string, title: string): AgreedDocument | null {
  const doc = loadDocument(id)
  if (!doc) return null
  const next = migrateDocument({
    ...doc,
    title: title.trim() || "Dokumen tanpa judul",
    updatedAt: new Date().toISOString(),
  })
  const others = readDocs().filter((d) => d.id !== id)
  writeDocs([next, ...others])
  return next
}

export function listTemplates(): UserTemplate[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as UserTemplate[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAsTemplate(input: {
  title: string
  draft: ContractDraft
}): UserTemplate {
  const t: UserTemplate = {
    id: crypto.randomUUID(),
    title: input.title.trim() || "Template",
    createdAt: new Date().toISOString(),
    draft: input.draft,
  }
  const all = listTemplates()
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify([t, ...all]))
  return t
}

export function deleteTemplate(id: string): boolean {
  if (typeof window === "undefined") return false
  const all = listTemplates()
  const next = all.filter((t) => t.id !== id)
  if (next.length === all.length) return false
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next))
  return true
}
```

- [ ] **Step 4: Fix any TypeScript call sites that construct `AgreedDocument` manually**

Search for objects missing `ops` / `number` / `subject` / `contractDate`:

Run: `rg -n "AgreedDocument|createDocument|status: \"draf\"" src/features --glob '*.{ts,tsx}'`

Any literal `AgreedDocument` must include the new fields (prefer `createDocument` / `migrateDocument`). Fix compile errors if UI still type-checks against old shape—usually only store + tests.

- [ ] **Step 5: Run all document tests**

Run: `pnpm exec vitest run src/features/documents`

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/documents/storage/document-store.ts src/features/documents/storage/document-store.test.ts
git commit -m "feat(documents): persist ContractOps in documents v2 store"
```

---

### Task 6: Mark spec approved + smoke typecheck

**Files:**
- Modify: `docs/superpowers/specs/2026-08-09-contract-data-model-design.md` (status line only)

- [ ] **Step 1: Update spec status**

Change:

```md
**Status:** Draft (awaiting user review of this spec)
```

to:

```md
**Status:** Approved
```

- [ ] **Step 2: Run full unit suite**

Run: `pnpm test`

Expected: PASS (or only pre-existing unrelated failures—document feature tests must pass)

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-09-contract-data-model-design.md
git commit -m "docs: mark contract data model spec approved"
```

---

## Self-review (plan author)

| Spec requirement | Task |
|------------------|------|
| Layer A vs B split | Task 4 (`draft` + `ops`) |
| Contract metadata number/subject/date | Task 4–5 |
| Party / PaymentPlan / Milestone / Tempo / Signature / Stamp / Attachment | Task 1 |
| Milestone mode percent XOR amount | Task 1 (`mode`) + Task 2 validation |
| Lock after all signers (+ materai if required) | Task 2 |
| Post-lock mutation reject | Task 2 `assertPlanEditable` |
| System tokens bridge | Task 3 |
| Custom DocumentField keep as draft.fields | unchanged Layer A; reserved tokens Task 3 |
| Migration from Phase 1 local store | Task 4–5 |
| Non-goals (UI, providers, gateway) | Explicitly deferred |

No TBD/placeholder steps. Types consistent: `ContractOps`, `PaymentPlan.mode`, `Stamp.status`, `canLockPaymentPlan` → `LockResult`.

---

## After this plan

Next separate plans (suggested order):

1. Parties UI + seed two parties on create  
2. Payment plan / milestones panel + call `lockPaymentPlan` from signing completion  
3. Tempo + attachments panel  
4. Wire system tokens into preview/Properti insert (block reserved names in `createField`)  
5. Providers (e-sign / materai)
