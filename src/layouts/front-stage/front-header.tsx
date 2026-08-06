"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Loader2, Menu } from "lucide-react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

const SwitchThemeButton = dynamic(
  () =>
    import("@/components/widgets/theme").then((mod) => mod.SwitchThemeButton),
  {
    ssr: false,
    loading: () => (
      <Button variant="ghost" size="icon" aria-label="Tema">
        <Loader2 className="size-4 animate-spin" />
      </Button>
    ),
  }
)

const links = [
  { href: "/dokumen", label: "Dokumen" },
  { href: "/template", label: "Template" },
] as const

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="Menu navigasi"
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64">
        <SheetHeader>
          <SheetTitle>Navigasi</SheetTitle>
        </SheetHeader>
        <nav className="mt-4 flex flex-col gap-1" aria-label="Utama">
          {links.map((l) => (
            <SheetClose asChild key={l.href}>
              <Link
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  pathname.startsWith(l.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export interface FrontHeaderProps {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FrontHeader = (props: FrontHeaderProps) => {
  const pathname = usePathname()
  /** Radix Sheet IDs differ SSR vs client — mount after hydrate. */
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="bg-background sticky top-0 z-50 w-full border-b border-border/40">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/dokumen" className="flex items-center gap-2 font-semibold">
            <Image
              src="/logo.svg"
              alt="Agreed"
              width={24}
              height={24}
              className="size-6 dark:invert"
              priority
            />
            <span className="text-sm tracking-tight sm:text-base">
              Agreed
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 sm:flex" aria-label="Utama">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  pathname.startsWith(l.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {mounted ? (
            <MobileNav pathname={pathname} />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Menu navigasi"
              type="button"
              disabled
            >
              <Menu className="size-4" />
            </Button>
          )}

          <SwitchThemeButton />
        </div>
      </div>
    </header>
  )
}

export default FrontHeader
