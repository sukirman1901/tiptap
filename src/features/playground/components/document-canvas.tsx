"use client"

import { cn } from "@/lib/utils"
import { useRef, type PropsWithChildren } from "react"
import {
  A4_CSS_VARS,
  A4_PAGE,
  useA4Pagination,
} from "./use-a4-page-count"

export interface DocumentCanvasProps extends PropsWithChildren {
  className?: string
}

const paperShadow =
  "shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.35)]"

/**
 * Soft gray stage + stacked A4 sheets (md+) with continuous editor overlay.
 * Mobile: single readable column (no multi-sheet chrome).
 */
export function DocumentCanvas({ children, className }: DocumentCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { pageCount, currentPage } = useA4Pagination(
    contentRef,
    sentinelRef,
    stageRef
  )

  const stackMinHeight = `calc(${pageCount} * ${A4_PAGE.height} + ${Math.max(0, pageCount - 1)} * ${A4_PAGE.gapPx}px)`

  return (
    <div
      ref={stageRef}
      className={cn(
        "bg-muted/50 relative flex min-h-0 min-w-0 flex-1 justify-center overflow-auto",
        "p-4 sm:p-6 md:p-8",
        className
      )}
      style={A4_CSS_VARS}
    >
      <div
        ref={sentinelRef}
        aria-hidden
        className="pointer-events-none absolute h-[242mm] w-px opacity-0"
        data-a4-content-sentinel
      />

      <div
        className={cn(
          "relative w-full max-w-[210mm] md:w-[210mm] md:max-w-none md:shrink-0",
          "bg-background text-foreground md:bg-transparent",
          paperShadow,
          "md:shadow-none"
        )}
        data-a4-stack
        style={{ minHeight: stackMinHeight }}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 hidden flex-col md:flex",
            A4_PAGE.gapClass
          )}
          aria-hidden
        >
          {Array.from({ length: pageCount }, (_, i) => (
            <div
              key={i}
              className={cn(
                "bg-background box-border h-[297mm] w-[210mm]",
                paperShadow
              )}
              data-paper="a4"
              data-page={i + 1}
            />
          ))}
        </div>

        <div
          ref={contentRef}
          data-a4-content
          className={cn(
            "relative z-[1] box-border w-full",
            "px-4 py-6 sm:px-6 sm:py-8",
            "md:px-[var(--a4-margin-l)] md:pt-[var(--a4-margin-t)] md:pr-[var(--a4-margin-r)] md:pb-[var(--a4-margin-b)]",
            "md:min-h-[var(--a4-page-h)]"
          )}
        >
          {children}
        </div>
      </div>

      <div
        className={cn(
          "bg-background/95 text-muted-foreground pointer-events-none absolute right-3 bottom-3 z-10",
          "rounded-md border border-border/60 px-2.5 py-1 text-[11px] font-medium tabular-nums shadow-sm backdrop-blur-sm",
          "sm:right-5 sm:bottom-5"
        )}
        aria-live="polite"
      >
        Halaman {currentPage} / {pageCount}
      </div>
    </div>
  )
}
