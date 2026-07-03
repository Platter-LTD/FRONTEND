import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Full viewport shell (sidebar + header + content) — e.g. merchant layout while KYC status loads. */
export function FullPageAppSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-screen w-full bg-gray-50", className)}>
      <div className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-4 md:block">
        <Skeleton className="mb-8 h-8 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-end border-b border-gray-200 bg-white px-8">
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Short block while `/dashboard` redirects (fits existing `h-64` layout). */
export function DashboardRedirectSkeleton() {
  return (
    <div className="flex h-64 items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-4">
        <Skeleton className="mx-auto h-4 w-2/3" />
        <Skeleton className="mx-auto h-4 w-1/2" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    </div>
  )
}

/** Stacked cards — pending applications queue. */
export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-4 w-40 max-w-full" />
            </div>
            <div className="hidden shrink-0 space-y-2 sm:block">
              <Skeleton className="ml-auto h-4 w-24" />
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Customer rows — avatar + lines. */
export function CustomerListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-8 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Auth shell / Suspense fallback — form-shaped placeholders. */
export function AuthFormSkeleton() {
  return (
    <div className="w-full space-y-4 py-6">
      <Skeleton className="mx-auto h-7 w-48" />
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  )
}

function SkeletonSection({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/** Mortgage workflow drawer — applicant profile + workflow thread placeholders. */
export function MortgageWorkflowDetailSkeleton() {
  return (
    <div className="space-y-5 px-6 py-5">
      <SkeletonSection>
        <div className="mb-4 flex items-start gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full max-w-[180px]" />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-14 w-full rounded-lg sm:col-span-2" />
        </div>
      </SkeletonSection>

      <SkeletonSection>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full max-w-[160px]" />
            </div>
          ))}
        </div>
      </SkeletonSection>

      <SkeletonSection>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </SkeletonSection>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-4 px-4 py-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2 rounded-xl border border-gray-100 p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full max-w-sm" />
                {i === 0 ? <Skeleton className="h-8 w-28 rounded-md" /> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
