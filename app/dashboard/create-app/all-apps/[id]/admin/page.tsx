// Per-app Admin page: shown in the app-specific sidebar ("Open App" area).
"use client"

import { useParams } from "next/navigation"
import AdminDashboard from "@/app/dashboard/admin/page"

export default function AppAdminPage() {
  // Keep for future app-scoped logic; current admin components are mock UI.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const params = useParams()

  return <AdminDashboard />
}

