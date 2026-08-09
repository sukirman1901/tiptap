import { afterEach, describe, expect, it, vi } from "vitest"
import { sendInviteEmail } from "./email"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("sendInviteEmail", () => {
  it("logs and skips when no API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    const result = await sendInviteEmail({
      to: "a@b.co",
      documentTitle: "Uji",
      inviteUrl: "http://localhost:3001/invite/abc",
    })
    expect(result.sent).toBe(false)
    expect(log).toHaveBeenCalled()
  })
})
