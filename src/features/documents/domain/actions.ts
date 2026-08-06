import type { DocumentStatus } from "./status"

export type DocumentRole = "initiator" | "party"

export type DocumentAction =
  | "simpan"
  | "preview"
  | "bagikan_review"
  | "kirim_review"
  | "edit_body"
  | "approve_review"
  | "ttd_materai"
  | "ttd_pihak"

export function availableActions(
  status: DocumentStatus,
  role: DocumentRole
): DocumentAction[] {
  const base: DocumentAction[] = ["preview"]

  if (status === "selesai") return base

  if (role === "initiator") {
    switch (status) {
      case "draf":
        return [...base, "simpan", "edit_body", "kirim_review", "bagikan_review"]
      case "dalam_review":
        return [...base, "simpan", "edit_body", "kirim_review", "bagikan_review"]
      case "review_disetujui":
        return [...base, "ttd_materai"]
      case "menunggu_ttd_pihak":
        return base
      default:
        return base
    }
  }

  // party
  switch (status) {
    case "dalam_review":
      return [...base, "approve_review", "bagikan_review"]
    case "menunggu_ttd_pihak":
      return [...base, "ttd_pihak"]
    default:
      return base
  }
}

export function canEditBody(
  status: DocumentStatus,
  role: DocumentRole
): boolean {
  return availableActions(status, role).includes("edit_body")
}
