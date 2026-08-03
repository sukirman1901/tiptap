"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  formatAmountDisplay,
  parseAmountDigits,
  type ContractMeta,
} from "./contract-meta"
import type { ChangeEvent, ReactNode } from "react"

const fieldInputClass =
  "h-11 shadow-none border-border/70 bg-background md:h-9 focus-visible:ring-1"

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-muted-foreground text-[13px] font-normal"
      >
        {label}
      </Label>
      {children}
    </div>
  )
}

export interface ContractMetaFormProps {
  meta: ContractMeta
  onChange: (next: ContractMeta) => void
  className?: string
  /** Hide the outer aside chrome (e.g. inside a Sheet). */
  bare?: boolean
}

export function ContractMetaForm({
  meta,
  onChange,
  className,
  bare = false,
}: ContractMetaFormProps) {
  const set =
    (key: keyof ContractMeta) => (e: ChangeEvent<HTMLInputElement>) =>
      onChange({ ...meta, [key]: e.target.value })

  const setAmount = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...meta, amount: parseAmountDigits(e.target.value) })
  }

  const body = (
    <div className={cn("flex flex-col gap-5", !bare && "px-4 py-5 sm:px-5")}>
      <div className="space-y-1">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
          Informasi Dokumen
        </h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Isi form ini mengisi variabel di draf (
          <span className="font-mono">@nilai</span>,{" "}
          <span className="font-mono">{"{pihak1}"}</span>, dst.). Ketik{" "}
          <span className="font-mono">@</span> di canvas untuk menyisipkan.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Field id="contract-title" label="Judul kontrak">
          <Input
            id="contract-title"
            value={meta.title}
            onChange={set("title")}
            className={fieldInputClass}
          />
        </Field>

        <Field id="party1" label="Pihak 1">
          <Input
            id="party1"
            value={meta.party1}
            onChange={set("party1")}
            className={fieldInputClass}
          />
        </Field>

        <Field id="party2" label="Pihak 2">
          <Input
            id="party2"
            value={meta.party2}
            onChange={set("party2")}
            className={fieldInputClass}
          />
        </Field>

        <Field id="contract-date" label="Tanggal">
          <Input
            id="contract-date"
            type="date"
            value={meta.date}
            onChange={set("date")}
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
        </Field>

        <Field id="contract-amount" label="Nilai (Rp)">
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              Rp
            </span>
            <Input
              id="contract-amount"
              inputMode="numeric"
              autoComplete="off"
              value={formatAmountDisplay(meta.amount)}
              onChange={setAmount}
              placeholder="0"
              className={cn(fieldInputClass, "pl-9 tabular-nums")}
            />
          </div>
        </Field>
      </div>
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
