import { describe, expect, it } from "vitest"
import {
  canTransition,
  type DocumentStatus,
} from "./status"

describe("canTransition", () => {
  it("allows draf → dalam_review", () => {
    expect(canTransition("draf", "dalam_review")).toBe(true)
  })

  it("allows dalam_review → dalam_review (kirim ulang)", () => {
    expect(canTransition("dalam_review", "dalam_review")).toBe(true)
  })

  it("allows dalam_review → review_disetujui", () => {
    expect(canTransition("dalam_review", "review_disetujui")).toBe(true)
  })

  it("allows review_disetujui → menunggu_ttd_pihak", () => {
    expect(canTransition("review_disetujui", "menunggu_ttd_pihak")).toBe(true)
  })

  it("allows menunggu_ttd_pihak → selesai", () => {
    expect(canTransition("menunggu_ttd_pihak", "selesai")).toBe(true)
  })

  it("rejects draf → selesai", () => {
    expect(canTransition("draf", "selesai")).toBe(false)
  })

  it("rejects selesai → draf", () => {
    expect(canTransition("selesai", "draf")).toBe(false)
  })
})
