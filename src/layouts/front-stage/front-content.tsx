import { PropsWithChildren } from "react"

export interface FrontContentProps extends PropsWithChildren {}

const FrontContent = ({ children }: FrontContentProps) => {
  return <main className="min-h-dvh w-full">{children}</main>
}

export default FrontContent
