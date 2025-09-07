import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import "./global.css"

export const metadata: Metadata = {
  title: "CollabSpace - Real-time Collaboration Tool",
  description: "Create, edit, and collaborate on documents with your team in real-time",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </body>
    </html>
  )
}
