"use client"

import { useLayoutEffect, useSyncExternalStore } from "react"
import type { TemplateField } from "./contract-draft"

export type DraftStoreSnapshot = {
  fields: TemplateField[]
  values: Record<string, string>
}

let current: DraftStoreSnapshot = { fields: [], values: {} }
const listeners = new Set<() => void>()

export function setContractDraftStore(snapshot: DraftStoreSnapshot) {
  current = snapshot
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return current
}

export function useContractDraftStore(): DraftStoreSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function ContractDraftStoreSync({
  fields,
  values,
}: {
  fields: TemplateField[]
  values: Record<string, string>
}) {
  useLayoutEffect(() => {
    setContractDraftStore({ fields, values })
  }, [fields, values])
  return null
}

/** Lookup helpers for suggestion plugins (non-React). */
export function getDraftStoreSnapshot(): DraftStoreSnapshot {
  return current
}

export function findFieldByToken(token: string): TemplateField | undefined {
  return current.fields.find((f) => f.token === token)
}

export function findFieldById(id: string): TemplateField | undefined {
  return current.fields.find((f) => f.id === id)
}
