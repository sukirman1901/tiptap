"use client"

import { useEffect, useState } from "react"
import { Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addCounterparty,
  isValidEmail,
  removeParty,
  updateParty,
} from "@/features/documents/domain/parties"
import { formatTempoLabel } from "@/features/documents/domain/system-tokens"
import type { AgreedDocument } from "@/features/documents/types"
import type { Party } from "@/features/documents/domain/contract-ops"
import { cn } from "@/lib/utils"

import { ContractVariablesPanel } from "./contract-variables-panel"
import type { ContractDraft } from "./contract-draft"

const fieldInputClass =
  "h-11 shadow-none border-border/70 bg-background md:h-9 focus-visible:ring-1"

export type DocumentPropertiesPanelProps = {
  document: AgreedDocument
  onChange: (next: AgreedDocument) => void
  bare?: boolean
  className?: string
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
      {children}
    </h3>
  )
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/60 flex items-baseline justify-between gap-3 border-b py-2.5 last:border-b-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-right text-xs tabular-nums">{value}</span>
    </div>
  )
}

function PartyBadges({ party }: { party: Party }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {party.isSigner && (
        <span className="text-muted-foreground border-border/60 rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
          Signer
        </span>
      )}
      {party.isReviewer && (
        <span className="text-muted-foreground border-border/60 rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
          Reviewer
        </span>
      )}
    </div>
  )
}

export function DocumentPropertiesPanel({
  document,
  onChange,
  bare = false,
  className,
}: DocumentPropertiesPanelProps) {
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({})
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({})
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const parties = [...document.ops.parties].sort(
    (a, b) => a.sortOrder - b.sortOrder
  )
  const canRemoveParty = document.ops.parties.length > 2

  const milestoneCount = document.ops.paymentPlan.milestones.length
  const attachmentCount = document.ops.attachments.length
  const tempoLabel = formatTempoLabel(document.ops.tempo)

  useEffect(() => {
    if (!copiedId) return
    const t = window.setTimeout(() => setCopiedId(null), 2000)
    return () => window.clearTimeout(t)
  }, [copiedId])

  function patchDocument(
    patch: Partial<
      Pick<AgreedDocument, "number" | "subject" | "contractDate" | "draft" | "ops">
    >
  ) {
    onChange({ ...document, ...patch })
  }

  function handlePartyFieldChange(
    partyId: string,
    field: "displayName" | "email",
    value: string
  ) {
    const nextOps = updateParty(document.ops, partyId, { [field]: value })
    patchDocument({ ops: nextOps })

    if (field === "email") {
      setEmailErrors((prev) => {
        const next = { ...prev }
        delete next[partyId]
        return next
      })
    }
  }

  function handleAddParty() {
    patchDocument({ ops: addCounterparty(document.ops) })
  }

  function handleRemoveParty(partyId: string) {
    const result = removeParty(document.ops, partyId)
    if (!result.ok) return
    patchDocument({ ops: result.ops })
    setInviteLinks((prev) => {
      const next = { ...prev }
      delete next[partyId]
      return next
    })
    setInviteErrors((prev) => {
      const next = { ...prev }
      delete next[partyId]
      return next
    })
  }

  function handleDraftChange(nextDraft: ContractDraft) {
    patchDocument({ draft: nextDraft })
  }

  async function handleInvite(party: Party) {
    if (party.kind === "initiator" || !isValidEmail(party.email)) return

    setInvitingId(party.id)
    setInviteErrors((prev) => {
      const next = { ...prev }
      delete next[party.id]
      return next
    })

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, partyId: party.id }),
      })
      const data = (await res.json()) as {
        inviteUrl?: string
        emailError?: string | null
        error?: string
      }

      if (!res.ok) {
        setInviteErrors((prev) => ({
          ...prev,
          [party.id]: data.error ?? "Gagal membuat undangan",
        }))
        return
      }

      if (data.inviteUrl) {
        setInviteLinks((prev) => ({ ...prev, [party.id]: data.inviteUrl! }))
      }
      if (data.emailError) {
        setEmailErrors((prev) => ({ ...prev, [party.id]: data.emailError! }))
      }
    } catch {
      setInviteErrors((prev) => ({
        ...prev,
        [party.id]: "Gagal membuat undangan",
      }))
    } finally {
      setInvitingId(null)
    }
  }

  async function handleCopyLink(partyId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(partyId)
    } catch {
      window.prompt("Salin tautan undangan:", url)
    }
  }

  const body = (
    <div className="flex flex-col gap-6 px-4 py-5 sm:px-5">
      <section className="space-y-3">
        <SectionLabel>Informasi kontrak</SectionLabel>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="doc-number"
              className="text-muted-foreground text-xs font-normal"
            >
              Nomor
            </Label>
            <Input
              id="doc-number"
              value={document.number ?? ""}
              onChange={(e) =>
                patchDocument({ number: e.target.value || null })
              }
              placeholder="AGD-2026-0001"
              className={fieldInputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="doc-contract-date"
              className="text-muted-foreground text-xs font-normal"
            >
              Tanggal
            </Label>
            <Input
              id="doc-contract-date"
              type="date"
              value={document.contractDate ?? ""}
              onChange={(e) =>
                patchDocument({ contractDate: e.target.value || null })
              }
              className={cn(
                fieldInputClass,
                "relative w-full pr-9",
                "[&::-webkit-calendar-picker-indicator]:absolute",
                "[&::-webkit-calendar-picker-indicator]:top-1/2",
                "[&::-webkit-calendar-picker-indicator]:right-2.5",
                "[&::-webkit-calendar-picker-indicator]:h-4",
                "[&::-webkit-calendar-picker-indicator]:w-4",
                "[&::-webkit-calendar-picker-indicator]:-translate-y-1/2",
                "[&::-webkit-calendar-picker-indicator]:cursor-pointer"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="doc-subject"
              className="text-muted-foreground text-xs font-normal"
            >
              Perihal
            </Label>
            <Input
              id="doc-subject"
              value={document.subject ?? ""}
              onChange={(e) =>
                patchDocument({ subject: e.target.value || null })
              }
              placeholder="Perjanjian kerja sama"
              className={fieldInputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Para pihak</SectionLabel>
        <div className="flex flex-col gap-4">
          {parties.map((party) => {
            const inviteUrl = inviteLinks[party.id]
            const canInvite =
              party.kind !== "initiator" && isValidEmail(party.email)
            const partyLabel =
              party.kind === "initiator"
                ? "Inisiator"
                : `Pihak ${party.sortOrder}`

            return (
              <div
                key={party.id}
                className="border-border/60 space-y-2.5 border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground text-xs font-medium">
                    {partyLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    <PartyBadges party={party} />
                    {canRemoveParty && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParty(party.id)}
                        className="text-muted-foreground hover:text-destructive text-[11px] transition-colors"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor={`party-name-${party.id}`}
                    className="text-muted-foreground text-xs font-normal"
                  >
                    Nama
                  </Label>
                  <Input
                    id={`party-name-${party.id}`}
                    value={party.displayName}
                    onChange={(e) =>
                      handlePartyFieldChange(
                        party.id,
                        "displayName",
                        e.target.value
                      )
                    }
                    placeholder="Nama pihak"
                    className={fieldInputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor={`party-email-${party.id}`}
                    className="text-muted-foreground text-xs font-normal"
                  >
                    Email
                  </Label>
                  <Input
                    id={`party-email-${party.id}`}
                    type="email"
                    value={party.email}
                    onChange={(e) =>
                      handlePartyFieldChange(party.id, "email", e.target.value)
                    }
                    placeholder="email@contoh.com"
                    className={fieldInputClass}
                  />
                  {party.email.trim() && !isValidEmail(party.email) && (
                    <p className="text-destructive text-[11px]">
                      Format email tidak valid
                    </p>
                  )}
                </div>

                {party.kind !== "initiator" && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-full text-xs"
                      disabled={!canInvite || invitingId === party.id}
                      onClick={() => void handleInvite(party)}
                    >
                      {invitingId === party.id ? "Mengundang…" : "Undang"}
                    </Button>
                    {!canInvite && party.email.trim() === "" && (
                      <p className="text-muted-foreground text-[11px]">
                        Isi email valid untuk mengundang
                      </p>
                    )}
                    {inviteErrors[party.id] && (
                      <p className="text-destructive text-[11px]">
                        {inviteErrors[party.id]}
                      </p>
                    )}
                    {emailErrors[party.id] && (
                      <p className="text-muted-foreground text-[11px]">
                        Email tidak terkirim: {emailErrors[party.id]}
                      </p>
                    )}
                    {inviteUrl && (
                      <div className="flex gap-1.5">
                        <Input
                          readOnly
                          value={inviteUrl}
                          aria-label="Tautan undangan"
                          className={cn(fieldInputClass, "min-w-0 flex-1 text-[11px]")}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-9 shrink-0"
                          aria-label="Salin tautan"
                          onClick={() => void handleCopyLink(party.id, inviteUrl)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    )}
                    {copiedId === party.id && (
                      <p className="text-muted-foreground text-[11px]" role="status">
                        Tautan disalin
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleAddParty}
          className={cn(
            "text-muted-foreground hover:text-foreground w-full rounded-md border border-dashed border-border/70",
            "px-3 py-2.5 text-xs transition-colors hover:border-border"
          )}
        >
          + Tambah pihak
        </button>
      </section>

      <section className="space-y-1">
        <SectionLabel>Lainnya</SectionLabel>
        <ReadOnlyRow
          label="Pembayaran"
          value={
            milestoneCount > 0 ? `${milestoneCount} termin` : "—"
          }
        />
        <ReadOnlyRow
          label="Jangka waktu"
          value={tempoLabel || "—"}
        />
        <ReadOnlyRow
          label="Dokumen terkait"
          value={
            attachmentCount > 0 ? `${attachmentCount} lampiran` : "—"
          }
        />
      </section>

      <section className="space-y-3">
        <SectionLabel>Properti kustom</SectionLabel>
        <ContractVariablesPanel
          draft={document.draft}
          onChange={handleDraftChange}
          bare
          embedded
        />
      </section>
    </div>
  )

  if (bare) {
    return <div className={className}>{body}</div>
  }

  return (
    <aside
      className={cn(
        "bg-background flex w-full shrink-0 flex-col",
        "rounded-lg border border-border/60 lg:rounded-none lg:border-0",
        "lg:w-80",
        className
      )}
    >
      <div
        className={cn(
          "overflow-auto",
          "lg:sticky lg:top-[calc(3.5rem+1rem)] lg:max-h-[calc(100dvh-3.5rem-2rem)]"
        )}
      >
        {body}
      </div>
    </aside>
  )
}
