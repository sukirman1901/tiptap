# Agreed Roles, Nav & Lifecycle UI — Implementation Plan (Phase 1)

**Execution:** Phase 1 tasks 1–6 landed on branch `feat/agreed-roles-nav-lifecycle`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Approach A navigation (Dokumen · Template) plus a local, testable document lifecycle (draf → review → approve → TTD stubs) that gates the existing editor/review UI—without auth or real e-sign yet.

**Architecture:** Pure domain module for status transitions; multi-document localStorage registry; App Router pages for list/template/workspace; `FrontHeader` gets pemakai nav; document bar shows phase actions from status + local “role” (inisiator vs pihak lain) toggled for demo. Real auth, multi-user sync, e-materai providers, and `/admin` are **out of this plan** (Phase 2+).

**Tech Stack:** Next.js App Router, React client components, Vitest, Tailwind, existing playground editor (`features/playground`), shadcn Button/Sheet

**Spec:** `docs/superpowers/specs/2026-08-06-agreed-roles-nav-design.md`

**Deferred (separate plans):** Auth/session, server persistence, email undangan, e-sign + e-materai providers, admin area (`/admin`)

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/documents/domain/status.ts` | Create | `DocumentStatus` union + `canTransition` / `nextStatus` helpers |
| `src/features/documents/domain/status.test.ts` | Create | Unit tests for transitions & action gates |
| `src/features/documents/domain/actions.ts` | Create | `DocumentAction` + `availableActions(status, role)` |
| `src/features/documents/domain/actions.test.ts` | Create | Tests for who sees Kirim / Approve / TTD |
| `src/features/documents/storage/document-store.ts` | Create | Multi-doc localStorage: list, get, save, create |
| `src/features/documents/storage/document-store.test.ts` | Create | Store tests (jsdom / mock localStorage) |
| `src/features/documents/types.ts` | Create | `AgreedDocument` type (meta + draft payload) |
| `src/features/playground/components/contract-draft.ts` | Modify | Ensure draft nests cleanly inside `AgreedDocument` |
| `src/layouts/front-stage/front-header.tsx` | Modify | Nav links Dokumen · Template + active state |
| `src/app/(web)/dokumen/page.tsx` | Create | Document list + “Perlu tindakan” filter |
| `src/app/(web)/dokumen/[id]/page.tsx` | Create | Workspace shell → playground editor for one doc |
| `src/app/(web)/template/page.tsx` | Create | Template list (system starter + user templates) |
| `src/app/(web)/page.tsx` | Modify | Redirect `/` → `/dokumen` |
| `src/features/documents/ui/document-list.tsx` | Create | List UI + badges |
| `src/features/documents/ui/template-list.tsx` | Create | Template list + “pakai template” |
| `src/features/playground/components/document-bar.tsx` | Modify | Phase actions from `availableActions` |
| `src/features/playground/ui/index.tsx` | Modify | Load/save `AgreedDocument` by id; role demo toggle |

---

### Task 1: Document status domain (TDD)

**Files:**
- Create: `src/features/documents/domain/status.ts`
- Create: `src/features/documents/domain/status.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/documents/domain/status.test.ts
import { describe, expect, it } from "vitest"
import {
  canTransition,
  type DocumentStatus,
} from "./status"

describe("canTransition", () => {
  it("allows draf → dalam_review", () => {
    expect(canTransition("draf", "dalam_review")).toBe(true)
  })

  it("allows dalam_review → dalam_review (kirim ulang)", () => {
    expect(canTransition("dalam_review", "dalam_review")).toBe(true)
  })

  it("allows dalam_review → review_disetujui", () => {
    expect(canTransition("dalam_review", "review_disetujui")).toBe(true)
  })

  it("allows review_disetujui → menunggu_ttd_pihak", () => {
    expect(canTransition("review_disetujui", "menunggu_ttd_pihak")).toBe(true)
  })

  it("allows menunggu_ttd_pihak → selesai", () => {
    expect(canTransition("menunggu_ttd_pihak", "selesai")).toBe(true)
  })

  it("rejects draf → selesai", () => {
    expect(canTransition("draf", "selesai")).toBe(false)
  })

  it("rejects selesai → draf", () => {
    expect(canTransition("selesai", "draf")).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/documents/domain/status.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement status module**

```ts
// src/features/documents/domain/status.ts
export type DocumentStatus =
  | "draf"
  | "dalam_review"
  | "review_disetujui"
  | "menunggu_ttd_pihak"
  | "selesai"

const ALLOWED: Record<DocumentStatus, readonly DocumentStatus[]> = {
  draf: ["dalam_review"],
  dalam_review: ["dalam_review", "review_disetujui"],
  review_disetujui: ["menunggu_ttd_pihak"],
  menunggu_ttd_pihak: ["selesai"],
  selesai: [],
}

export function canTransition(
  from: DocumentStatus,
  to: DocumentStatus
): boolean {
  return ALLOWED[from].includes(to)
}

export function statusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    draf: "Draf",
    dalam_review: "Dalam review",
    review_disetujui: "Review disetujui",
    menunggu_ttd_pihak: "Menunggu TTD pihak",
    selesai: "Selesai",
  }
  return labels[status]
}

/** Items that should surface under “Perlu tindakan” for a given local role. */
export function needsAction(
  status: DocumentStatus,
  role: "initiator" | "party"
): boolean {
  if (role === "initiator") {
    return (
      status === "draf" ||
      status === "dalam_review" ||
      status === "review_disetujui"
    )
  }
  return status === "dalam_review" || status === "menunggu_ttd_pihak"
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/features/documents/domain/status.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/domain/status.ts src/features/documents/domain/status.test.ts
git commit -m "feat(documents): add document status transition domain"
```

---

### Task 2: Available actions by status + role (TDD)

**Files:**
- Create: `src/features/documents/domain/actions.ts`
- Create: `src/features/documents/domain/actions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest"
import { availableActions } from "./actions"

describe("availableActions", () => {
  it("initiator in draf can send review and save", () => {
    const a = availableActions("draf", "initiator")
    expect(a).toContain("kirim_review")
    expect(a).toContain("simpan")
    expect(a).not.toContain("approve_review")
  })

  it("party in dalam_review can comment and approve", () => {
    const a = availableActions("dalam_review", "party")
    expect(a).toContain("approve_review")
    expect(a).not.toContain("kirim_review")
    expect(a).not.toContain("edit_body")
  })

  it("initiator in review_disetujui can sign+stamp", () => {
    const a = availableActions("review_disetujui", "initiator")
    expect(a).toContain("ttd_materai")
  })

  it("party in menunggu_ttd_pihak can sign", () => {
    const a = availableActions("menunggu_ttd_pihak", "party")
    expect(a).toContain("ttd_pihak")
  })

  it("nobody edits body after selesai", () => {
    expect(availableActions("selesai", "initiator")).not.toContain("edit_body")
    expect(availableActions("selesai", "party")).not.toContain("edit_body")
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/features/documents/domain/actions.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/features/documents/domain/actions.ts
import type { DocumentStatus } from "./status"

export type DocumentRole = "initiator" | "party"

export type DocumentAction =
  | "simpan"
  | "preview"
  | "bagikan_review"
  | "kirim_review"
  | "edit_body"
  | "approve_review"
  | "ttd_materai"
  | "ttd_pihak"

export function availableActions(
  status: DocumentStatus,
  role: DocumentRole
): DocumentAction[] {
  const base: DocumentAction[] = ["preview"]

  if (status === "selesai") return base

  if (role === "initiator") {
    switch (status) {
      case "draf":
        return [...base, "simpan", "edit_body", "kirim_review", "bagikan_review"]
      case "dalam_review":
        return [...base, "simpan", "edit_body", "kirim_review", "bagikan_review"]
      case "review_disetujui":
        return [...base, "ttd_materai"]
      case "menunggu_ttd_pihak":
        return base
      default:
        return base
    }
  }

  // party
  switch (status) {
    case "dalam_review":
      return [...base, "approve_review", "bagikan_review"]
    case "menunggu_ttd_pihak":
      return [...base, "ttd_pihak"]
    default:
      return base
  }
}

export function canEditBody(
  status: DocumentStatus,
  role: DocumentRole
): boolean {
  return availableActions(status, role).includes("edit_body")
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/domain/actions.ts src/features/documents/domain/actions.test.ts
git commit -m "feat(documents): gate document actions by status and role"
```

---

### Task 3: AgreedDocument type + multi-doc store

**Files:**
- Create: `src/features/documents/types.ts`
- Create: `src/features/documents/storage/document-store.ts`
- Create: `src/features/documents/storage/document-store.test.ts`
- Modify: `src/features/playground/components/contract-draft.ts` (export types only; no breaking change to `ContractDraft`)

- [ ] **Step 1: Types**

```ts
// src/features/documents/types.ts
import type { ContractDraft } from "@/features/playground/components/contract-draft"
import type { DocumentStatus } from "./domain/status"

export type AgreedDocument = {
  id: string
  title: string
  status: DocumentStatus
  /** Local demo: who is “me” when opening the doc */
  createdAt: string
  updatedAt: string
  draft: ContractDraft
}

export type UserTemplate = {
  id: string
  title: string
  createdAt: string
  draft: ContractDraft
}
```

- [ ] **Step 2: Failing store tests** (mock `localStorage` in vitest)

```ts
import { beforeEach, describe, expect, it } from "vitest"
import {
  createDocument,
  listDocuments,
  loadDocument,
  saveDocument,
  DOCUMENTS_KEY,
} from "./document-store"
import { emptyDraft } from "@/features/playground/components/contract-draft"

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
})
```

- [ ] **Step 3: Implement store**

```ts
// src/features/documents/storage/document-store.ts
import { emptyDraft, type ContractDraft } from "@/features/playground/components/contract-draft"
import type { AgreedDocument, UserTemplate } from "../types"

export const DOCUMENTS_KEY = "agreed:documents:v1"
export const TEMPLATES_KEY = "agreed:templates:v1"

function readDocs(): AgreedDocument[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AgreedDocument[]
    return Array.isArray(parsed) ? parsed : []
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
    createdAt: now,
    updatedAt: now,
    draft: input.draft ?? emptyDraft(),
  }
  writeDocs([doc, ...readDocs()])
  return doc
}

export function saveDocument(doc: AgreedDocument): void {
  const next = { ...doc, updatedAt: new Date().toISOString() }
  const others = readDocs().filter((d) => d.id !== doc.id)
  writeDocs([next, ...others])
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
```

- [ ] **Step 4: Run store tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/
git commit -m "feat(documents): multi-document localStorage store"
```

---

### Task 4: Header nav — Dokumen · Template

**Files:**
- Modify: `src/layouts/front-stage/front-header.tsx`

- [ ] **Step 1: Add nav links with active styles**

Use `usePathname` from `next/navigation`. Links:

- `/dokumen` — label **Dokumen**
- `/template` — label **Template**

Keep logo → `/dokumen` (or `/`). Keep `SwitchThemeButton` on the right.

```tsx
// Core pattern inside header (client component already):
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const pathname = usePathname()
const links = [
  { href: "/dokumen", label: "Dokumen" },
  { href: "/template", label: "Template" },
] as const

// Between logo and theme:
<nav className="ml-6 hidden items-center gap-1 sm:flex" aria-label="Utama">
  {links.map((l) => (
    <Link
      key={l.href}
      href={l.href}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors",
        pathname.startsWith(l.href)
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {l.label}
    </Link>
  ))}
</nav>
```

Also add a compact mobile menu (Sheet or Dropdown) with the same two links for `<sm`.

- [ ] **Step 2: Manual check** — open app, links visible; active state on `/dokumen`

- [ ] **Step 3: Commit**

```bash
git add src/layouts/front-stage/front-header.tsx
git commit -m "feat(nav): add Dokumen and Template header links"
```

---

### Task 5: Routes — list, template, workspace; home redirect

**Files:**
- Create: `src/app/(web)/dokumen/page.tsx`
- Create: `src/app/(web)/dokumen/[id]/page.tsx`
- Create: `src/app/(web)/template/page.tsx`
- Modify: `src/app/(web)/page.tsx`
- Create: `src/features/documents/ui/document-list.tsx`
- Create: `src/features/documents/ui/template-list.tsx`

- [ ] **Step 1: Redirect home**

```tsx
// src/app/(web)/page.tsx
import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/dokumen")
}
```

- [ ] **Step 2: Document list page**

`dokumen/page.tsx` renders client `DocumentList`:

- Button **Buat dokumen** → `createDocument` → `router.push(/dokumen/${id})`
- Filter chips: **Semua** | **Perlu tindakan** (use `needsAction(status, role)` with local role default `initiator`)
- Each row: title, `statusLabel`, updatedAt, link to `/dokumen/[id]`
- Empty state copy in Indonesian

- [ ] **Step 3: Template page**

- Section **Sistem**: one card “Perjanjian kosong” / existing starter if imported from `starter-perjanjian-ks` — button **Pakai** creates doc from that draft
- Section **Milik saya**: `listTemplates()` — **Pakai** creates doc
- Empty user templates: explain “Simpan sebagai template” from document bar (wired in Task 6)

- [ ] **Step 4: Workspace page**

```tsx
// dokumen/[id]/page.tsx — client wrapper ok
"use client"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { loadDocument } from "@/features/documents/storage/document-store"
import PlaygroundPage from "@/features/playground/ui" 
// Prefer refactoring playground to accept documentId prop — see Task 6
```

Minimal: pass `documentId` into a refactored playground entry.

- [ ] **Step 5: Smoke** — create doc from list, lands in editor; templates page renders

- [ ] **Step 6: Commit**

```bash
git add src/app/(web)/ src/features/documents/ui/
git commit -m "feat(documents): list, template, and workspace routes"
```

---

### Task 6: Wire playground to AgreedDocument + phase actions

**Files:**
- Modify: `src/features/playground/ui/index.tsx`
- Modify: `src/features/playground/components/document-bar.tsx`
- Modify: `src/features/playground/components/full-featured-editor.tsx` (editable from `canEditBody`)

- [ ] **Step 1: Playground accepts `documentId`**

- Load via `loadDocument(id)`; if missing, show “Dokumen tidak ditemukan” + link ke `/dokumen`
- Persist: on draft/status change → `saveDocument`
- Migrate once: if old `editor-kontrak:draft:v2` exists and no docs, `createDocument` from it then clear or keep key

- [ ] **Step 2: Local role toggle (demo only)**

In document bar or a small select: **Saya: Inisiator | Pihak lain** stored in `sessionStorage` key `agreed:demo-role`. Drives `mode` review-like read-only via `canEditBody` and `availableActions`.

When role is `party` OR status lacks `edit_body` → editor `editable={false}` and comment UX like current `?review=1` (keep query as alias: `?review=1` forces party).

- [ ] **Step 3: Document bar phase buttons**

Map actions to handlers:

| Action | Handler |
|--------|---------|
| `kirim_review` | `canTransition` → set status `dalam_review`; copy review URL `?review=1` optional |
| `approve_review` | set `review_disetujui` |
| `ttd_materai` | set `menunggu_ttd_pihak` (stub — toast/status text “TTD+materai dicatat (demo)”) |
| `ttd_pihak` | set `selesai` (stub) |
| `simpan` / `preview` / `bagikan_review` | existing behavior |

Show current `statusLabel(status)` in the subtitle.

- [ ] **Step 4: Simpan sebagai template**

Button (initiator, any non-selesai): `saveAsTemplate({ title: doc.title, draft })` → toast / status “Template disimpan”.

- [ ] **Step 5: Manual QA checklist**

1. Buat dokumen → status Draf → edit OK  
2. Kirim review → status Dalam review → toggle Pihak lain → tidak bisa edit, bisa komentar + Approve  
3. Approve → TTD+materai (inisiator) → TTD pihak → Selesai  
4. Simpan template → muncul di `/template` → Pakai membuat dokumen baru  

- [ ] **Step 6: Commit**

```bash
git add src/features/playground/ src/features/documents/
git commit -m "feat(documents): wire lifecycle actions into document workspace"
```

---

### Task 7: Spec status + Phase 1 README note

**Files:**
- Modify: `docs/superpowers/specs/2026-08-06-agreed-roles-nav-design.md` — set Status to `Phase 1 planned`
- Optional: short “Phase 2” bullet list at end of this plan (already in header)

- [ ] **Step 1: Update spec status line**

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-08-06-agreed-roles-nav-design.md docs/superpowers/plans/2026-08-06-agreed-roles-nav-lifecycle.md
git commit -m "docs: phase 1 plan for roles, nav, and lifecycle UI"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Peran inisiator / pihak lain | Task 2, 6 |
| Status machine | Task 1, 6 |
| Nav Dokumen · Template | Task 4, 5 |
| Perlu tindakan | Task 1 `needsAction`, Task 5 filter |
| Review = komentar only | Task 2 `edit_body`, Task 6 |
| Approve → TTD inisiator+materai → TTD pihak | Task 2, 6 (stubs) |
| Template sistem + milik user | Task 3, 5, 6 |
| Admin area | Deferred Phase 2 |
| Auth / e-sign provider | Deferred Phase 2 |

## Phase 2+ (not this plan)

1. Auth (login) + document membership server-side  
2. Real undangan email + shared comments  
3. E-sign + e-materai integration  
4. `/admin` nav (Pengguna · Template sistem · Pengaturan)
