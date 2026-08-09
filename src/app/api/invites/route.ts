import { NextResponse } from "next/server"
import { isValidEmail } from "@/features/documents/domain/parties"
import { buildDocumentSnapshot } from "@/features/invites/snapshot"
import { createInvite, markSent } from "@/features/invites/store"
import { sendInviteEmail } from "@/features/invites/email"
import type { AgreedDocument } from "@/features/documents/types"
import { migrateDocument } from "@/features/documents/storage/migrate-document"

export async function POST(req: Request) {
  const body = (await req.json()) as {
    document?: unknown
    partyId?: string
  }
  if (!body.partyId || !body.document) {
    return NextResponse.json({ error: "Payload tidak lengkap" }, { status: 400 })
  }
  const doc = migrateDocument(body.document) as AgreedDocument
  const party = doc.ops.parties.find((p) => p.id === body.partyId)
  if (!party) {
    return NextResponse.json({ error: "Pihak tidak ditemukan" }, { status: 404 })
  }
  if (!isValidEmail(party.email)) {
    return NextResponse.json({ error: "Email pihak tidak valid" }, { status: 400 })
  }
  const snapshot = buildDocumentSnapshot(doc)
  const invite = createInvite({
    documentId: doc.id,
    partyId: party.id,
    email: party.email,
    snapshot,
    ttlDays: 14,
  })
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin
  const inviteUrl = `${base}/invite/${invite.token}`
  const mail = await sendInviteEmail({
    to: party.email,
    documentTitle: doc.title,
    inviteUrl,
  })
  if (mail.sent) markSent(invite.token)
  return NextResponse.json({
    token: invite.token,
    inviteUrl,
    emailSent: mail.sent,
    emailError: mail.error ?? null,
  })
}
