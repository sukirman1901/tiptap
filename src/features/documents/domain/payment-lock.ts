// src/features/documents/domain/payment-lock.ts
import type { ContractOps, Milestone, PaymentPlan } from "./contract-ops"

export type LockResult =
  | { ok: true }
  | { ok: false; reason: string }

export function milestonesPercentSum(milestones: Milestone[]): number {
  return milestones.reduce((sum, m) => sum + (m.percent ?? 0), 0)
}

export function validateMilestonesForLock(plan: PaymentPlan): LockResult {
  const active = plan.milestones.filter((m) => m.status !== "cancelled")
  if (active.length === 0) {
    return { ok: false, reason: "At least one milestone is required" }
  }
  if (plan.mode === "percent") {
    const sum = milestonesPercentSum(active)
    if (sum !== 100) {
      return { ok: false, reason: `Percent milestones must sum to 100 (got ${sum})` }
    }
    for (const m of active) {
      if (m.percent == null || m.percent < 0) {
        return { ok: false, reason: `Invalid percent on milestone ${m.id}` }
      }
    }
    return { ok: true }
  }
  for (const m of active) {
    if (!m.amount || !/^\d+$/.test(m.amount) || m.amount === "0") {
      return { ok: false, reason: `Invalid amount on milestone ${m.id}` }
    }
  }
  return { ok: true }
}

export function canLockPaymentPlan(ops: ContractOps): LockResult {
  if (ops.paymentPlan.lockedAt) {
    return { ok: false, reason: "Payment plan is already locked" }
  }
  const signers = ops.parties.filter((p) => p.isSigner)
  if (signers.length === 0) {
    return { ok: false, reason: "At least one signer is required" }
  }
  for (const party of signers) {
    const sig = ops.signatures.find((s) => s.partyId === party.id)
    if (!sig?.signedAt) {
      return { ok: false, reason: `Signer ${party.displayName || party.id} has not signed` }
    }
  }
  if (ops.stamp.required && ops.stamp.status !== "attached") {
    return { ok: false, reason: "Materai is required but not attached" }
  }
  const milestones = validateMilestonesForLock(ops.paymentPlan)
  if (!milestones.ok) return milestones
  return { ok: true }
}

/** Call before mutating milestone set / percents / amounts / mode. */
export function assertPlanEditable(plan: PaymentPlan): void {
  if (plan.lockedAt) {
    throw new Error("Payment plan is locked")
  }
}

export function lockPaymentPlan(ops: ContractOps, now = new Date()): ContractOps {
  const check = canLockPaymentPlan(ops)
  if (!check.ok) {
    throw new Error(check.reason)
  }
  return {
    ...ops,
    paymentPlan: {
      ...ops.paymentPlan,
      lockedAt: now.toISOString(),
    },
  }
}
