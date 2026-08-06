export type DocumentStatus =
  | "draf"
  | "dalam_review"
  | "review_disetujui"
  | "menunggu_ttd_pihak"
  | "selesai"

const ALLOWED: Record<DocumentStatus, readonly DocumentStatus[]> = {
  draf: ["dalam_review"],
  dalam_review: ["dalam_review", "review_disetujui"],
  review_disetujui: ["menunggu_ttd_pihak"],
  menunggu_ttd_pihak: ["selesai"],
  selesai: [],
}

export function canTransition(
  from: DocumentStatus,
  to: DocumentStatus
): boolean {
  return ALLOWED[from].includes(to)
}

export function statusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    draf: "Draf",
    dalam_review: "Dalam review",
    review_disetujui: "Review disetujui",
    menunggu_ttd_pihak: "Menunggu TTD pihak",
    selesai: "Selesai",
  }
  return labels[status]
}

/** Items that should surface under “Perlu tindakan” for a given local role. */
export function needsAction(
  status: DocumentStatus,
  role: "initiator" | "party"
): boolean {
  if (role === "initiator") {
    return (
      status === "draf" ||
      status === "dalam_review" ||
      status === "review_disetujui"
    )
  }
  return status === "dalam_review" || status === "menunggu_ttd_pihak"
}
