"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

const COOKIE = "agreed_invite_token"

export default function InviteRedeemPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/invites/${token}`)
      const data = await res.json()
      if (cancelled) return
      if (!res.ok) {
        setError(data.error || "Undangan tidak valid")
        return
      }
      document.cookie = `${COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${14 * 86400}; samesite=lax`
      sessionStorage.setItem(
        `agreed:snapshot:${data.documentId}`,
        JSON.stringify(data.snapshot)
      )
      router.replace(`/dokumen/${data.documentId}?review=1&invite=1`)
    })()
    return () => {
      cancelled = true
    }
  }, [token, router])

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Undangan tidak dapat dibuka</h1>
        <p className="text-muted-foreground mt-2 text-sm">{error}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Minta pengirim mengundang ulang.
        </p>
        <Link href="/dokumen" className="mt-6 inline-block text-sm underline">
          Ke beranda
        </Link>
      </div>
    )
  }

  return (
    <div className="text-muted-foreground mx-auto max-w-md px-4 py-16 text-center text-sm">
      Membuka undangan…
    </div>
  )
}
