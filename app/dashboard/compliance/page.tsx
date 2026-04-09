"use client"

import Tabs from "@/components/Tabs"
import { useState } from "react"
import { ComplianceFormProvider } from "@/providers/ComplianceFormProvider"

import BusinessInfoTab from "@/components/compliance-forms/BusinessInfoTab"
import BusinessDocumentWrapper from "@/components/compliance-forms/BusinessDocumentWrapper"
import ShareholderInfo from "@/components/compliance-forms/ShareholderInfo"
import { ComplianceChatTab } from "@/components/compliance/compliance-chat-tab"

interface TabCompletion {
    "business-info": boolean
    "business-document": boolean
    "shareholder-info": boolean
    // "compliance-chat": boolean
}

export default function ComplianceDashboard() {
    const [activeTab, setActiveTab] = useState("business-info")
    const [completion, setCompletion] = useState<TabCompletion>({
        "business-info": false,
        "business-document": false,
        "shareholder-info": false,
        // "compliance-chat": false,
    })

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

    const tabs = [
        {
            id: "business-info",
            label: "Business Info",
            locked: false,
            completed: completion["business-info"]
        },
        {
            id: "business-document",
            label: "Business Document",
            locked: !completion["business-info"],
            completed: completion["business-document"]
        },
        {
            id: "shareholder-info",
            label: "Shareholder's Info",
            locked: !completion["business-document"],
            completed: completion["shareholder-info"]
        },
        // {
        //     id: "compliance-chat",
        //     label: "Compliance chat",
        //     locked: false,
        //     completed: completion["compliance-chat"]
        // },
    ]

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
