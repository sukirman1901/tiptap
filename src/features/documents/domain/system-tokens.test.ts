// src/features/documents/domain/system-tokens.test.ts
import { describe, expect, it } from "vitest"
import { emptyContractOps, createParty } from "./contract-ops"
import {
  SYSTEM_TOKEN_NAMES,
  isReservedToken,
  resolveSystemTokens,
  formatTempoLabel,
} from "./system-tokens"
import type { DocumentStatus } from "./status"

const baseMeta = {
  number: "AGD-2026-0001",
  subject: "Pembuatan website",
  contractDate: "2026-08-09",
  status: "draf" as DocumentStatus,
}

describe("isReservedToken", () => {
  it("blocks system names", () => {
    expect(isReservedToken("pihak_pertama")).toBe(true)
    expect(isReservedToken("klausul_khusus")).toBe(false)
  })
})

describe("formatTempoLabel", () => {
  it("prefers durationDays", () => {
    expect(
      formatTempoLabel({ startDate: null, endDate: null, durationDays: 90 })
    ).toBe("90 hari")
  })

  it("derives days from start/end when duration missing", () => {
    expect(
      formatTempoLabel({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        durationDays: null,
      })
    ).toBe("30 hari")
  })
})

describe("resolveSystemTokens", () => {
  it("maps metadata and parties", () => {
    const ops = emptyContractOps()
    ops.parties = [
      createParty({ displayName: "PT Alpha", kind: "initiator", sortOrder: 1 }),
      createParty({ displayName: "PT Beta", kind: "counterparty", sortOrder: 2 }),
    ]
    ops.tempo = { startDate: null, endDate: null, durationDays: 90 }
    const tokens = resolveSystemTokens({ ...baseMeta, ops })
    expect(tokens.nomor_kontrak).toBe("AGD-2026-0001")
    expect(tokens.perihal).toBe("Pembuatan website")
    expect(tokens.tanggal_kontrak).toBe("2026-08-09")
    expect(tokens.pihak_pertama).toBe("PT Alpha")
    expect(tokens.pihak_kedua).toBe("PT Beta")
    expect(tokens.jangka_waktu).toBe("90 hari")
    expect(Object.keys(tokens).sort()).toEqual([...SYSTEM_TOKEN_NAMES].sort())
  })
})
