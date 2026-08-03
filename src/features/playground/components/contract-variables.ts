import {
  formatDateId,
  formatRp,
  type ContractMeta,
} from "./contract-meta"

/** Keys usable as `{nilai}` / `@nilai` in the canvas. */
export type ContractVariableKey =
  | "judul"
  | "pihak1"
  | "pihak2"
  | "tanggal"
  | "nilai"

export interface ContractVariableDef {
  key: ContractVariableKey
  /** Shown in @ menu */
  label: string
  /** Token without braces, e.g. `nilai` */
  token: string
  searchTerms: string[]
}

export const CONTRACT_VARIABLES: ContractVariableDef[] = [
  {
    key: "judul",
    label: "Judul",
    token: "judul",
    searchTerms: ["judul", "title", "nama"],
  },
  {
    key: "pihak1",
    label: "Pihak 1",
    token: "pihak1",
    searchTerms: ["pihak1", "pihak", "party1", "pertama"],
  },
  {
    key: "pihak2",
    label: "Pihak 2",
    token: "pihak2",
    searchTerms: ["pihak2", "pihak", "party2", "kedua"],
  },
  {
    key: "tanggal",
    label: "Tanggal",
    token: "tanggal",
    searchTerms: ["tanggal", "date", "hari"],
  },
  {
    key: "nilai",
    label: "Nilai kontrak",
    token: "nilai",
    searchTerms: ["nilai", "amount", "harga", "rp"],
  },
]

const KEY_SET = new Set<string>(CONTRACT_VARIABLES.map((v) => v.key))

export function isContractVariableKey(value: string): value is ContractVariableKey {
  return KEY_SET.has(value)
}

/** Live display string for a variable given form meta. */
export function resolveContractVariable(
  meta: ContractMeta,
  key: ContractVariableKey
): string {
  switch (key) {
    case "judul":
      return meta.title.trim() || `{${key}}`
    case "pihak1":
      return meta.party1.trim() || `{${key}}`
    case "pihak2":
      return meta.party2.trim() || `{${key}}`
    case "tanggal":
      return meta.date ? formatDateId(meta.date) : `{${key}}`
    case "nilai":
      return meta.amount ? formatRp(meta.amount) : `{${key}}`
    default:
      return `{${key}}`
  }
}

export function findVariableByQuery(query: string): ContractVariableDef[] {
  const q = query.toLowerCase().replace(/^[{@]|[}]$/g, "")
  if (!q) return CONTRACT_VARIABLES
  return CONTRACT_VARIABLES.filter(
    (v) =>
      v.token.includes(q) ||
      v.label.toLowerCase().includes(q) ||
      v.searchTerms.some((t) => t.includes(q))
  )
}

/** HTML snippet for seed content / insert. */
export function variableHtml(key: ContractVariableKey): string {
  return `<span data-type="contract-variable" data-key="${key}"></span>`
}
