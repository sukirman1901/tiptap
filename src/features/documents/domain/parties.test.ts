import { describe, expect, it } from "vitest"
import {
  addCounterparty,
  isValidEmail,
  removeParty,
  seededContractOps,
  syncSignaturesWithParties,
  updateParty,
} from "./parties"

describe("seededContractOps", () => {
  it("creates initiator + counterparty and matching signature stubs", () => {
    const ops = seededContractOps()
    expect(ops.parties).toHaveLength(2)
    expect(ops.parties[0]!.kind).toBe("initiator")
    expect(ops.parties[1]!.kind).toBe("counterparty")
    expect(ops.parties[0]!.displayName).toBe("")
    expect(ops.signatures).toHaveLength(2)
    expect(ops.signatures.every((s) => s.signedAt === null)).toBe(true)
  })
})

describe("removeParty", () => {
  it("refuses to go below 2 parties", () => {
    const ops = seededContractOps()
    const next = removeParty(ops, ops.parties[1]!.id)
    expect(next.ok).toBe(false)
  })

  it("removes when more than 2", () => {
    let ops = seededContractOps()
    ops = addCounterparty(ops)
    expect(ops.parties).toHaveLength(3)
    const result = removeParty(ops, ops.parties[2]!.id)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.ops.parties).toHaveLength(2)
      expect(result.ops.signatures).toHaveLength(2)
    }
  })
})

describe("isValidEmail", () => {
  it("accepts simple emails", () => {
    expect(isValidEmail("a@b.co")).toBe(true)
    expect(isValidEmail("")).toBe(false)
    expect(isValidEmail("nope")).toBe(false)
  })
})

describe("updateParty", () => {
  it("updates email and keeps signatures aligned", () => {
    const ops = seededContractOps()
    const id = ops.parties[1]!.id
    const next = updateParty(ops, id, { email: "x@y.z" })
    expect(next.parties.find((p) => p.id === id)?.email).toBe("x@y.z")
  })
})

describe("syncSignaturesWithParties", () => {
  it("drops signatures for removed non-signers and keeps signedAt when party remains", () => {
    const ops = seededContractOps()
    ops.signatures[0]!.signedAt = "2026-01-01T00:00:00.000Z"
    const synced = syncSignaturesWithParties(ops)
    expect(synced.signatures[0]!.signedAt).toBe("2026-01-01T00:00:00.000Z")
  })
})
