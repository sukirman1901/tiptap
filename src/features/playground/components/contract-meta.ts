export interface ContractMeta {
  title: string
  party1: string
  party2: string
  date: string
  amount: string
}

export const INITIAL_CONTRACT_META: ContractMeta = {
  title: "Perjanjian Kerja Sama",
  party1: "PT Contoh Satu",
  party2: "PT Contoh Dua",
  date: "2026-08-04",
  amount: "100000000",
}

/** Digits only from a rupiah input string. */
export function parseAmountDigits(value: string): string {
  return value.replace(/\D/g, "")
}

/** Format digit string as `1.000.000` (id-ID). Empty → "". */
export function formatAmountDisplay(digits: string): string {
  if (!digits) return ""
  const normalized = digits.replace(/^0+(?=\d)/, "")
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/** `Rp 100.000.000` or `Rp —` when empty. */
export function formatRp(digits: string): string {
  const display = formatAmountDisplay(digits)
  return display ? `Rp ${display}` : "Rp —"
}

/** Format ISO `yyyy-mm-dd` → `4 Agustus 2026`. */
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
