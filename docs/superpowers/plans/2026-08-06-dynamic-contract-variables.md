# Dynamic Contract Variables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded contract meta fields with a user-defined `fields[]` + `values{}` model, a single minimal Variables sidebar (fill default, schema edit on label click), live TipTap merge nodes keyed by stable field ids, and LocalStorage draft persistence.

**Architecture:** Pure domain module owns types, slugify, resolve/format, and field CRUD helpers. A small external store (same pattern as today’s `contract-meta-store`) exposes `fields` + `values` to TipTap node views outside React. Playground page owns React state, hydrates from LocalStorage, syncs the store, and renders the Variables panel + editor. Starter “Perjanjian KS” is one optional template JSON (sample fields + HTML), not product-fixed schema.

**Tech Stack:** Next.js App Router, React 19, TipTap, Tailwind v4, shadcn Input/Label/Textarea/Select, Vitest (new) for domain unit tests, LocalStorage

**Spec:** `docs/superpowers/specs/2026-08-06-dynamic-contract-variables-design.md`

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `vitest.config.ts` | Create | Unit test runner for domain modules |
| `package.json` | Modify | Add `vitest`, script `test` |
| `src/features/playground/components/contract-draft.ts` | Create | Types, slugify, createField, resolveDisplay, empty helpers, LocalStorage key helpers |
| `src/features/playground/components/contract-draft.test.ts` | Create | Domain unit tests |
| `src/features/playground/components/contract-draft-store.tsx` | Create | External store for TipTap views (`fields` + `values`) |
| `src/features/playground/components/starter-perjanjian-ks.ts` | Create | Optional starter: fixed field ids + values + HTML content |
| `src/features/playground/components/contract-variables-panel.tsx` | Create | Single-panel Variables UI (fill + on-demand schema) |
| `src/features/playground/components/editor-contract-variable.tsx` | Modify | Node attrs `key`=id + `token`; dynamic `@` from store; dynamic `{token}` input rule |
| `src/features/playground/components/full-featured-editor.tsx` | Modify | Draft props; slash vars from fields; sync draft store |
| `src/features/playground/components/contract-editor-toolbar.tsx` | Modify | Sheet uses Variables panel + draft callbacks |
| `src/features/playground/ui/index.tsx` | Modify | Draft state, LocalStorage hydrate/persist, wire panel + editor |
| `src/features/playground/components/index.ts` | Modify | Export new modules; drop old meta exports |
| `src/features/playground/components/contract-meta.ts` | Delete | Replaced by `contract-draft.ts` |
| `src/features/playground/components/contract-meta-form.tsx` | Delete | Replaced by panel |
| `src/features/playground/components/contract-meta-store.tsx` | Delete | Replaced by draft store |
| `src/features/playground/components/contract-variables.ts` | Delete | Logic moves into draft + editor |
| `src/features/playground/components/dummy-contract-content.ts` | Delete | Content lives in starter template |

---

### Task 1: Vitest + domain module

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Create: `src/features/playground/components/contract-draft.ts`
- Create: `src/features/playground/components/contract-draft.test.ts`

- [ ] **Step 1: Add Vitest**

```bash
cd /Users/aaa/Documents/Developer/tiptap && pnpm add -D vitest
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts`:

```ts
import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 2: Write failing tests**

Create `src/features/playground/components/contract-draft.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  createField,
  formatCurrencyDisplay,
  isFieldValueEmpty,
  resolveFieldDisplay,
  slugifyToken,
  type ContractDraft,
  type TemplateField,
} from "./contract-draft"

describe("slugifyToken", () => {
  it("slugifies Indonesian labels", () => {
    expect(slugifyToken("Nama Pihak Pertama")).toBe("nama_pihak_pertama")
    expect(slugifyToken("  Nilai (Rp)  ")).toBe("nilai_rp")
  })
})

describe("createField", () => {
  it("creates text field with auto token", () => {
    const f = createField({ label: "Judul", type: "text" })
    expect(f.label).toBe("Judul")
    expect(f.token).toBe("judul")
    expect(f.type).toBe("text")
    expect(f.tokenManual).toBeFalsy()
    expect(f.id.length).toBeGreaterThan(8)
  })
})

describe("resolveFieldDisplay", () => {
  const field = (partial: Partial<TemplateField> & Pick<TemplateField, "id" | "token" | "type">): TemplateField => ({
    label: partial.label ?? partial.token,
    tokenManual: false,
    ...partial,
  })

  it("returns {token} when empty", () => {
    const f = field({ id: "a", token: "judul", type: "text" })
    expect(resolveFieldDisplay(f, "")).toBe("{judul}")
  })

  it("formats currency and date", () => {
    expect(
      resolveFieldDisplay(field({ id: "a", token: "nilai", type: "currency" }), "100000000")
    ).toMatch(/^Rp /)
    expect(
      resolveFieldDisplay(field({ id: "a", token: "tgl", type: "date" }), "2026-08-04")
    ).toContain("2026")
  })
})

describe("isFieldValueEmpty", () => {
  it("treats whitespace text as empty", () => {
    expect(isFieldValueEmpty("text", "  ")).toBe(true)
    expect(isFieldValueEmpty("currency", "")).toBe(true)
    expect(isFieldValueEmpty("date", "2026-08-04")).toBe(false)
  })
})

describe("formatCurrencyDisplay", () => {
  it("formats digit groups", () => {
    expect(formatCurrencyDisplay("100000000")).toBe("100.000.000")
    expect(formatCurrencyDisplay("")).toBe("")
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
pnpm test
```

Expected: FAIL — cannot find module `./contract-draft`

- [ ] **Step 4: Implement `contract-draft.ts`**

```ts
export type FieldType = "text" | "textarea" | "date" | "currency"

export type TemplateField = {
  id: string
  label: string
  token: string
  type: FieldType
  tokenManual?: boolean
  required?: boolean
}

export type ContractDraft = {
  fields: TemplateField[]
  values: Record<string, string>
  contentHtml: string
}

export const DRAFT_STORAGE_KEY = "editor-kontrak:draft:v1"

export function slugifyToken(label: string): string {
  const base = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
  return base || "field"
}

export function createField(input: {
  label: string
  type?: FieldType
  id?: string
  token?: string
  tokenManual?: boolean
}): TemplateField {
  const label = input.label.trim() || "Variabel"
  const token = input.token ?? slugifyToken(label)
  return {
    id: input.id ?? crypto.randomUUID(),
    label,
    token,
    type: input.type ?? "text",
    tokenManual: input.tokenManual ?? false,
  }
}

export function withUpdatedLabel(field: TemplateField, label: string): TemplateField {
  const nextLabel = label
  if (field.tokenManual) {
    return { ...field, label: nextLabel }
  }
  return { ...field, label: nextLabel, token: slugifyToken(nextLabel) }
}

export function withUpdatedToken(field: TemplateField, token: string): TemplateField {
  const cleaned = slugifyToken(token)
  return { ...field, token: cleaned || field.token, tokenManual: true }
}

export function parseAmountDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export function formatCurrencyDisplay(digits: string): string {
  if (!digits) return ""
  const normalized = digits.replace(/^0+(?=\d)/, "")
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function formatRp(digits: string): string {
  const display = formatCurrencyDisplay(digits)
  return display ? `Rp ${display}` : "Rp —"
}

export function formatDateId(iso: string): string {
  if (!iso) return "—"
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function isFieldValueEmpty(type: FieldType, value: string): boolean {
  if (type === "date" || type === "currency") return !value
  return !value.trim()
}

export function resolveFieldDisplay(field: TemplateField, value: string): string {
  if (isFieldValueEmpty(field.type, value)) return `{${field.token}}`
  switch (field.type) {
    case "date":
      return formatDateId(value)
    case "currency":
      return formatRp(value)
    default:
      return value.trim()
  }
}

export function getEmptyFields(draft: Pick<ContractDraft, "fields" | "values">): TemplateField[] {
  return draft.fields.filter((f) =>
    isFieldValueEmpty(f.type, draft.values[f.id] ?? "")
  )
}

export function variableHtml(id: string, token: string): string {
  return `<span data-type="contract-variable" data-key="${id}" data-token="${token}"></span>`
}

export function emptyDraft(): ContractDraft {
  return { fields: [], values: {}, contentHtml: "<p></p>" }
}

export function loadDraftFromStorage(): ContractDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ContractDraft
    if (!parsed || !Array.isArray(parsed.fields) || typeof parsed.values !== "object") {
      return null
    }
    return {
      fields: parsed.fields,
      values: parsed.values ?? {},
      contentHtml: parsed.contentHtml || "<p></p>",
    }
  } catch {
    return null
  }
}

export function saveDraftToStorage(draft: ContractDraft): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm test
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts \
  src/features/playground/components/contract-draft.ts \
  src/features/playground/components/contract-draft.test.ts
git commit -m "feat: add contract draft domain model and vitest"
```

---

### Task 2: Draft store for TipTap node views

**Files:**
- Create: `src/features/playground/components/contract-draft-store.tsx`

- [ ] **Step 1: Implement store (same pattern as old meta store)**

```tsx
"use client"

import { useLayoutEffect, useSyncExternalStore } from "react"
import type { ContractDraft, TemplateField } from "./contract-draft"

export type DraftStoreSnapshot = {
  fields: TemplateField[]
  values: Record<string, string>
}

let current: DraftStoreSnapshot = { fields: [], values: {} }
const listeners = new Set<() => void>()

export function setContractDraftStore(snapshot: DraftStoreSnapshot) {
  current = snapshot
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return current
}

export function useContractDraftStore(): DraftStoreSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function ContractDraftStoreSync({
  fields,
  values,
}: {
  fields: TemplateField[]
  values: Record<string, string>
}) {
  useLayoutEffect(() => {
    setContractDraftStore({ fields, values })
  }, [fields, values])
  return null
}

/** Lookup helpers for suggestion plugins (non-React). */
export function getDraftStoreSnapshot(): DraftStoreSnapshot {
  return current
}

export function findFieldByToken(token: string): TemplateField | undefined {
  return current.fields.find((f) => f.token === token)
}

export function findFieldById(id: string): TemplateField | undefined {
  return current.fields.find((f) => f.id === id)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/playground/components/contract-draft-store.tsx
git commit -m "feat: add contract draft store for TipTap views"
```

---

### Task 3: Starter template (optional sample, not product schema)

**Files:**
- Create: `src/features/playground/components/starter-perjanjian-ks.ts`

Use **fixed UUIDs** so HTML `data-key` matches fields.

- [ ] **Step 1: Create starter**

```ts
import {
  variableHtml,
  type ContractDraft,
  type TemplateField,
} from "./contract-draft"

/** Fixed ids — must match data-key in contentHtml below. */
export const STARTER_FIELD_IDS = {
  judul: "11111111-1111-4111-8111-111111111101",
  pihak1: "11111111-1111-4111-8111-111111111102",
  pihak2: "11111111-1111-4111-8111-111111111103",
  tanggal: "11111111-1111-4111-8111-111111111104",
  nilai: "11111111-1111-4111-8111-111111111105",
} as const

const fields: TemplateField[] = [
  {
    id: STARTER_FIELD_IDS.judul,
    label: "Judul",
    token: "judul",
    type: "text",
  },
  {
    id: STARTER_FIELD_IDS.pihak1,
    label: "Pihak 1",
    token: "pihak1",
    type: "text",
  },
  {
    id: STARTER_FIELD_IDS.pihak2,
    label: "Pihak 2",
    token: "pihak2",
    type: "text",
  },
  {
    id: STARTER_FIELD_IDS.tanggal,
    label: "Tanggal",
    token: "tanggal",
    type: "date",
  },
  {
    id: STARTER_FIELD_IDS.nilai,
    label: "Nilai",
    token: "nilai",
    type: "currency",
  },
]

const v = (id: keyof typeof STARTER_FIELD_IDS) => {
  const f = fields.find((x) => x.id === STARTER_FIELD_IDS[id])!
  return variableHtml(f.id, f.token)
}

const contentHtml = `
<h2 style="text-align: center">${v("judul")}</h2>
<p style="text-align: justify">
Pada hari ini, ${v("tanggal")}, para pihak yang bertanda tangan di bawah ini:
</p>
<p style="text-align: justify">
<strong>${v("pihak1")}</strong>, selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>,
adalah badan hukum yang didirikan berdasarkan hukum Republik Indonesia dan berkedudukan di Indonesia.
</p>
<p style="text-align: justify">
<strong>${v("pihak2")}</strong>, selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>,
adalah badan hukum yang didirikan berdasarkan hukum Republik Indonesia dan berkedudukan di Indonesia.
</p>
<p style="text-align: justify">
Para pihak terlebih dahulu menerangkan bahwa mereka saling bersepakat untuk mengikatkan diri
dalam perjanjian kerja sama dengan ketentuan dan syarat sebagai berikut.
</p>
<h3>Pasal 1 — Ruang Lingkup</h3>
<p style="text-align: justify">
PIHAK PERTAMA dan PIHAK KEDUA sepakat untuk bekerja sama sesuai ruang lingkup yang disepakati bersama.
</p>
<h3>Pasal 2 — Nilai Kontrak</h3>
<p style="text-align: justify">
Nilai perjanjian ini adalah sebesar <strong>${v("nilai")}</strong>.
</p>
<h3>Pasal 3 — Jangka Waktu</h3>
<p style="text-align: justify">
Perjanjian ini berlaku sejak tanggal penandatanganan.
</p>
`

export function createStarterPerjanjianDraft(): ContractDraft {
  return {
    fields,
    values: {
      [STARTER_FIELD_IDS.judul]: "Perjanjian Kerja Sama",
      [STARTER_FIELD_IDS.pihak1]: "PT Contoh Satu",
      [STARTER_FIELD_IDS.pihak2]: "PT Contoh Dua",
      [STARTER_FIELD_IDS.tanggal]: "2026-08-04",
      [STARTER_FIELD_IDS.nilai]: "100000000",
    },
    contentHtml,
  }
}
```

Copy remaining pasal paragraphs from the current `dummy-contract-content.ts` if you want full length — keep merge fields using `v(...)` only.

- [ ] **Step 2: Commit**

```bash
git add src/features/playground/components/starter-perjanjian-ks.ts
git commit -m "feat: add optional Perjanjian KS starter template draft"
```

---

### Task 4: TipTap contract variable node (id + token, dynamic menus)

**Files:**
- Modify: `src/features/playground/components/editor-contract-variable.tsx`

- [ ] **Step 1: Update node attrs and view**

Change attrs to:

```ts
addAttributes() {
  return {
    key: {
      default: "",
      parseHTML: (el) =>
        (el as HTMLElement).getAttribute("data-key") ?? "",
      renderHTML: (attrs) => ({ "data-key": attrs.key }),
    },
    token: {
      default: "",
      parseHTML: (el) =>
        (el as HTMLElement).getAttribute("data-token") ?? "",
      renderHTML: (attrs) =>
        attrs.token ? { "data-token": attrs.token } : {},
    },
  }
}
```

Update `ContractVariableView`:

```tsx
function ContractVariableView({ node }: NodeViewProps) {
  const { fields, values } = useContractDraftStore()
  const id = String(node.attrs.key ?? "")
  const tokenAttr = String(node.attrs.token ?? "")
  const field = fields.find((f) => f.id === id)
  const token = field?.token || tokenAttr || "?"
  const display = field
    ? resolveFieldDisplay(field, values[id] ?? "")
    : `{${token}}`
  const empty = display === `{${token}}`

  return (
    <NodeViewWrapper
      as="span"
      className={cn("contract-variable", empty && "contract-variable--empty")}
      data-key={id}
      data-token={token}
      contentEditable={false}
    >
      <span>{display}</span>
    </NodeViewWrapper>
  )
}
```

Update command:

```ts
insertContractVariable:
  (field: { id: string; token: string }) =>
  ({ commands }) =>
    commands.insertContent({
      type: this.name,
      attrs: { key: field.id, token: field.token },
    }),
```

Update module augmentation for `Commands` accordingly.

- [ ] **Step 2: Dynamic `{token}` input rule**

Replace hardcoded regex with a plugin that reads tokens from `getDraftStoreSnapshot()`:

```ts
addInputRules() {
  return [
    new InputRule({
      find: /\{([a-z0-9_]+)\}$/,
      handler: ({ state, range, match }) => {
        const token = match[1]
        const field = findFieldByToken(token)
        if (!field) return
        const { tr } = state
        tr.replaceWith(
          range.from,
          range.to,
          this.type.create({ key: field.id, token: field.token })
        )
      },
    }),
  ]
}
```

- [ ] **Step 3: `@` suggestion from store**

```ts
items: ({ query }) => {
  const q = query.toLowerCase()
  const { fields } = getDraftStoreSnapshot()
  const list = !q
    ? fields
    : fields.filter(
        (f) =>
          f.token.includes(q) ||
          f.label.toLowerCase().includes(q)
      )
  return list
},
command: ({ editor, range, props }) => {
  const field = props as TemplateField
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContractVariable({ id: field.id, token: field.token })
    .run()
},
```

Update `VariableList` to key by `field.id`, show `field.label` / `@token`.

Empty state copy: `Belum ada variabel — tambah di panel kanan.`

- [ ] **Step 4: Drop static `commands:` map from `createEditorExtension` that listed hardcoded CONTRACT_VARIABLES** (or build from store snapshot at configure time — prefer remove static commands; slash menu in editor will insert fields dynamically).

- [ ] **Step 5: Smoke in browser** (after Task 6 wiring) — for now typecheck:

```bash
pnpm exec tsc --noEmit
```

Fix any type errors from command signature change.

- [ ] **Step 6: Commit**

```bash
git add src/features/playground/components/editor-contract-variable.tsx
git commit -m "feat: dynamic contract variable nodes keyed by field id"
```

---

### Task 5: Variables panel UI (single panel)

**Files:**
- Create: `src/features/playground/components/contract-variables-panel.tsx`

- [ ] **Step 1: Implement panel**

Match existing form chrome (`text-[11px]` eyebrow, muted labels, `h-11`/`md:h-9` inputs, mono hint, amber empty).

Behavior:
- List `draft.fields`; value controls by `type`
- Click label → expand schema row (label input, type select, token input, Hapus)
- Hapus: if `contentHtml` or live editor contains `data-key="{id}"`, `window.confirm(...)`; then remove field + value
- `+ Tambah variabel`: `createField({ label: "Variabel baru", type: "text" })`, append, open schema for that id, set empty value
- Empty list: short help + add button
- Status line: `getEmptyFields(draft)` count

Props:

```ts
export interface ContractVariablesPanelProps {
  draft: ContractDraft
  onChange: (next: ContractDraft) => void
  className?: string
  bare?: boolean
}
```

Currency input: use `formatCurrencyDisplay` / `parseAmountDigits` like the old form.

Textarea for `textarea` type; `type="date"` for date; text otherwise.

- [ ] **Step 2: Commit**

```bash
git add src/features/playground/components/contract-variables-panel.tsx
git commit -m "feat: add single-panel dynamic variables sidebar"
```

---

### Task 6: Wire playground + remove hardcoded meta

**Files:**
- Modify: `src/features/playground/ui/index.tsx`
- Modify: `src/features/playground/components/full-featured-editor.tsx`
- Modify: `src/features/playground/components/contract-editor-toolbar.tsx`
- Modify: `src/features/playground/components/index.ts`
- Delete: `contract-meta.ts`, `contract-meta-form.tsx`, `contract-meta-store.tsx`, `contract-variables.ts`, `dummy-contract-content.ts`

- [ ] **Step 1: Playground page state**

```tsx
"use client"

import { useEffect, useState } from "react"
import {
  loadDraftFromStorage,
  saveDraftToStorage,
  type ContractDraft,
} from "../components/contract-draft"
import { ContractVariablesPanel } from "../components/contract-variables-panel"
import { createStarterPerjanjianDraft } from "../components/starter-perjanjian-ks"
import { FullFeaturedEditor } from "../components/full-featured-editor"

const PlaygroundPage = () => {
  const [draft, setDraft] = useState<ContractDraft | null>(null)

  useEffect(() => {
    setDraft(loadDraftFromStorage() ?? createStarterPerjanjianDraft())
  }, [])

  useEffect(() => {
    if (!draft) return
    saveDraftToStorage(draft)
  }, [draft])

  if (!draft) return null

  return (
    <FullFeaturedEditor
      draft={draft}
      onDraftChange={setDraft}
      sidebar={
        <ContractVariablesPanel draft={draft} onChange={setDraft} />
      }
    />
  )
}

export default PlaygroundPage
```

Note: first paint uses starter when storage empty (SaaS later: blank vs template picker). Spec allows starter as optional template — OK for playground default. Document in code comment: blank = `emptyDraft()` when adding “dokumen baru” later.

- [ ] **Step 2: Update `FullFeaturedEditor`**

Props: `draft`, `onDraftChange`, `sidebar`.

- Sync: `<ContractDraftStoreSync fields={draft.fields} values={draft.values} />`
- `content={draft.contentHtml}`
- `onUpdate`: `onDraftChange({ ...draft, contentHtml: html })`
- Slash menu variable items:

```ts
...draft.fields.map((f) => ({
  title: `{${f.token}}`,
  description: `Variabel: ${f.label}`,
  icon: Braces,
  searchTerms: ["var", "variabel", f.token, f.label.toLowerCase()],
  command: (editor: Editor | null) => {
    editor
      ?.chain()
      .focus()
      .insertContractVariable({ id: f.id, token: f.token })
      .run()
  },
})),
```

Because `slashMenuItems` must react to `draft.fields`, build items inside the component (not module scope), and pass to `EditorSlashMenuExtension.configure` — if configure is only at mount, remount editor when field ids set changes **or** make suggestion read from store only (slash extension may need `items` as function). Prefer: keep non-variable slash items static; variable entries only via `@` from store for simplicity if slash configure is static. **Required by spec:** slash should list variables — if TipTap extension configure is mount-only, key `EditorProvider` with `draft.fields.map(f=>f.id).join()` only when ids change (not on every value keystroke).

- Pass draft into toolbar for mobile sheet.

- [ ] **Step 3: Update toolbar**

Replace `ContractMetaForm` with `ContractVariablesPanel`; props `draft` / `onDraftChange`.

- [ ] **Step 4: Update barrel `index.ts` exports; delete old files; fix all imports**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm lint
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/playground
git commit -m "feat: wire dynamic draft variables through playground editor"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Browser checklist** on `http://localhost:3001`

1. Starter loads; variables show values; canvas shows live text  
2. Clear a value → `{token}` on canvas + amber empty in panel  
3. Click label → edit type to textarea; value control changes  
4. `+ Tambah variabel` → appears in panel; type `@` → new field in menu; insert → live  
5. Change label (tokenManual false) → token hint updates  
6. Edit token manually → `tokenManual`; further label edits keep token  
7. Delete unused field → removed from panel/`@`  
8. Delete field used in canvas → confirm → orphan `{token}` remains  
9. Reload → LocalStorage restores draft  

- [ ] **Step 2: Final commit if verification fixes needed**

```bash
git add -A
git commit -m "fix: polish dynamic variables edge cases"
```

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| User-defined fields + types text/textarea/date/currency | 1, 5 |
| Single panel, schema on label click | 5 |
| Token auto + manual flag | 1, 5 |
| Node `id` + `token` attrs, orphan display | 4 |
| `@` / `/` / `{token}` from fields | 4, 6 |
| LocalStorage draft | 1, 6 |
| Blank = empty fields (API for later; starter is optional template default) | 3, 6 |
| Remove hardcoded ContractMeta | 6 |
| Empty status counts | 5 |
| Delete confirm when in use | 5 |

## Placeholder / consistency review

- Types use `TemplateField`, `ContractDraft`, `FieldType` throughout  
- Insert command always `{ id, token }`  
- Storage key `editor-kontrak:draft:v1`  
- No dual-tab UI in any task  
