# Contract Workspace UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the TipTap playground into a desktop document workspace: A4 paper canvas (left) + dummy contract metadata form (right), keeping the existing front header/footer.

**Architecture:** Adapt `FullFeaturedEditor` so the toolbar sits above a muted stage and `EditorContent` renders inside an A4 page frame. Compose that with a new `ContractMetaForm` in a two-column shell in `features/playground/ui`. Widen `FrontContent` so the workspace can use full viewport width under the header.

**Tech Stack:** Next.js App Router, React client components, TipTap registry (`@/registry/editor`), Tailwind CSS v4, shadcn `Input`/`Label`, lucide-react

**Spec:** `docs/superpowers/specs/2026-08-04-contract-workspace-ui-design.md`

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/layouts/front-stage/front-content.tsx` | Modify | Full-bleed main (drop `container`) so workspace can span width |
| `src/features/playground/components/document-canvas.tsx` | Create | Muted stage + A4 white page (210×297mm, margins) |
| `src/features/playground/components/contract-meta-form.tsx` | Create | Dummy form: judul, pihak 1/2, tanggal, nilai |
| `src/features/playground/components/dummy-contract-content.ts` | Create | Initial HTML for contract draft |
| `src/features/playground/components/full-featured-editor.tsx` | Modify | Toolbar + DocumentCanvas wrapping EditorContent; dummy default content; drop WordCount footer for cleaner page |
| `src/features/playground/components/index.ts` | Modify | Export new components |
| `src/features/playground/ui/index.tsx` | Modify | Two-column shell: editor left, form right |

---

### Task 1: Full-bleed front content

**Files:**
- Modify: `src/layouts/front-stage/front-content.tsx`

- [ ] **Step 1: Remove container constraint**

Replace the file contents with:

```tsx
import { PropsWithChildren } from "react"

export interface FrontContentProps extends PropsWithChildren {}

const FrontContent = ({ children }: FrontContentProps) => {
  return <main className="min-h-dvh w-full">{children}</main>
}

export default FrontContent
```

- [ ] **Step 2: Verify header/footer still render**

Run: open `http://localhost:3001` (dev server should already be on port 3001)  
Expected: page loads; header “Editor” and footer still visible; content can use full width.

- [ ] **Step 3: Commit** (only if user asked to commit)

```bash
git add src/layouts/front-stage/front-content.tsx
git commit -m "fix: allow full-bleed workspace under front header"
```

---

### Task 2: DocumentCanvas (A4 page frame)

**Files:**
- Create: `src/features/playground/components/document-canvas.tsx`

- [ ] **Step 1: Create the canvas component**

```tsx
import { cn } from "@/lib/utils"
import type { PropsWithChildren } from "react"

export interface DocumentCanvasProps extends PropsWithChildren {
  className?: string
}

/**
 * MS Word–style stage: muted background + centered A4 sheet.
 * Margins: top 30mm, right 25mm, bottom 25mm, left 30mm.
 */
export function DocumentCanvas({ children, className }: DocumentCanvasProps) {
  return (
    <div
      className={cn(
        "bg-muted/60 flex flex-1 justify-center overflow-auto p-6 md:p-8",
        className
      )}
    >
      <div
        className={cn(
          "bg-background text-foreground box-border w-[210mm] min-h-[297mm] shadow-md",
          "pt-[30mm] pr-[25mm] pb-[25mm] pl-[30mm]"
        )}
        data-paper="a4"
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke-check in isolation later** (wired in Task 4)

No separate unit test — UI shell verified manually per spec.

- [ ] **Step 3: Commit** (only if user asked)

```bash
git add src/features/playground/components/document-canvas.tsx
git commit -m "feat: add A4 document canvas frame"
```

---

### Task 3: ContractMetaForm + dummy content

**Files:**
- Create: `src/features/playground/components/contract-meta-form.tsx`
- Create: `src/features/playground/components/dummy-contract-content.ts`

- [ ] **Step 1: Create dummy contract HTML**

File: `src/features/playground/components/dummy-contract-content.ts`

```ts
/** Initial TipTap HTML — short Indonesian contract draft (dummy). */
export const DUMMY_CONTRACT_CONTENT = `
<h2 style="text-align: center">PERJANJIAN KERJA SAMA</h2>
<p style="text-align: justify">
Pada hari ini, para pihak yang bertanda tangan di bawah ini:
</p>
<p style="text-align: justify">
<strong>Pihak Pertama</strong>, selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.
</p>
<p style="text-align: justify">
<strong>Pihak Kedua</strong>, selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.
</p>
<p style="text-align: justify">
Para pihak sepakat untuk mengikatkan diri dalam perjanjian kerja sama dengan ketentuan sebagai berikut.
</p>
<h3>Pasal 1 — Ruang Lingkup</h3>
<p style="text-align: justify">
PIHAK PERTAMA dan PIHAK KEDUA sepakat untuk bekerja sama sesuai ruang lingkup yang disepakati bersama.
</p>
<h3>Pasal 2 — Nilai Kontrak</h3>
<p style="text-align: justify">
Nilai perjanjian akan ditentukan dan dicantumkan dalam dokumen ini.
</p>
<p style="text-align: justify">
Demikian perjanjian ini dibuat untuk dipatuhi oleh kedua belah pihak.
</p>
`.trim()
```

- [ ] **Step 2: Create the form component**

File: `src/features/playground/components/contract-meta-form.tsx`

```tsx
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, type ChangeEvent } from "react"

export type ContractMeta = {
  title: string
  party1: string
  party2: string
  date: string
  amount: string
}

const INITIAL: ContractMeta = {
  title: "Perjanjian Kerja Sama",
  party1: "PT Contoh Satu",
  party2: "PT Contoh Dua",
  date: "2026-08-04",
  amount: "100000000",
}

export function ContractMetaForm() {
  const [meta, setMeta] = useState<ContractMeta>(INITIAL)

  const set =
    (key: keyof ContractMeta) => (e: ChangeEvent<HTMLInputElement>) =>
      setMeta((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <aside className="bg-background flex w-[340px] shrink-0 flex-col border-l">
      <div className="sticky top-14 space-y-5 overflow-auto p-5">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Informasi Dokumen
        </h2>

        <div className="space-y-2">
          <Label htmlFor="contract-title">Judul kontrak</Label>
          <Input
            id="contract-title"
            value={meta.title}
            onChange={set("title")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="party1">Pihak 1</Label>
          <Input id="party1" value={meta.party1} onChange={set("party1")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="party2">Pihak 2</Label>
          <Input id="party2" value={meta.party2} onChange={set("party2")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contract-date">Tanggal</Label>
          <Input
            id="contract-date"
            type="date"
            value={meta.date}
            onChange={set("date")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contract-amount">Nilai (Rp)</Label>
          <Input
            id="contract-amount"
            inputMode="numeric"
            value={meta.amount}
            onChange={set("amount")}
          />
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Commit** (only if user asked)

```bash
git add src/features/playground/components/contract-meta-form.tsx src/features/playground/components/dummy-contract-content.ts
git commit -m "feat: add dummy contract meta form and sample content"
```

---

### Task 4: Wire FullFeaturedEditor into DocumentCanvas

**Files:**
- Modify: `src/features/playground/components/full-featured-editor.tsx`
- Modify: `src/features/playground/components/index.ts`

- [ ] **Step 1: Import canvas + dummy content; wrap EditorContent**

At top of `full-featured-editor.tsx`, add:

```tsx
import { DocumentCanvas } from "./document-canvas"
import { DUMMY_CONTRACT_CONTENT } from "./dummy-contract-content"
```

Change default `content` prop to `DUMMY_CONTRACT_CONTENT`.

Remove the `WordCount` function and its usage.

Wrap provider children so structure is:

```tsx
    <EditorProvider
      content={content}
      extensions={[/* unchanged */]}
      onUpdate={({ editor }) => {
        onUpdate?.(editor.getHTML())
      }}
    >
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        <EditorToolbar className="bg-background sticky top-14 z-10 flex flex-wrap items-center gap-1 border-b p-2">
          {/* keep ALL existing toolbar controls unchanged */}
        </EditorToolbar>

        <DocumentCanvas>
          <EditorContent className="prose dark:prose-invert max-w-none [&_.ProseMirror]:min-h-[240mm] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:text-justify" />
        </DocumentCanvas>

        {/* keep bubble menu block unchanged */}
      </div>
    </EditorProvider>
```

Default props:

```tsx
export function FullFeaturedEditor({
  content = DUMMY_CONTRACT_CONTENT,
  onUpdate,
}: FullFeaturedEditorProps) {
```

Do not remove formatting features from the toolbar or bubble menu.

- [ ] **Step 2: Update barrel exports**

`src/features/playground/components/index.ts`:

```ts
/**
 * Editor Playground Examples
 */

export { FullFeaturedEditor } from "./full-featured-editor"
export { DocumentCanvas } from "./document-canvas"
export { ContractMetaForm } from "./contract-meta-form"
export { DUMMY_CONTRACT_CONTENT } from "./dummy-contract-content"
```

- [ ] **Step 3: Manual check**

Open `http://localhost:3001`  
Expected: toolbar on top; gray stage with white A4 page; contract sample text; typing works; slash menu works.

- [ ] **Step 4: Commit** (only if user asked)

```bash
git add src/features/playground/components/full-featured-editor.tsx src/features/playground/components/index.ts
git commit -m "feat: render TipTap content inside A4 document canvas"
```

---

### Task 5: Two-column playground shell

**Files:**
- Modify: `src/features/playground/ui/index.tsx`

- [ ] **Step 1: Replace playground page with split layout**

```tsx
"use client"

import { ContractMetaForm } from "../components/contract-meta-form"
import { FullFeaturedEditor } from "../components/full-featured-editor"

const PlaygroundPage = () => {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <FullFeaturedEditor />
      </div>
      <ContractMetaForm />
    </div>
  )
}

export default PlaygroundPage
```

- [ ] **Step 2: Manual verification checklist**

Open `http://localhost:3001` and confirm:

1. Existing header + footer still show
2. No “Editor Playground” title
3. Left: toolbar + A4 canvas with dummy kontrak
4. Right: “INFORMASI DOKUMEN” with 5 fields (judul, pihak 1, pihak 2, tanggal, nilai)
5. Form edits do **not** change editor HTML
6. Editor formatting (bold, justify, slash menu) still works
7. A4 approx width 210mm; padding approx 30/25/25/30 mm

- [ ] **Step 3: Commit** (only if user asked)

```bash
git add src/features/playground/ui/index.tsx
git commit -m "feat: split playground into document canvas and meta form"
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Keep FrontHeader/FrontFooter | Task 1, Task 5 |
| Full-bleed under header | Task 1 |
| A4 210×297mm + margins 30/25/25/30 | Task 2 |
| Dummy form 5 fields, local state | Task 3 |
| Sample contract HTML | Task 3 |
| Toolbar above page, TipTap inside page | Task 4 |
| Two-column shell, no playground title | Task 5 |
| No form↔editor sync | Task 3 + 5 |
| No Digdaya chrome / preview / API | Omitted intentionally |

## Placeholder / consistency review

- No TBD steps
- Names consistent: `DocumentCanvas`, `ContractMetaForm`, `DUMMY_CONTRACT_CONTENT`
- Commits gated on user request (repo user rule)

---

## Execution handoff

Plan complete. Choose how to implement:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks
2. **Inline Execution** — run tasks in this session with checkpoints

Which approach?
