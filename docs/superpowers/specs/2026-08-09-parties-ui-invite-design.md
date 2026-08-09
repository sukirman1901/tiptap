# Agreed — Parties UI + Invite (Properti Panel)

**Date:** 2026-08-09  
**Status:** Draft (awaiting user review of this spec)  
**Approach:** 1 — Client-first Properti panel + thin invite API with snapshot  
**Related:**  
- `docs/superpowers/specs/2026-08-09-contract-data-model-design.md` (ops graph)  
- `docs/superpowers/specs/2026-08-06-agreed-roles-nav-design.md` (lifecycle / review)

## Problem

Contract ops (`Party[]`, metadata, lock rules, system tokens) exist in the data model, but the workspace still only shows TipTap custom fields under **Properti**. Users need a minimal, consistent way to fill **Informasi kontrak** and **Para pihak**, and to **invite** counterparties by email with a working link—without shipping full auth or the entire mockup (AI, risiko, payment forms).

## Goals

- Rebuild the **Properti** sidebar as a thin-list panel matching Agreed’s existing chrome (not a separate “Pihak” tab)
- Edit contract metadata + parties bound to `AgreedDocument` (`number` / `subject` / `contractDate` + `ops.parties`)
- Seed **two parties** on document create (initiator + counterparty)
- **Invite** counterparty: create token, optional Resend email, always show/copy link; redeem via `/invite/[token]` with **server snapshot** so the guest can open on another device
- Keep UI **minimalist**: no avatars, no AI card, no risk block in this slice
- Preserve custom TipTap fields under a **Properti kustom** section

## Non-goals

- Full NextAuth / multi-tenant accounts
- Real-time sync of initiator localStorage ↔ guest
- Guest comments synced to initiator (guest comments may be local-only for MVP)
- Payment / tempo / attachments full editors (summary rows only, non-functional or “—” )
- AI assistant / detected risks UI
- E-sign / e-materai providers

## Decisions (brainstorming)

| Topic | Choice |
|-------|--------|
| Invite depth | Real invite (email + link), not stub-only |
| Email delivery | Resend if `RESEND_API_KEY`; else log + always show link in UI |
| Panel placement | Inside existing **Properti** tab (unified with Informasi), not a third tab / not canvas block |
| Visual style | **A — thin list** (section labels, inputs, hairline rows; no soft party cards) |
| Seed on create | Two slots: initiator + empty counterparty |
| Architecture | Client-first ops + thin invite API + snapshot on invite |
| Guest document access | Snapshot stored server-side at invite time |
| Guest comments | Local-only for MVP |

## UI structure (Properti tab)

Tabs unchanged: **Properti** · **Komentar**.

Properti body (top → bottom):

1. **Informasi kontrak**  
   - Nomor → `document.number`  
   - Tanggal → `document.contractDate` (date input)  
   - Perihal → `document.subject`

2. **Para pihak**  
   - One row per `ops.parties` (sorted by `sortOrder`)  
   - Fields: display name, email  
   - Compact text badges: Signer / Reviewer (from `isSigner` / `isReviewer`)  
   - Actions: **Undang** (when email present and party is not initiator-only policy), remove if `parties.length > 2`  
   - **+ Tambah pihak** → new `counterparty` with next `sortOrder`

3. **Lainnya** (read-only stubs for consistency with mockup hierarchy)  
   - Pembayaran → e.g. “—” or `N termin` from `ops.paymentPlan.milestones.length`  
   - Jangka waktu → from `formatTempoLabel` or “—”  
   - Dokumen terkait → attachment count or “—”  
   - Rows may be non-clickable in this slice (or navigate later)

4. **Properti kustom**  
   - Existing TipTap `draft.fields` / values UI (current variables panel content), relocated under this heading so merge fields remain available

Mobile: keep current Sheet pattern for the sidebar; same sections inside the sheet.

## Party rules

- On `createDocument`: call factory that seeds  
  - Party 1: `kind: initiator`, `isSigner: true`, `isReviewer: true`, `sortOrder: 1`, `displayName` default e.g. `""` or `"Inisiator"`  
  - Party 2: `kind: counterparty`, same flags, `sortOrder: 2`, empty name/email  
- Maintain `ops.signatures[]` stubs aligned to signers (`signedAt: null`, `method: "demo"`) when parties change (add/remove signer)
- Minimum **2** parties; cannot delete below 2
- System tokens `{pihak_pertama}` / `{pihak_kedua}` continue to resolve from `sortOrder` via existing `resolveSystemTokens`

## Invite flow

```
Inisiator mengisi email pihak → Undang
  → POST /api/invites { documentId, partyId }
  → Persist InviteRecord + DocumentSnapshot
  → Try Resend; always return inviteUrl
  → UI: copy link + status “Terkirim” / “Siap dibagikan”
Guest opens /invite/[token]
  → Validate token
  → Set httpOnly (or readable) cookie agreed_invite / agreed_party
  → Redirect /dokumen/[id]?review=1&invite=1
  → Workspace loads snapshot for guest (not initiator localStorage)
```

### InviteRecord (server)

| Field | Notes |
|-------|--------|
| `token` | Opaque random id |
| `documentId` | |
| `partyId` | |
| `email` | Snapshot of party email at send |
| `createdAt` | |
| `expiresAt` | e.g. 14 days |
| `redeemedAt` | Nullable |
| `status` | `pending` \| `sent` \| `redeemed` \| `expired` |

### DocumentSnapshot (server)

Minimal payload for guest review:

- `documentId`, `title`, `number`, `subject`, `contractDate`, `status`
- `contentHtml` (from draft at invite time; prefer preview-ready HTML)
- `parties` public fields (id, displayName, kind, sortOrder, isSigner, isReviewer)—no need for full ops
- `createdAt` of snapshot

Storage for MVP: filesystem JSON under `.data/invites/` (gitignored) or similar durable local store; swap to DB later without changing API shape.

### Email

- From / subject / body: short Indonesian copy with invite link and document title  
- If no `RESEND_API_KEY`: skip send, log invite URL server-side, UI still shows link (success path for local dev)

## Guest workspace behavior

- Role forced to **party** / review: `canEditBody = false`, comments UI available  
- Load content from snapshot API (`GET /api/invites/[token]/document` or session after redeem)  
- Saving comments: **local-only** in guest browser (document keyed by invite/document id)—no write-back to initiator in this slice  
- Initiator “Kirim review” / status machine unchanged for local docs; optional later: mark invite redeemed when guest opens

## Consistency / visual rules

- Reuse existing Input, Label, Button, Sheet, Dialog patterns  
- Section headers: small uppercase / muted (match mockup hierarchy, not mockup chrome excess)  
- No colored avatar squares; no purple AI card; no risk badge  
- Primary actions full-width on narrow sheets where buttons already follow that pattern  
- Empty email: Undang disabled with short hint

## Error handling

| Case | UX |
|------|-----|
| Invalid email | Inline under field |
| Undang without email | Button disabled + hint |
| Resend failure | Toast/error text; still show link if invite created |
| Invalid/expired token | Simple `/invite` error page |
| Snapshot missing | Error page; ask initiator to re-invite |

## Testing

- Unit: party seed on create; cannot delete below 2; invite token validation helpers  
- Unit/integration: API create invite writes record + snapshot; redeem marks redeemed  
- Component: Properti sections render metadata + parties; Undang disabled without email  
- Manual: with and without `RESEND_API_KEY`

## Success criteria

- New docs show Informasi + 2 pihak in Properti thin list  
- Editing metadata/parties persists on `AgreedDocument`  
- Undang produces a link a second browser/profile can open to see snapshot in review mode  
- Custom TipTap fields still editable under Properti kustom  
- No AI/risk UI shipped

## Open questions (non-blocking)

1. Default initiator `displayName` empty vs prefilled “Inisiator”  
2. Whether redeem should also flip document status toward `dalam_review` on initiator copy (out of band)  
3. Snapshot refresh: re-Undang overwrites snapshot vs versioned snapshots
