export type FieldType = "text" | "textarea" | "date" | "currency"

export type TemplateField = {
  id: string
  label: string
  token: string
  type: FieldType
  tokenManual?: boolean
  required?: boolean
}

export type ContractCommentStatus = "open" | "resolved"

export type ContractComment = {
  id: string
  /** ProseMirror positions at creation time (best-effort). */
  from: number
  to: number
  /** Selected text snapshot for display + orphan fallback. */
  quote: string
  body: string
  authorName: string
  createdAt: string
  status: ContractCommentStatus
}

export type ContractDraft = {
  fields: TemplateField[]
  values: Record<string, string>
  contentHtml: string
  comments: ContractComment[]
}

/** Bump when default seed shape changes so old LocalStorage drafts are ignored. */
export const DRAFT_STORAGE_KEY = "editor-kontrak:draft:v2"

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
  const label = input.label.trim() || "Properti"
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Soften legacy header chrome baked into saved HTML
 * (`text-muted-foreground`, `bg-muted/10`, `font-medium` on <th>).
 */
function normalizePreviewTableHtml(html: string): string {
  return html.replace(/<th\b([^>]*)>/gi, (_full, attrs: string) => {
    let next = attrs
    next = next.replace(
      /\bfont-medium\b|\btext-muted-foreground\b|\bbg-muted\/10\b/g,
      ""
    )
    next = next.replace(/\s+/g, " ").trim()
    return next ? `<th ${next}>` : "<th>"
  })
}

/** HTML for Preview: merge-field chips → nilai tampilan (atau {token} jika kosong). */
export function buildPreviewHtml(draft: ContractDraft): string {
  let html = draft.contentHtml || "<p></p>"
  for (const field of draft.fields) {
    const display = escapeHtml(
      resolveFieldDisplay(field, draft.values[field.id] ?? "")
    )
    const byKey = new RegExp(
      `<span[^>]*data-type=["']contract-variable["'][^>]*data-key=["']${field.id}["'][^>]*>[\\s\\S]*?<\\/span>`,
      "gi"
    )
    const byKeyAlt = new RegExp(
      `<span[^>]*data-key=["']${field.id}["'][^>]*data-type=["']contract-variable["'][^>]*>[\\s\\S]*?<\\/span>`,
      "gi"
    )
    html = html.replace(byKey, display).replace(byKeyAlt, display)
  }
  // Orphan chips still in doc
  html = html.replace(
    /<span[^>]*data-type=["']contract-variable["'][^>]*data-token=["']([^"']+)["'][^>]*>[\s\S]*?<\/span>/gi,
    (_m, token: string) => `{${escapeHtml(token)}}`
  )
  html = html.replace(
    /<span[^>]*data-token=["']([^"']+)["'][^>]*data-type=["']contract-variable["'][^>]*>[\s\S]*?<\/span>/gi,
    (_m, token: string) => `{${escapeHtml(token)}}`
  )
  return normalizePreviewTableHtml(html)
}

export function emptyDraft(): ContractDraft {
  return { fields: [], values: {}, contentHtml: "<p></p>", comments: [] }
}

export function createComment(input: {
  from: number
  to: number
  quote: string
  body: string
  authorName: string
}): ContractComment {
  return {
    id: crypto.randomUUID(),
    from: input.from,
    to: input.to,
    quote: input.quote.trim(),
    body: input.body.trim(),
    authorName: input.authorName.trim() || "Anonim",
    createdAt: new Date().toISOString(),
    status: "open",
  }
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
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    }
  } catch {
    return null
  }
}

export function saveDraftToStorage(draft: ContractDraft): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
}
