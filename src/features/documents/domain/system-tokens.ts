// src/features/documents/domain/system-tokens.ts
import type { ContractOps, Tempo } from "./contract-ops"

export const SYSTEM_TOKEN_NAMES = [
  "nomor_kontrak",
  "perihal",
  "tanggal_kontrak",
  "pihak_pertama",
  "pihak_kedua",
  "jangka_waktu",
] as const

export type SystemTokenName = (typeof SYSTEM_TOKEN_NAMES)[number]

export type SystemTokenValues = Record<SystemTokenName, string>

export function isReservedToken(token: string): boolean {
  return (SYSTEM_TOKEN_NAMES as readonly string[]).includes(token)
}

export function formatTempoLabel(tempo: Tempo): string {
  if (tempo.durationDays != null && tempo.durationDays > 0) {
    return `${tempo.durationDays} hari`
  }
  if (tempo.startDate && tempo.endDate) {
    const start = new Date(`${tempo.startDate}T00:00:00`)
    const end = new Date(`${tempo.endDate}T00:00:00`)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const ms = end.getTime() - start.getTime()
      const days = Math.round(ms / (24 * 60 * 60 * 1000))
      if (days > 0) return `${days} hari`
    }
  }
  return ""
}

export function resolveSystemTokens(input: {
  number: string | null
  subject: string | null
  contractDate: string | null
  ops: ContractOps
}): SystemTokenValues {
  const byOrder = [...input.ops.parties].sort((a, b) => a.sortOrder - b.sortOrder)
  return {
    nomor_kontrak: input.number?.trim() ?? "",
    perihal: input.subject?.trim() ?? "",
    tanggal_kontrak: input.contractDate?.trim() ?? "",
    pihak_pertama: byOrder[0]?.displayName?.trim() ?? "",
    pihak_kedua: byOrder[1]?.displayName?.trim() ?? "",
    jangka_waktu: formatTempoLabel(input.ops.tempo),
  }
}
