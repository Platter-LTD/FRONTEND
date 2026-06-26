"use client"

import { useParams } from "next/navigation"
import { WorkflowTable } from "@/components/workflow/WorkflowTable"

export default function MortgageWorkflowPage() {
  const params = useParams()
  const appId = String(params.id || "")

  return (
    <WorkflowTable
      title="Mortgage Workflow"
      appId={appId}
      productType="MORTGAGE"
      requestColumnLabel="Mortgage Request"
      tabs={[
        { id: "requested", label: "Mortgage Request" },
        { id: "under_review", label: "Under Review" },
        { id: "approved", label: "Approved" },
        { id: "declined", label: "Declined" },
        { id: "blacklisted", label: "Blacklisted" },
      ]}
    />
  )
}
