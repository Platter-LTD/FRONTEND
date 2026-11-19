"use client"

import { ComplianceHeader, ComplianceLayout, ComplianceStepper, type ComplianceStep } from "@/components/compliance/compliance-ui"
import { useEffect, useMemo, useRef, useState } from "react"
import { ComplianceFormProvider, useComplianceForm } from "@/providers/ComplianceFormProvider"

import BusinessInfoTab from "@/components/forms/BusinessInfoTab"
import BusinessDocumentWrapper from "@/components/forms/BusinessDocumentWrapper"
import ShareholderInfo from "@/components/forms/ShareholderInfo"
import { useBusinessDocuments, useKycStatus } from "@/hooks/queries/compliance"
import { REQUIRED_TILE_IDS } from "@/lib/businessDocuments"

const STEP_DESCRIPTIONS: Record<string, string> = {
    "business-info": "Company profile & survey",
    "business-document": "Upload company documents",
    "shareholder-info": "Owners, BVN/NIN & address",
}

interface TabCompletion {
    "business-info": boolean
    "business-document": boolean
    "shareholder-info": boolean
    // "compliance-chat": boolean
}

const STEP_STORAGE_KEY = "spring_compliance_active_step_v1"
const STEP_IDS = ["business-info", "business-document", "shareholder-info"] as const

function readStoredStep(): string | null {
    try {
        const v = sessionStorage.getItem(STEP_STORAGE_KEY)
        return v && (STEP_IDS as readonly string[]).includes(v) ? v : null
    } catch {
        return null
    }
}

export default function ComplianceDashboard() {
    return (
        <ComplianceFormProvider>
            <ComplianceDashboardInner />
        </ComplianceFormProvider>
    )
}

function ComplianceDashboardInner() {
    /** Same cached KYC status as the sidebar (approved unlocks merchant nav). */
    const kycApproved = useKycStatus().isApproved
    // Documents already saved on the server count as a completed step (survives reloads).
    const docsQuery = useBusinessDocuments()
    const savedDocs = docsQuery.data?.byTile
    const documentsOnFile = !!savedDocs && REQUIRED_TILE_IDS.every((id) => !!savedDocs[id])

    // Server-side progress (prefilled by the form provider) so a refresh doesn't restart at step 1.
    const { merchantBusinessSurvey: survey, shareholders, compliancePrefill } = useComplianceForm()
    const infoOnFile = !!survey.businessName?.trim() && !!survey.businessType?.trim()
    const shareholdersOnFile = shareholders.length > 0

    const [activeTab, setActiveTab] = useState("business-info")
    const [completion, setCompletion] = useState<TabCompletion>({
        "business-info": false,
        "business-document": false,
        "shareholder-info": false,
    })

    const markComplete = (tabId: keyof TabCompletion) => {
        setCompletion((prev) => ({ ...prev, [tabId]: true }))
    }

    const handleBusinessInfoContinue = () => {
        markComplete("business-info")
        changeTab("business-document")
    }

    const handleBusinessDocumentContinue = () => {
        markComplete("business-document")
        changeTab("shareholder-info")
    }

    const tabs = useMemo(
        () => [
            {
                id: "business-info",
                label: "Business Info",
                locked: false,
                completed: kycApproved || infoOnFile || completion["business-info"],
            },
            {
                id: "business-document",
                label: "Business Document",
                locked: !kycApproved && !infoOnFile && !documentsOnFile && !completion["business-info"],
                completed: kycApproved || documentsOnFile || completion["business-document"],
            },
            {
                id: "shareholder-info",
                label: "Shareholder's Info",
                locked: !kycApproved && !documentsOnFile && !completion["business-document"],
                completed: kycApproved || shareholdersOnFile || completion["shareholder-info"],
            },
        ],
        [kycApproved, infoOnFile, documentsOnFile, shareholdersOnFile, completion],
    )

    // Restore the last step after a refresh; otherwise jump to the first step that isn't done on the server.
    const initialised = useRef(false)
    useEffect(() => {
        if (initialised.current) return
        const stored = readStoredStep()
        if (stored) {
            initialised.current = true
            setActiveTab(stored)
            return
        }
        if (compliancePrefill == null || !docsQuery.isFetched) return
        initialised.current = true
        if (!infoOnFile) setActiveTab("business-info")
        else if (!documentsOnFile) setActiveTab("business-document")
        else setActiveTab("shareholder-info")
    }, [compliancePrefill, docsQuery.isFetched, infoOnFile, documentsOnFile])

    const changeTab = (id: string) => {
        initialised.current = true
        setActiveTab(id)
        try {
            sessionStorage.setItem(STEP_STORAGE_KEY, id)
        } catch {
            /* ignore */
        }
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case "business-info":
                return <BusinessInfoTab onContinue={handleBusinessInfoContinue} />
            case "business-document":
                return <BusinessDocumentWrapper onContinue={handleBusinessDocumentContinue} />
            case "shareholder-info":
                return <ShareholderInfo />
            // case "compliance-chat":
            //     return <ComplianceChatTab />
            default:
                return <BusinessInfoTab onContinue={handleBusinessInfoContinue} />
        }
    }

    const steps: ComplianceStep[] = tabs.map((t) => ({ ...t, description: STEP_DESCRIPTIONS[t.id] ?? "" }))
    const completedCount = tabs.filter((t) => t.completed).length

    return (
        <ComplianceLayout>
          <ComplianceHeader approved={kycApproved} completedCount={completedCount} totalCount={tabs.length} />
          <ComplianceStepper steps={steps} activeId={activeTab} onChange={changeTab} />
          <div>{renderTabContent()}</div>
        </ComplianceLayout>
    )
}
