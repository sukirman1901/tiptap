import { describe, expect, it } from "vitest"
import {
  emptyContractOps,
  emptyPaymentPlan,
  emptyStamp,
  emptyTempo,
} from "./contract-ops"

describe("emptyContractOps", () => {
  it("starts with no parties, unlocked percent plan, optional stamp", () => {
    const ops = emptyContractOps()
    expect(ops.parties).toEqual([])
    expect(ops.signatures).toEqual([])
    expect(ops.attachments).toEqual([])
    expect(ops.paymentPlan.mode).toBe("percent")
    expect(ops.paymentPlan.currency).toBe("IDR")
    expect(ops.paymentPlan.lockedAt).toBeNull()
    expect(ops.paymentPlan.milestones).toEqual([])
    expect(ops.tempo).toEqual(emptyTempo())
    expect(ops.stamp).toEqual(emptyStamp())
    expect(ops.stamp.required).toBe(false)
    expect(ops.stamp.status).toBe("not_required")
  })
})

describe("emptyPaymentPlan", () => {
  it("creates a fresh unlocked plan id", () => {
    const a = emptyPaymentPlan()
    const b = emptyPaymentPlan()
    expect(a.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })
})
