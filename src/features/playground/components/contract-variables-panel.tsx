"use client"

import { useState, type ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  createField,
  formatCurrencyDisplay,
  getEmptyFields,
  isFieldValueEmpty,
  parseAmountDigits,
  withUpdatedLabel,
  withUpdatedToken,
  type ContractDraft,
  type FieldType,
  type TemplateField,
} from "./contract-draft"

const fieldInputClass =
  "h-11 shadow-none border-border/70 bg-background md:h-9 focus-visible:ring-1"

const fieldTextareaClass =
  "min-h-[4.5rem] w-full rounded-md border border-border/70 bg-background px-3 py-2 text-base shadow-none transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

const fieldInputEmptyClass =
  "border-amber-600/45 bg-amber-50/40 focus-visible:ring-amber-600/30 dark:bg-amber-950/20"

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Teks" },
  { value: "textarea", label: "Teks panjang" },
  { value: "date", label: "Tanggal" },
  { value: "currency", label: "Mata uang" },
]

export interface ContractVariablesPanelProps {
  draft: ContractDraft
  onChange: (next: ContractDraft) => void
  className?: string
  /** Hide the outer aside chrome (e.g. inside a Sheet). */
  bare?: boolean
}

export function ContractVariablesPanel({
  draft,
  onChange,
  className,
  bare = false,
}: ContractVariablesPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const emptyFields = getEmptyFields(draft)
  const emptyCount = emptyFields.length

  function updateField(
    id: string,
    updater: (field: TemplateField) => TemplateField
  ) {
    onChange({
      ...draft,
      fields: draft.fields.map((f) => (f.id === id ? updater(f) : f)),
    })
  }

  function setValue(id: string, value: string) {
    onChange({
      ...draft,
      values: { ...draft.values, [id]: value },
    })
  }

  function handleRemove(field: TemplateField) {
    const inDoc = draft.contentHtml.includes(`data-key="${field.id}"`)
    if (inDoc) {
      const ok = window.confirm(
        `Properti “${field.label}” masih dipakai di dokumen. Hapus dari skema? Placeholder di dokumen akan tetap ada sebagai yatim.`
      )
      if (!ok) return
    }
    const restValues = { ...draft.values }
    delete restValues[field.id]
    onChange({
      ...draft,
      fields: draft.fields.filter((f) => f.id !== field.id),
      values: restValues,
    })
    if (editingId === field.id) setEditingId(null)
  }

  function handleAdd() {
    const field = createField({ label: "Properti baru", type: "text" })
    onChange({
      ...draft,
      fields: [...draft.fields, field],
      values: { ...draft.values, [field.id]: "" },
    })
    setEditingId(field.id)
  }

  function toggleSchema(id: string) {
    setEditingId((prev) => (prev === id ? null : id))
  }

  const body = (
    <div className="flex flex-col gap-5 px-4 py-5 sm:px-5">
      <div className="space-y-1.5">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
          Properti
        </h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Isi nilai di sini. Ketik <span className="font-mono">@</span> di dokumen
          untuk menyisipkan. Klik label untuk ubah nama/tipe.
        </p>
        {draft.fields.length > 0 &&
          (emptyCount > 0 ? (
            <p
              className="rounded-md border border-amber-600/25 bg-amber-50/60 px-2.5 py-1.5 text-[12px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
              role="status"
            >
              {emptyCount} properti belum diisi — di draf masih tampil sebagai{" "}
              <span className="font-mono">{"{token}"}</span>.
            </p>
          ) : (
            <p
              className="text-muted-foreground rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5 text-[12px]"
              role="status"
            >
              Semua properti terisi.
            </p>
          ))}
      </div>

      {draft.fields.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Belum ada properti. Tambah skema lalu sisipkan dengan{" "}
            <span className="font-mono">@</span> di canvas.
          </p>
          <AddVariableButton onClick={handleAdd} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {draft.fields.map((field) => {
            const value = draft.values[field.id] ?? ""
            const empty = isFieldValueEmpty(field.type, value)
            const isEditing = editingId === field.id
            const inputId = `var-${field.id}`

            return (
              <div key={field.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSchema(field.id)}
                    className={cn(
                      "text-[13px] font-normal text-left transition-colors",
                      empty
                        ? "text-amber-800 dark:text-amber-200"
                        : "text-muted-foreground",
                      isEditing && "text-foreground",
                      "hover:text-foreground"
                    )}
                    aria-expanded={isEditing}
                    aria-controls={`schema-${field.id}`}
                  >
                    {field.label || "Tanpa label"}
                  </button>
                  {empty && (
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      Belum diisi
                    </span>
                  )}
                </div>

                <ValueControl
                  id={inputId}
                  field={field}
                  value={value}
                  empty={empty}
                  onChange={(next) => setValue(field.id, next)}
                />

                <p className="text-muted-foreground font-mono text-[11px] leading-snug">
                  {`{${field.token}}`}
                </p>

                {isEditing && (
                  <div
                    id={`schema-${field.id}`}
                    className="mt-1 grid grid-cols-[1fr_auto] gap-2 border-t border-border/60 pt-2"
                  >
                    <div className="space-y-1">
                      <Label
                        htmlFor={`label-${field.id}`}
                        className="text-muted-foreground text-[11px] font-normal"
                      >
                        Label
                      </Label>
                      <Input
                        id={`label-${field.id}`}
                        value={field.label}
                        onChange={(e) =>
                          updateField(field.id, (f) =>
                            withUpdatedLabel(f, e.target.value)
                          )
                        }
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor={`type-${field.id}`}
                        className="text-muted-foreground text-[11px] font-normal"
                      >
                        Tipe
                      </Label>
                      <Select
                        value={field.type}
                        onValueChange={(next) =>
                          updateField(field.id, (f) => ({
                            ...f,
                            type: next as FieldType,
                          }))
                        }
                      >
                        <SelectTrigger
                          id={`type-${field.id}`}
                          className={cn(fieldInputClass, "w-[7.5rem]")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label
                        htmlFor={`token-${field.id}`}
                        className="text-muted-foreground text-[11px] font-normal"
                      >
                        Token
                      </Label>
                      <Input
                        id={`token-${field.id}`}
                        value={field.token}
                        onChange={(e) =>
                          updateField(field.id, (f) =>
                            withUpdatedToken(f, e.target.value)
                          )
                        }
                        className={cn(fieldInputClass, "font-mono")}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemove(field)}
                        className="text-muted-foreground hover:text-destructive text-xs transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <AddVariableButton onClick={handleAdd} />
        </div>
      )}
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

function AddVariableButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:text-foreground w-full rounded-md border border-dashed border-border/70",
        "px-3 py-2.5 text-xs transition-colors hover:border-border"
      )}
    >
      + Tambah properti
    </button>
  )
}

function ValueControl({
  id,
  field,
  value,
  empty,
  onChange,
}: {
  id: string
  field: TemplateField
  value: string
  empty: boolean
  onChange: (next: string) => void
}) {
  const emptyClass = empty ? fieldInputEmptyClass : undefined

  if (field.type === "textarea") {
    return (
      <textarea
        id={id}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          onChange(e.target.value)
        }
        aria-invalid={empty}
        className={cn(fieldTextareaClass, emptyClass)}
      />
    )
  }

  if (field.type === "date") {
    return (
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={empty}
        className={cn(
          fieldInputClass,
          "relative w-full pr-9",
          "[&::-webkit-calendar-picker-indicator]:absolute",
          "[&::-webkit-calendar-picker-indicator]:top-1/2",
          "[&::-webkit-calendar-picker-indicator]:right-2.5",
          "[&::-webkit-calendar-picker-indicator]:h-4",
          "[&::-webkit-calendar-picker-indicator]:w-4",
          "[&::-webkit-calendar-picker-indicator]:-translate-y-1/2",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          emptyClass
        )}
      />
    )
  }

  if (field.type === "currency") {
    return (
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          Rp
        </span>
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={formatCurrencyDisplay(value)}
          onChange={(e) => onChange(parseAmountDigits(e.target.value))}
          placeholder="0"
          aria-invalid={empty}
          className={cn(fieldInputClass, "pl-9 tabular-nums", emptyClass)}
        />
      </div>
    )
  }

  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={empty}
      className={cn(fieldInputClass, emptyClass)}
    />
  )
}
