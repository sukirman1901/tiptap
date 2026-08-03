"use client"

import { Button } from "@/components/ui/button"
import { Github, Loader2 } from "lucide-react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"

const SwitchThemeButton = dynamic(
  () =>
    import("@/components/widgets/theme").then((mod) => mod.SwitchThemeButton),
  {
    ssr: false,
    loading: () => (
      <Button variant="ghost" size="icon">
        <Loader2 className="size-4 animate-spin" />
      </Button>
    ),
  }
)

export interface FrontHeaderProps {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FrontHeader = (props: FrontHeaderProps) => {
  return (
    <header className="bg-background sticky top-0 z-50 w-full">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/logo.svg"
            alt="Editor"
            width={24}
            height={24}
            className="size-6 dark:invert"
            priority
          />
          <span className="hidden sm:inline-block">Editor</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="https://github.com/sukirman1901/tiptap"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <Github className="size-4" />
              <span className="hidden sm:inline-block">GitHub</span>
            </Link>
          </Button>

          <SwitchThemeButton />
        </div>
      </div>
    </header>
  )
}

export default FrontHeader
