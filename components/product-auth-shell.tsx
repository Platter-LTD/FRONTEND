"use client"

import type React from "react"
import Link from "next/link"

interface ProductAuthShellProps {
  children: React.ReactNode
  contentClassName?: string
}

export function ProductAuthShell({ children, contentClassName = "max-w-lg" }: ProductAuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fcfcfb]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(116, 97, 47, 0.06) 2px, transparent 2px), linear-gradient(to bottom, rgba(116, 97, 47, 0.06) 2px, transparent 2px)",
          // Slightly wider and taller, while keeping boxes taller than wide
          backgroundSize: "50px 70px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-white/55" />

      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 py-6">
        <Link href="/" className="text-3xl font-extrabold tracking-tight text-[#8a7435]">
          PLATA
        </Link>
      </header>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20 [&_input]:bg-white [&_input]:dark:bg-white [&_[data-slot=select-trigger]]:bg-white [&_[data-slot=select-trigger]]:dark:bg-white">
        <div className={`w-full ${contentClassName}`}>{children}</div>
      </main>
    </div>
  )
}

