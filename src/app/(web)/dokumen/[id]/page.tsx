"use client"

import { useParams } from "next/navigation"

import PlaygroundPage from "@/features/playground/ui"

export default function DokumenWorkspacePage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""

  return <PlaygroundPage documentId={id} />
}
