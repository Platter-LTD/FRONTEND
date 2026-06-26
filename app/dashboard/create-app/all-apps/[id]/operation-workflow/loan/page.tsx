"use client"

import { useParams } from "next/navigation"
import { WorkflowTable } from "@/components/workflow/WorkflowTable"

export default function LoanWorkflowPage() {
  const params = useParams()
  const appId = String(params.id || "")

  return (
    <WorkflowTable
      title="Loan Workflow"
      appId={appId}
      productType="LOAN"
      requestColumnLabel="Loan Request"
      tabs={[
        { id: "requested", label: "Loan Request" },
        { id: "under_review", label: "Under Review" },
        { id: "approved", label: "Approved" },
        { id: "declined", label: "Declined" },
        { id: "blacklisted", label: "Blacklisted" },
      ]}
    />
  )
}
