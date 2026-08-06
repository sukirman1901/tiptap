import { describe, expect, it } from "vitest"
import {
  createField,
  formatCurrencyDisplay,
  isFieldValueEmpty,
  resolveFieldDisplay,
  slugifyToken,
  type TemplateField,
} from "./contract-draft"

describe("slugifyToken", () => {
  it("slugifies Indonesian labels", () => {
    expect(slugifyToken("Nama Pihak Pertama")).toBe("nama_pihak_pertama")
    expect(slugifyToken("  Nilai (Rp)  ")).toBe("nilai_rp")
  })
})

describe("createField", () => {
  it("creates text field with auto token", () => {
    const f = createField({ label: "Judul", type: "text" })
    expect(f.label).toBe("Judul")
    expect(f.token).toBe("judul")
    expect(f.type).toBe("text")
    expect(f.tokenManual).toBeFalsy()
    expect(f.id.length).toBeGreaterThan(8)
  })
})

describe("resolveFieldDisplay", () => {
  const field = (partial: Partial<TemplateField> & Pick<TemplateField, "id" | "token" | "type">): TemplateField => ({
    label: partial.label ?? partial.token,
    tokenManual: false,
    ...partial,
  })

  it("returns {token} when empty", () => {
    const f = field({ id: "a", token: "judul", type: "text" })
    expect(resolveFieldDisplay(f, "")).toBe("{judul}")
  })

  it("formats currency and date", () => {
    expect(
      resolveFieldDisplay(field({ id: "a", token: "nilai", type: "currency" }), "100000000")
    ).toMatch(/^Rp /)
    expect(
      resolveFieldDisplay(field({ id: "a", token: "tgl", type: "date" }), "2026-08-04")
    ).toContain("2026")
  })
})

describe("isFieldValueEmpty", () => {
  it("treats whitespace text as empty", () => {
    expect(isFieldValueEmpty("text", "  ")).toBe(true)
    expect(isFieldValueEmpty("currency", "")).toBe(true)
    expect(isFieldValueEmpty("date", "2026-08-04")).toBe(false)
  })
})

describe("formatCurrencyDisplay", () => {
  it("formats digit groups", () => {
    expect(formatCurrencyDisplay("100000000")).toBe("100.000.000")
    expect(formatCurrencyDisplay("")).toBe("")
  })
})
