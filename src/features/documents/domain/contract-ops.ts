export type PartyKind = "initiator" | "counterparty"

export type Party = {
  id: string
  displayName: string
  email: string
  kind: PartyKind
  isSigner: boolean
  isReviewer: boolean
  /** 1-based display order among parties (Pihak Pertama = 1) */
  sortOrder: number
  /** Order among signers only; ignored if !isSigner */
  signOrder: number
  userId: string | null
}

export type MilestoneStatus = "planned" | "invoiced" | "paid" | "cancelled"

export type Milestone = {
  id: string
  sortOrder: number
  label: string
  /** Used when plan.mode === "percent"; else null */
  percent: number | null
  /** Digit string minor units / whole IDR digits when mode === "amount"; else null */
  amount: string | null
  dueDate: string | null
  status: MilestoneStatus
  paidAt: string | null
}

export type PaymentPlanMode = "percent" | "amount"

export type PaymentPlan = {
  id: string
  currency: string
  mode: PaymentPlanMode
  lockedAt: string | null
  milestones: Milestone[]
}

export type Tempo = {
  startDate: string | null
  endDate: string | null
  durationDays: number | null
}

export type SignatureMethod = "demo"

export type Signature = {
  id: string
  partyId: string
  signOrder: number
  signedAt: string | null
  method: SignatureMethod
}

export type StampStatus = "not_required" | "pending" | "attached"

export type Stamp = {
  required: boolean
  status: StampStatus
  attachedAt: string | null
}

export type Attachment = {
  id: string
  name: string
  url: string
  uploadedAt: string
}

export type ContractOps = {
  parties: Party[]
  paymentPlan: PaymentPlan
  tempo: Tempo
  signatures: Signature[]
  stamp: Stamp
  attachments: Attachment[]
}

export function emptyTempo(): Tempo {
  return { startDate: null, endDate: null, durationDays: null }
}

export function emptyStamp(): Stamp {
  return { required: false, status: "not_required", attachedAt: null }
}

export function emptyPaymentPlan(
  overrides?: Partial<Pick<PaymentPlan, "mode" | "currency">>
): PaymentPlan {
  return {
    id: crypto.randomUUID(),
    currency: overrides?.currency ?? "IDR",
    mode: overrides?.mode ?? "percent",
    lockedAt: null,
    milestones: [],
  }
}

export function emptyContractOps(): ContractOps {
  return {
    parties: [],
    paymentPlan: emptyPaymentPlan(),
    tempo: emptyTempo(),
    signatures: [],
    stamp: emptyStamp(),
    attachments: [],
  }
}

export function createParty(input: {
  displayName: string
  kind: PartyKind
  sortOrder: number
  email?: string
  isSigner?: boolean
  isReviewer?: boolean
  signOrder?: number
}): Party {
  return {
    id: crypto.randomUUID(),
    displayName: input.displayName.trim(),
    email: (input.email ?? "").trim(),
    kind: input.kind,
    isSigner: input.isSigner ?? true,
    isReviewer: input.isReviewer ?? true,
    sortOrder: input.sortOrder,
    signOrder: input.signOrder ?? input.sortOrder,
    userId: null,
  }
}

export function createMilestone(input: {
  label: string
  sortOrder: number
  mode: PaymentPlanMode
  percent?: number | null
  amount?: string | null
  dueDate?: string | null
}): Milestone {
  const percent =
    input.mode === "percent" ? (input.percent ?? 0) : null
  const amount =
    input.mode === "amount" ? (input.amount ?? "") : null
  return {
    id: crypto.randomUUID(),
    sortOrder: input.sortOrder,
    label: input.label.trim() || `Termin ${input.sortOrder}`,
    percent,
    amount,
    dueDate: input.dueDate ?? null,
    status: "planned",
    paidAt: null,
  }
}
