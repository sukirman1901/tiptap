# Agreed — Contract Data Model (Structured Ops + Custom Fields)

**Date:** 2026-08-09  
**Status:** Approved  
**Approach:** 3 — structured contract ops in DB + `DocumentField[]` for custom merge fields  
**Related:** `docs/superpowers/specs/2026-08-06-agreed-roles-nav-design.md` (lifecycle / roles)

## Problem

Agreed today stores a document as TipTap HTML plus **dynamic properties** (merge fields) in local draft JSON. The product goal is an **end-to-end contract platform**: parties, flexible payment milestones, signing, materai, and tempo (jangka waktu). Those operational concepts cannot live only as free-text merge fields — they need statuses, lock rules, and relations. At the same time, users still need **custom properties** for template-specific tokens in the document body.

## Goals

- Separate **document content** (HTML + custom fields) from **contract operations** (parties, payment plan, milestones, tempo, signatures, stamp, attachments)
- Support **flexible milestone schemas** (e.g. 50:50, 30:40:30) decided by the parties
- **Lock** the payment plan after **all signers** have signed (and materai when required)
- Keep **custom Properti** (merge fields) alongside structured blocks
- Define a clear **bridge**: structured data can feed document tokens; ops tables remain source of truth for workflow

## Non-goals

- Full auth / multi-tenant implementation details
- Real e-sign or e-materai provider integration
- Payment gateway / automated bank settlement
- Addendum / change-request UI after lock (named as future path only)
- AI risk detection (mockup chrome only; out of data-model MVP)

## Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| Payment / milestones | Operational workflow (invoice → paid), not text-only |
| Milestone schema | Flexible; parties choose split |
| When payment plan locks | After **all parties have signed** (+ materai if required) |
| Custom merge fields | **Keep** alongside structured ops (Approach A) |
| Architecture | Approach **3**: structured tables + `DocumentField[]` |

## Two layers

| Layer | Purpose | Storage |
|-------|---------|---------|
| **A — Document content** | What appears in the contract body | `DocumentBody.contentHtml`, `DocumentField[]` |
| **B — Contract operations** | What the platform *runs* (who signs, what is due, what is paid) | `Party`, `PaymentPlan`, `Milestone`, `Tempo`, `Signature`, `Stamp`, `Attachment` |

Layer B may **mirror** selected values into Layer A tokens for TipTap (e.g. party display name → `{pihak_pertama}`). Workflow status always reads from Layer B.

## Entity model

```
Contract
├── DocumentBody          (TipTap HTML)
├── DocumentField[]       (custom Properti / merge fields)
├── Party[]
├── PaymentPlan
│   └── Milestone[]
├── Tempo
├── Signature[]
├── Stamp?                (materai)
└── Attachment[]
```

### Contract

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `title` | List / workspace title |
| `status` | Lifecycle from roles/nav spec (`draf` → … → `selesai`) |
| `ownerUserId` | Initiator / creator (when auth exists) |
| `createdAt` / `updatedAt` | |

### DocumentBody

| Field | Notes |
|-------|--------|
| `contractId` | FK |
| `contentHtml` | TipTap output |
| `version` | Optional integer; bump on meaningful saves (future) |

### DocumentField (custom Properti)

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `contractId` | FK |
| `label` | UI label |
| `token` | Merge token slug, e.g. `klausul_khusus` |
| `type` | `text` \| `textarea` \| `date` \| `currency` (extend later) |
| `value` | String / digits per type |
| `tokenManual` | If user overrode auto-slug |

These are **not** milestones or signatures. They only fill body placeholders.

### Party

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `contractId` | FK |
| `displayName` | |
| `email` | For invite (when auth/email exists) |
| `kind` | `initiator` \| `counterparty` (or more labels) |
| `isSigner` | Participates in TTD order |
| `isReviewer` | Participates in comment/approve |
| `signOrder` | Integer among signers |
| `userId` | Nullable until account linked |

UI “Pihak Pertama / Kedua” = ordered parties; product roles remain initiator vs other parties per lifecycle spec.

### PaymentPlan

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `contractId` | FK (1:1) |
| `currency` | e.g. `IDR` |
| `lockedAt` | `null` until lock rule fires; then immutable without addendum |

### Milestone

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `paymentPlanId` | FK |
| `sortOrder` | |
| `label` | e.g. “Termin 1 — DP” |
| `percent` | Nullable; use **either** percent **or** `amount` |
| `amount` | Nullable minor units / digits string consistent with existing currency fields |
| `dueDate` | Optional |
| `status` | See status machine below |
| `paidAt` | Nullable |

**Invariant (soft):** if plan uses percents, sum of percents should be 100 when locking (validate on lock). Mixed percent/amount plans: product should pick one mode per plan for MVP (`mode: percent | amount`).

### Tempo (jangka waktu)

| Field | Notes |
|-------|--------|
| `contractId` | FK (1:1) |
| `startDate` | Optional ISO date |
| `endDate` | Optional |
| `durationDays` | Optional; UI may show “90 hari” from this **or** from `end - start` |

Source of truth: store explicit fields; derived display is computed.

### Signature

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `contractId` | FK |
| `partyId` | FK |
| `signOrder` | |
| `signedAt` | Null until signed |
| `method` | `demo` \| provider id later |

### Stamp (materai)

| Field | Notes |
|-------|--------|
| `contractId` | FK (0..1) |
| `required` | Boolean |
| `status` | `not_required` \| `pending` \| `attached` |
| `attachedAt` | Nullable |

Align with lifecycle: initiator TTD + materai before subsequent parties when `required`.

### Attachment

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `contractId` | FK |
| `name` | |
| `url` / storage key | |
| `uploadedAt` | |

## Milestone status machine (ops)

```
planned → invoiced → paid
         ↘ cancelled (optional, pre-lock only)
```

Post-lock: no structural add/remove/reorder of milestones without addendum path (future). Status may still move `invoiced → paid` after lock (collecting money is allowed; changing the split is not).

## Payment plan lock rule

Lock when **all** of the following are true:

1. Every party with `isSigner = true` has a `Signature` with `signedAt != null`
2. If `Stamp.required`, then `Stamp.status = attached`
3. Contract lifecycle has reached the signed/complete phase consistent with roles spec (`selesai` or dedicated `fully_signed` if introduced)

On lock: set `PaymentPlan.lockedAt = now()`. Reject mutations that change milestone set, percents, or amounts.

## Bridge: structured → merge tokens

Optional **system tokens** (read-only from ops), examples:

| Token | Source |
|-------|--------|
| `{nomor_kontrak}` | Contract meta / DocumentField reserved or Contract.number |
| `{perihal}` | Contract subject field or reserved DocumentField |
| `{pihak_pertama}` | Party sortOrder 1 displayName |
| `{pihak_kedua}` | Party sortOrder 2 displayName |
| `{jangka_waktu}` | Tempo derived label |

Custom `DocumentField` tokens remain user-defined and never override system token names (reserve prefix or blocklist).

**Nomor / tanggal / perihal** in the mockup “Informasi kontrak” should be **first-class Contract metadata** (or reserved fields), not only free custom fields — so lists and search work.

Add to Contract (MVP metadata):

| Field | Notes |
|-------|--------|
| `number` | e.g. AGD-2025-00123 |
| `subject` | perihal |
| `contractDate` | tanggal kontrak |

## Panel mapping (UI direction)

| Mockup block | Data |
|--------------|------|
| Informasi kontrak | `number`, `contractDate`, `subject` |
| Para pihak | `Party[]` + signer badges |
| Pembayaran | `PaymentPlan` + `Milestone[]` summary (“3 termin”) |
| Jangka waktu | `Tempo` summary (“90 hari”) |
| Dokumen terkait | `Attachment[]` |
| Tab Properti | `DocumentField[]` (+ links into structured blocks if useful) |

Risk / AI assistant in mockup: **out of scope** for this data model.

## Relation to current Phase 1 local store

Today: `AgreedDocument` = `{ title, status, draft: ContractDraft }` with `draft.fields` / `draft.values` / `draft.contentHtml` / `draft.comments`.

**Migration path (conceptual):**

1. Map `draft.contentHtml` → `DocumentBody`
2. Map `draft.fields` + `values` → `DocumentField[]`
3. Map `draft.comments` → Comment entities (existing review model)
4. Introduce empty `Party[]` / `PaymentPlan` when user opens structured panels
5. Keep localStorage shape until auth/DB; then persist same graph server-side

## Success criteria

- Engineers can implement tables/types without guessing what is “just a merge field” vs “ops”
- Flexible milestone plans are expressible and lockable after full signing
- Custom Properti remain available for templates
- Panel mockup blocks have a clear entity home

## Open questions (non-blocking)

1. Reserved contract `number` uniqueness scope (per tenant vs global)
2. Milestone `mode` forced per plan (`percent` XOR `amount`) — confirm for MVP
3. Whether `fully_signed` is a distinct lifecycle status or equals `selesai`
4. Materai: always required for ID contracts vs per-template flag (default `Stamp.required` from template)

## Sub-projects (decomposition)

Do **not** implement the whole E2E platform in one plan. Suggested order:

1. **This model** — types + persistence shape (local then DB)
2. Parties UI + invite
3. Payment plan / milestones UI + lock
4. Tempo + attachments
5. Real sign + materai providers
6. Addendum after lock
