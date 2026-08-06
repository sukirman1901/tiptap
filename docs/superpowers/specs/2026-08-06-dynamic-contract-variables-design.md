# Dynamic Contract Variables

**Date:** 2026-08-06  
**Status:** Approved (pending user review of this spec)  
**Repo:** Editor Kontrak (`tiptap` playground)

## Problem

Contract metadata is hardcoded (`judul`, `pihak1`, `pihak2`, `tanggal`, `nilai`) with a fixed form. For a future SaaS (templates + documents), fields must be **user-defined**: any labels, typed controls, callable from the canvas, and persistable as part of a template.

## Goals

- User can **add / edit / remove** variables (schema) without product-fixed field names
- Field types v1: `text` | `textarea` | `date` | `currency`
- Values fill live merge fields in the TipTap canvas (`@`, `/`, `{token}`)
- Token auto-generated from label, editable
- Data model is **template-ready** for SaaS; this phase uses LocalStorage
- UI stays **clean / minimal** and matches the current Editor Kontrak sidebar

## Non-goals (this phase)

- Auth, multi-tenant API, cloud template gallery
- Separate “template builder” route (can come later for SaaS roles)
- Dual Isi/Schema tabs (rejected — too noisy for current single-author flow)
- Extra field types (`select`, `email`, `richtext`, …)
- Auto-inserting new variables into document body (insert remains explicit via `@` / `/`)

## Decisions

| Topic | Choice |
|---|---|
| Roles now | Same person authors schema and fills values |
| UI pattern | **Single panel** — fill by default; schema edit on demand |
| Field ownership | 100% user-defined; no hardcoded product fields |
| Blank document | `fields: []` |
| Starter content | Optional starter **template** may ship sample fields; not baked into the product schema |
| Token | Auto from label (`Nama Pihak` → `nama_pihak`), editable |
| Persistence | LocalStorage draft with template-shaped JSON |
| Node identity | TipTap attrs: `data-key` = `field.id`; also persist `data-token` snapshot for orphan/empty display |

## Data model

```ts
type FieldType = "text" | "textarea" | "date" | "currency"

type TemplateField = {
  id: string // UUID — stable key for values + node attrs
  label: string
  token: string // slug used in {token} empty display + menus
  type: FieldType
  /** When true, label edits do not auto-rewrite token */
  tokenManual?: boolean
  required?: boolean
}

type ContractDraft = {
  fields: TemplateField[]
  values: Record<string, string> // keyed by field.id
  contentHtml: string
}
```

### SaaS mapping (later)

| Now | Later |
|---|---|
| `fields` + `contentHtml` | **Template** |
| `values` (+ document content copy) | **Document** created from a template |
| LocalStorage | API + auth |

## UI

### Sidebar — single panel “Variabel”

Matches current chrome: uppercase eyebrow, muted labels, thin inputs, mono `{token}` hints, dashed add affordance.

1. **Default (fill):** each field shows label + typed control + `{token}` hint + empty-state feedback (same spirit as current amber “Belum diisi”).
2. **Edit schema (on demand):** click label → expand inline: edit label, type select, show/edit token, Hapus.
3. **Add:** `+ Tambah variabel` → create field (default `text`), focus label/value; token auto-updates from label until user overrides token.
4. **Empty schema:** short copy + CTA to add; `@` / slash variable lists empty with same CTA.

### Canvas

- Insert only via `@` menu, slash items, or `{token}` input rule — from current `fields[]`.
- Resolved display uses `values[id]` formatted by `type` (date → id-ID long date; currency → `Rp …`).
- Empty value → show `{token}` from live schema (muted).
- Orphan node (field id missing from `fields`): show `{data-token}` from the node snapshot (muted); user deletes or replaces the node manually.

### Delete field

Confirm if the field id appears in the document. After delete: remove from `fields` / `values`; canvas nodes with that id become orphans (still visible as token placeholders).

## Behavior rules

- Changing **label** regenerates token only when `tokenManual` is false.
- Editing **token** sets `tokenManual: true`; updates menus and empty placeholders; does not change `id`.
- Field order = array order (add appends). Reorder controls are out of this phase.
- Replace hardcoded `ContractMeta` / `CONTRACT_VARIABLES` constants with the dynamic store.

## Migration (playground)

1. Introduce `ContractDraft` store (React context or existing meta store generalized).
2. Seed from optional starter template JSON (content + fields), not from fixed TypeScript field unions.
3. Persist to LocalStorage on change; hydrate on load.
4. Point `editor-contract-variable`, slash/`@` menus, and sidebar form at `fields` + `values`.

## Testing

- Add field → appears in form and `@` menu; insert → live value updates.
- Type-specific controls: textarea height, date picker, currency formatting.
- Empty / filled status counts.
- Delete field with/without canvas usage.
- Reload page → draft restored from LocalStorage.
- Blank draft → empty panel, no crash on `@`.

## Out of scope follow-ups

- Template gallery UI (“pakai template” / “simpan sebagai template”)
- Role-gated UI (hide schema edit for fillers only)
- Collaborative editing / field permissions
