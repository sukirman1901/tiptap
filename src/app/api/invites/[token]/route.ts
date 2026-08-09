import { NextResponse } from "next/server"
import { getInviteByToken, markRedeemed } from "@/features/invites/store"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params
  const invite = getInviteByToken(token)
  if (!invite) {
    return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 })
  }
  if (invite.status === "expired") {
    return NextResponse.json({ error: "Undangan kedaluwarsa" }, { status: 410 })
  }
  markRedeemed(token)
  return NextResponse.json({
    documentId: invite.documentId,
    partyId: invite.partyId,
    snapshot: invite.snapshot,
  })
}
