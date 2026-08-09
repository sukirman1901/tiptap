// src/features/documents/domain/payment-lock.test.ts
import { describe, expect, it } from "vitest"
import {
  createMilestone,
  createParty,
  emptyContractOps,
  type ContractOps,
} from "./contract-ops"
import {
  assertPlanEditable,
  canLockPaymentPlan,
  milestonesPercentSum,
  validateMilestonesForLock,
} from "./payment-lock"

function opsReadyToLock(): ContractOps {
  const ops = emptyContractOps()
  const p1 = createParty({
    displayName: "A",
    kind: "initiator",
    sortOrder: 1,
    signOrder: 1,
  })
  const p2 = createParty({
    displayName: "B",
    kind: "counterparty",
    sortOrder: 2,
    signOrder: 2,
  })
  ops.parties = [p1, p2]
  ops.signatures = [
    {
      id: "s1",
      partyId: p1.id,
      signOrder: 1,
      signedAt: "2026-08-01T00:00:00.000Z",
      method: "demo",
    },
    {
      id: "s2",
      partyId: p2.id,
      signOrder: 2,
      signedAt: "2026-08-02T00:00:00.000Z",
      method: "demo",
    },
  ]
  ops.paymentPlan.milestones = [
    createMilestone({ label: "DP", sortOrder: 1, mode: "percent", percent: 50 }),
    createMilestone({ label: "Pelunasan", sortOrder: 2, mode: "percent", percent: 50 }),
  ]
  return ops
}

describe("milestonesPercentSum", () => {
  it("sums percents", () => {
    const ops = opsReadyToLock()
    expect(milestonesPercentSum(ops.paymentPlan.milestones)).toBe(100)
  })
})

describe("validateMilestonesForLock", () => {
  it("requires sum 100 in percent mode", () => {
    const ops = opsReadyToLock()
    ops.paymentPlan.milestones[0]!.percent = 40
    expect(validateMilestonesForLock(ops.paymentPlan).ok).toBe(false)
  })

  it("requires non-empty amount digits in amount mode", () => {
    const ops = emptyContractOps()
    ops.paymentPlan.mode = "amount"
    ops.paymentPlan.milestones = [
      createMilestone({
        label: "DP",
        sortOrder: 1,
        mode: "amount",
        amount: "",
      }),
    ]
    expect(validateMilestonesForLock(ops.paymentPlan).ok).toBe(false)
  })
})

describe("canLockPaymentPlan", () => {
  it("locks when all signers signed, stamp ok, milestones valid", () => {
    expect(canLockPaymentPlan(opsReadyToLock()).ok).toBe(true)
  })

  it("fails when a signer has not signed", () => {
    const ops = opsReadyToLock()
    ops.signatures[1]!.signedAt = null
    expect(canLockPaymentPlan(ops).ok).toBe(false)
  })

  it("requires stamp attached when stamp.required", () => {
    const ops = opsReadyToLock()
    ops.stamp = { required: true, status: "pending", attachedAt: null }
    expect(canLockPaymentPlan(ops).ok).toBe(false)
    ops.stamp = {
      required: true,
      status: "attached",
      attachedAt: "2026-08-01T00:00:00.000Z",
    }
    expect(canLockPaymentPlan(ops).ok).toBe(true)
  })

  it("fails when already locked", () => {
    const ops = opsReadyToLock()
    ops.paymentPlan.lockedAt = "2026-08-03T00:00:00.000Z"
    expect(canLockPaymentPlan(ops).ok).toBe(false)
  })
})

describe("assertPlanEditable", () => {
  it("throws when locked", () => {
    const ops = opsReadyToLock()
    ops.paymentPlan.lockedAt = "2026-08-03T00:00:00.000Z"
    expect(() => assertPlanEditable(ops.paymentPlan)).toThrow(/locked/i)
  })

  it("allows when unlocked", () => {
    expect(() => assertPlanEditable(opsReadyToLock().paymentPlan)).not.toThrow()
  })
})
