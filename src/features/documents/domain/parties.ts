import {
  createParty,
  emptyContractOps,
  type ContractOps,
  type Party,
  type Signature,
} from "./contract-ops"

export type PartyPatch = Partial<
  Pick<Party, "displayName" | "email" | "isSigner" | "isReviewer" | "kind">
>

export function isValidEmail(email: string): boolean {
  const t = email.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export function syncSignaturesWithParties(ops: ContractOps): ContractOps {
  const signers = ops.parties.filter((p) => p.isSigner)
  const signatures: Signature[] = signers.map((party, index) => {
    const existing = ops.signatures.find((s) => s.partyId === party.id)
    return {
      id: existing?.id ?? crypto.randomUUID(),
      partyId: party.id,
      signOrder: party.signOrder || index + 1,
      signedAt: existing?.signedAt ?? null,
      method: existing?.method ?? "demo",
    }
  })
  return { ...ops, signatures }
}

export function seededContractOps(): ContractOps {
  const base = emptyContractOps()
  const p1 = createParty({
    displayName: "",
    kind: "initiator",
    sortOrder: 1,
    signOrder: 1,
    isSigner: true,
    isReviewer: true,
  })
  const p2 = createParty({
    displayName: "",
    kind: "counterparty",
    sortOrder: 2,
    signOrder: 2,
    isSigner: true,
    isReviewer: true,
  })
  return syncSignaturesWithParties({ ...base, parties: [p1, p2] })
}

export function addCounterparty(ops: ContractOps): ContractOps {
  const nextOrder =
    ops.parties.reduce((m, p) => Math.max(m, p.sortOrder), 0) + 1
  const party = createParty({
    displayName: "",
    kind: "counterparty",
    sortOrder: nextOrder,
    signOrder: nextOrder,
    isSigner: true,
    isReviewer: true,
  })
  return syncSignaturesWithParties({
    ...ops,
    parties: [...ops.parties, party],
  })
}

export function removeParty(
  ops: ContractOps,
  partyId: string
): { ok: true; ops: ContractOps } | { ok: false; reason: string } {
  if (ops.parties.length <= 2) {
    return { ok: false, reason: "Minimal dua pihak" }
  }
  const parties = ops.parties.filter((p) => p.id !== partyId)
  if (parties.length === ops.parties.length) {
    return { ok: false, reason: "Pihak tidak ditemukan" }
  }
  return {
    ok: true,
    ops: syncSignaturesWithParties({ ...ops, parties }),
  }
}

export function updateParty(
  ops: ContractOps,
  partyId: string,
  patch: PartyPatch
): ContractOps {
  const parties = ops.parties.map((p) => {
    if (p.id !== partyId) return p
    return {
      ...p,
      ...patch,
      displayName:
        patch.displayName !== undefined
          ? patch.displayName.trim()
          : p.displayName,
      email: patch.email !== undefined ? patch.email.trim() : p.email,
    }
  })
  return syncSignaturesWithParties({ ...ops, parties })
}
