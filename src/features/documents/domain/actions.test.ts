import { describe, expect, it } from "vitest"
import { availableActions } from "./actions"

describe("availableActions", () => {
  it("initiator in draf can send review and save", () => {
    const a = availableActions("draf", "initiator")
    expect(a).toContain("kirim_review")
    expect(a).toContain("simpan")
    expect(a).not.toContain("approve_review")
  })

  it("party in dalam_review can comment and approve", () => {
    const a = availableActions("dalam_review", "party")
    expect(a).toContain("approve_review")
    expect(a).not.toContain("kirim_review")
    expect(a).not.toContain("edit_body")
  })

  it("initiator in review_disetujui can sign+stamp", () => {
    const a = availableActions("review_disetujui", "initiator")
    expect(a).toContain("ttd_materai")
  })

  it("party in menunggu_ttd_pihak can sign", () => {
    const a = availableActions("menunggu_ttd_pihak", "party")
    expect(a).toContain("ttd_pihak")
  })

  it("nobody edits body after selesai", () => {
    expect(availableActions("selesai", "initiator")).not.toContain("edit_body")
    expect(availableActions("selesai", "party")).not.toContain("edit_body")
  })
})
