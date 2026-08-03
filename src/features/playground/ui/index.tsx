"use client"

import { useState } from "react"
import { ContractMetaForm } from "../components/contract-meta-form"
import { INITIAL_CONTRACT_META } from "../components/contract-meta"
import { FullFeaturedEditor } from "../components/full-featured-editor"

const PlaygroundPage = () => {
  const [meta, setMeta] = useState(INITIAL_CONTRACT_META)

  return (
    <FullFeaturedEditor
      meta={meta}
      onMetaChange={setMeta}
      sidebar={<ContractMetaForm meta={meta} onChange={setMeta} />}
    />
  )
}

export default PlaygroundPage
