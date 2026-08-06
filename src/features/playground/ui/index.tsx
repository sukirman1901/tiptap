"use client"

import { useEffect, useState } from "react"
import {
  loadDraftFromStorage,
  saveDraftToStorage,
  type ContractDraft,
} from "../components/contract-draft"
import { ContractVariablesPanel } from "../components/contract-variables-panel"
import { createStarterPerjanjianDraft } from "../components/starter-perjanjian-ks"
import { FullFeaturedEditor } from "../components/full-featured-editor"

/**
 * Playground default: hydrate from LocalStorage, else Perjanjian KS starter.
 * Later “dokumen baru” can use emptyDraft() + template picker instead.
 */
const PlaygroundPage = () => {
  const [draft, setDraft] = useState<ContractDraft | null>(null)

  useEffect(() => {
    setDraft(loadDraftFromStorage() ?? createStarterPerjanjianDraft())
  }, [])

  useEffect(() => {
    if (!draft) return
    saveDraftToStorage(draft)
  }, [draft])

  if (!draft) return null

  return (
    <FullFeaturedEditor
      draft={draft}
      onDraftChange={setDraft}
      sidebar={
        <ContractVariablesPanel draft={draft} onChange={setDraft} />
      }
    />
  )
}

export default PlaygroundPage
