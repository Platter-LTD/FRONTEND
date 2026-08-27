// Per-app Admin page: shown in the app-specific sidebar ("Open App" area).
// Staff/roles are merchant-scoped (API ignores appId); UI lives under this route for navigation.
"use client"

import AdminDashboard from "@/app/dashboard/admin/page"

export default function AppAdminPage() {
  return <AdminDashboard />
}

