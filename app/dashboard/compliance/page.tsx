"use client"

import Tabs from "@/components/Tabs"
import { useEffect, useMemo, useState } from "react"
import { ComplianceFormProvider } from "@/providers/ComplianceFormProvider"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchKycStatusThunk } from "@/store/complianceSlice"

import BusinessInfoTab from "@/components/forms/BusinessInfoTab"
import BusinessDocumentWrapper from "@/components/forms/BusinessDocumentWrapper"
import ShareholderInfo from "@/components/forms/ShareholderInfo"

interface TabCompletion {
    "business-info": boolean
    "business-document": boolean
    "shareholder-info": boolean
    // "compliance-chat": boolean
}

export default function ComplianceDashboard() {
    const dispatch = useAppDispatch()
    /** Same KYC status as the sidebar (`fetchKycStatusThunk` → approved unlocks merchant nav). */
    const kycApproved = useAppSelector((s) => s.compliance.isApproved)

    const [activeTab, setActiveTab] = useState("business-info")
    const [completion, setCompletion] = useState<TabCompletion>({
        "business-info": false,
        "business-document": false,
        "shareholder-info": false,
    })

    useEffect(() => {
        void dispatch(fetchKycStatusThunk())
    }, [dispatch])

    const markComplete = (tabId: keyof TabCompletion) => {
        setCompletion((prev) => ({ ...prev, [tabId]: true }))
    }

    const handleBusinessInfoContinue = () => {
        markComplete("business-info")
        setActiveTab("business-document")
    }

    const handleBusinessDocumentContinue = () => {
        markComplete("business-document")
        setActiveTab("shareholder-info")
    }

    const tabs = useMemo(
        () => [
            {
                id: "business-info",
                label: "Business Info",
                locked: false,
                completed: kycApproved || completion["business-info"],
            },
            {
                id: "business-document",
                label: "Business Document",
                locked: !kycApproved && !completion["business-info"],
                completed: kycApproved || completion["business-document"],
            },
            {
                id: "shareholder-info",
                label: "Shareholder's Info",
                locked: !kycApproved && !completion["business-document"],
                completed: kycApproved || completion["shareholder-info"],
            },
        ],
        [kycApproved, completion],
    )

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

    return (
        <ComplianceFormProvider>
            <div className="flex flex-col h-full">
                <div className="px-8 py-4">
                    <Tabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        activeTabClassName="border-[#9A813F] text-[#9A813F]"
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">{renderTabContent()}</div>
            </div>
        </ComplianceFormProvider>
    )
}
