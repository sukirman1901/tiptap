# Contract Document Workspace UI

**Date:** 2026-08-04  
**Status:** Approved (pending user review of this spec)

## Problem

The TipTap playground is a single-column demo page. We need a document workspace closer to a legal/contract drafting UI: MS Word–style page canvas on the left, metadata form on the right — without rebuilding the whole Digdaya shell.

## Goals

- Left: TipTap editor on an A4 “paper” canvas with formal margins
- Right: simple dummy contract metadata form
- Keep existing `FrontHeader` and `FrontFooter`
- Desktop-first split layout (approach 1)

## Non-goals

- Syncing form fields into the editor content
- Preview / print / PDF export
- Auth, persistence, or API
- Digdaya-style app chrome (breadcrumb, notifications, profile)
- Custom Extensions / Read-Only tabs (already removed)

## Layout

```
[ FrontHeader — existing ]
┌──────────────────────────────┬───────────────────┐
│ Toolbar (sticky over canvas) │ INFORMASI DOKUMEN │
│ ┌──────────────────────────┐ │ Judul kontrak     │
│ │ A4 page + shadow         │ │ Pihak 1           │
│ │ TipTap content           │ │ Pihak 2           │
│ │ margins T3 R2.5 B2.5 L3  │ │ Tanggal           │
│ └──────────────────────────┘ │ Nilai (Rp)        │
│ bg muted, vertical scroll    │ sidebar ~340px    │
└──────────────────────────────┴───────────────────┘
[ FrontFooter — existing ]
```

- Remove playground title (“Editor Playground”) / intro copy
- Left column: `flex-1`, muted background, centered A4 sheet
- Right column: ~340px, sticky while canvas scrolls
- No soft mobile stack in this iteration (pure approach 1)

## Paper & typography

| Spec | Value |
|------|--------|
| Paper | A4 — `210mm` × `297mm` (min-height) |
| Padding (T R B L) | `30mm 25mm 25mm 30mm` |
| Body alignment | Justify preferred for contract body |
| Page chrome | White surface, subtle shadow, on muted gray stage |

## Components

| Unit | Responsibility |
|------|----------------|
| `features/playground/ui` | Two-column shell; compose canvas + form |
| `DocumentCanvas` (new) | Stage background + A4 page frame + margins |
| `FullFeaturedEditor` (adapt) | Existing TipTap + toolbar; content rendered inside page |
| `ContractMetaForm` (new) | Local-state dummy fields only |

### Form fields (dummy)

1. Judul kontrak
2. Pihak 1
3. Pihak 2
4. Tanggal
5. Nilai (Rp)

Local React state only — no editor injection.

### Editor

- Reuse full-featured extensions/toolbar
- Toolbar sits above the page stage (not inside the paper)
- Default content: short Indonesian contract draft HTML (dummy)

## Data flow

- Form state ↔ isolated in `ContractMetaForm` / parent local state
- Editor HTML ↔ TipTap only (`onUpdate` optional, unused for form)
- No shared store or persistence

## Error / empty handling

- Form: empty strings allowed; no validation beyond basic input types
- Editor: always has initial dummy content

## Testing (light)

- Manual: desktop layout, A4 proportions, form editable, editor typing/formatting works
- No new automated tests required for this UI shell pass

## Implementation notes

- Prefer CSS `mm` units for page size and margins so print-ish proportions stay clear
- Touch only playground feature files + minimal editor wrapper styles; avoid registry API redesign
- Icons: keep `lucide-react` (project standard)
