"use client"

import { useLayoutEffect, useSyncExternalStore } from "react"
import {
  INITIAL_CONTRACT_META,
  type ContractMeta,
} from "./contract-meta"

let currentMeta: ContractMeta = INITIAL_CONTRACT_META
const listeners = new Set<() => void>()

export function setContractMetaStore(meta: ContractMeta) {
  currentMeta = meta
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return currentMeta
}

/** Live form meta for TipTap variable node views (works outside React tree). */
export function useContractMetaStore(): ContractMeta {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Keep store in sync with playground form state. */
export function ContractMetaStoreSync({ meta }: { meta: ContractMeta }) {
  useLayoutEffect(() => {
    setContractMetaStore(meta)
  }, [meta])
  return null
}
