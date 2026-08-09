export async function sendInviteEmail(input: {
  to: string
  documentTitle: string
  inviteUrl: string
}): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    console.info("[invite] RESEND_API_KEY missing; link:", input.inviteUrl)
    return { sent: false }
  }
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(key)
    const from =
      process.env.INVITE_FROM_EMAIL?.trim() || "Agreed <onboarding@resend.dev>"
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: `Undangan review: ${input.documentTitle}`,
      text: `Anda diundang mereview perjanjian "${input.documentTitle}".\n\nBuka tautan ini:\n${input.inviteUrl}\n`,
    })
    if (error) return { sent: false, error: error.message }
    return { sent: true }
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : "Gagal mengirim email",
    }
  }
}
