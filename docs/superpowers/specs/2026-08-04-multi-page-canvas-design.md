# Multi-page A4 Canvas (Hybrid)

**Date:** 2026-08-04  
**Status:** Approved  
**Parent:** [Contract Document Workspace UI](./2026-08-04-contract-workspace-ui-design.md)

## Problem

A contract is rarely one page. The playground canvas was a single growing A4 box, so long drafts looked like one endless sheet. Page break was only a dashed label, not a real sheet break.

## Goals

- Stacked A4 sheets with gray stage gaps between them (Digdaya / Word-like)
- One continuous TipTap editor (not one editor per page)
- Manual page break consumes remaining page space + gap so the next block starts on the next sheet
- Auto overflow grows the number of paper frames from content height

## Non-goals

- Perfect widow/orphan control or mid-paragraph page clipping
- Page numbers / running headers / footers
- Print engine beyond existing `break-after: page`
- Multi-editor or `doc > page+` document model

## Approach

Continuous editor + paper chrome behind content.

| Token | Value |
|-------|--------|
| Page | `210mm × 297mm` |
| Margins | T30 / R25 / B25 / L30 mm |
| Content height / page | `242mm` |
| Gap | `16px` (`gap-4`) |

`pageCount = max(1, ceil(contentHeight / pageContentHeight))`.

Manual `pageBreak` node: NodeView spacer height = distance to next sheet’s content top (remaining content box + bottom margin + gap + next top margin).

## Components

| Unit | Responsibility |
|------|----------------|
| `DocumentCanvas` | Stage, N paper frames, content flow overlay, measure page count |
| `useA4PageCount` | ResizeObserver + mm sentinel → page count |
| `EditorPageBreakExtension` | Atom + spacer NodeView + Cmd/Ctrl+Enter |

## Mobile

Multi-sheet chrome is `md+`. Below `md`, keep a simple readable single column (existing soft layout).
