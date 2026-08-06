"use client"

import { useEffect, useState } from "react"
import {
  emptyDraft,
  loadDraftFromStorage,
  saveDraftToStorage,
  type ContractDraft,
} from "../components/contract-draft"
import { ContractVariablesPanel } from "../components/contract-variables-panel"
import { FullFeaturedEditor } from "../components/full-featured-editor"

/**
 * Blank by default — no hardcoded fields. User adds variables via the panel.
 * Optional starter template (`createStarterPerjanjianDraft`) is for a future
 * “pakai template” picker, not auto-loaded.
 */
const PlaygroundPage = () => {
  const [draft, setDraft] = useState<ContractDraft | null>(null)

  useEffect(() => {
    setDraft(loadDraftFromStorage() ?? emptyDraft())
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
