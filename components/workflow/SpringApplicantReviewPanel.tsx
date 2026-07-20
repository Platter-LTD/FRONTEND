"use client"

import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  applicantCustomerInfoRows,
  applicantSpouseInfoRows,
  collectApplicantUploadedDocuments,
  collectGuarantors,
  collectNonDocumentRequirements,
  collectSpouseKycEntries,
  extractApplicantCustomerInfo,
  formatFileSize,
  flattenPersonalInfo,
  formatProfileCurrency,
  formatProfileDate,
  hasPlataReviewContent,
  hasSpouseDetails,
  mergeProfilePayloadWithPlataApplication,
  mortgageSelectionFromSnapshot,
  parseRequirementSubmission,
  requirementSubmissionLabel,
  springApplicantDisplayName,
  type SpringApplicantProfileResponse,
} from "@/lib/springApplicantProfile"
import { applicationCustomerInitials, resolveApplicationCustomerName } from "@/lib/applicationCustomer"
import { cn } from "@/lib/utils"

function FieldGrid({ rows }: { rows: { label: string; value: string }[] }) {
  if (!rows.length) return <p className="text-sm text-gray-500">No details available.</p>
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{row.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-gray-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
      <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function boolLabel(v: boolean | undefined): string {
  if (v === true) return "Yes"
  if (v === false) return "No"
  return "—"
}

type SpringApplicantReviewPanelProps = {
  payload: SpringApplicantProfileResponse | null
  plataApplication?: Record<string, unknown> | null
  loanWorkflowStatus?: string
  currentStepTitle?: string
}

function contentTypeLabel(contentType?: string): string {
  if (!contentType) return ""
  if (contentType === "document_template") return "Template form"
  if (contentType === "document_upload") return "Upload"
  return contentType.replaceAll("_", " ")
}

export function SpringApplicantReviewPanel({
  payload,
  plataApplication,
  loanWorkflowStatus,
  currentStepTitle,
}: SpringApplicantReviewPanelProps) {
  if (!payload && !plataApplication) return null

  const basePayload: SpringApplicantProfileResponse = payload ?? {
    application: plataApplication ?? undefined,
  }
  const mergedPayload = mergeProfilePayloadWithPlataApplication(basePayload, plataApplication)
  const plataApp =
    mergedPayload.application && typeof mergedPayload.application === "object"
      ? (mergedPayload.application as Record<string, unknown>)
      : null
  const hasPlataContent = hasPlataReviewContent(mergedPayload)
  const springProfileWarning =
    basePayload.springApplicantProfileError && !basePayload.springApplicantProfile
      ? basePayload.springApplicantProfileError
      : null

  if (basePayload.springApplicantProfileSkipped && !hasPlataContent) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-medium">Spring applicant profile not available</p>
        <p className="mt-1 text-xs text-amber-800">
          This application is not linked to a Spring storefront (no local application id), or Spring
          integration is not configured.
        </p>
        {springProfileWarning ? (
          <p className="mt-2 text-xs text-amber-700">{springProfileWarning}</p>
        ) : null}
      </div>
    )
  }

  if (springProfileWarning && !hasPlataContent) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <p className="font-medium">Could not load Spring applicant profile</p>
        <p className="mt-1 text-xs">{springProfileWarning}</p>
      </div>
    )
  }

  const profile = basePayload.springApplicantProfile
  if (!profile && !hasPlataContent) return null

  const auth = profile?.auth
  const kyc = profile?.kyc
  const app = profile?.application
  const plataSnapshot =
    plataApp?.contractSnapshot && typeof plataApp.contractSnapshot === "object"
      ? (plataApp.contractSnapshot as Record<string, unknown>)
      : undefined
  const snapshot =
    (app?.contractSnapshot as Record<string, unknown> | undefined) || plataSnapshot
  const displayName =
    springApplicantDisplayName(auth, app) ||
    resolveApplicationCustomerName({
      customerName: typeof plataApp?.customerName === "string" ? plataApp.customerName : undefined,
      userName: typeof plataApp?.userName === "string" ? plataApp.userName : undefined,
      fullName: typeof plataApp?.fullName === "string" ? plataApp.fullName : undefined,
      userId: typeof plataApp?.userId === "string" ? plataApp.userId : undefined,
      contractSnapshot: plataSnapshot,
    })
  const initials = applicationCustomerInitials(displayName)
  const mortgageSel = mortgageSelectionFromSnapshot(snapshot)
  const personalRows = flattenPersonalInfo(kyc?.personalInfo)
  const partialErrors = profile?.partialErrors ?? []

  const identityRows = [
    { label: "Email", value: auth?.email || app?.email || String(plataApp?.email || "—") },
    { label: "Phone", value: auth?.phone || String(plataApp?.phone || "—") },
    { label: "User ID", value: auth?.userId || profile?.userId || String(plataApp?.userId || "—") },
    { label: "Country", value: auth?.country || "—" },
    { label: "Account status", value: auth?.status || "—" },
    { label: "Email verified", value: boolLabel(auth?.emailVerified) },
    { label: "Phone verified", value: boolLabel(auth?.phoneVerified) },
    { label: "Last login", value: formatProfileDate(auth?.lastLoginAt) },
  ].filter((r) => r.value !== "—" || ["Email", "Phone", "User ID"].includes(r.label))

  const workflowStatusLabel =
    loanWorkflowStatus?.replaceAll("_", " ") ||
    app?.loanWorkflowStatus?.replaceAll("_", " ") ||
    "—"

  const structure =
    plataSnapshot?.structure && typeof plataSnapshot.structure === "object"
      ? (plataSnapshot.structure as Record<string, unknown>)
      : undefined
  const about =
    plataSnapshot?.about && typeof plataSnapshot.about === "object"
      ? (plataSnapshot.about as Record<string, unknown>)
      : undefined
  const properties = Array.isArray(plataSnapshot?.properties)
    ? (plataSnapshot.properties as Record<string, unknown>[])
    : []
  const approvedAmount = plataApp?.approvedLoanAmount ?? plataApp?.amount

  const applicationRows = [
    { label: "Product", value: app?.productName || String(plataApp?.productName || "—") },
    { label: "Product type", value: app?.productType || String(plataApp?.productType || "—") },
    {
      label: "Requested amount",
      value: formatProfileCurrency(
        app?.amount ??
          approvedAmount ??
          plataSnapshot?.principal ??
          plataSnapshot?.requestedAmount ??
          plataSnapshot?.amount,
        app?.currency || String(plataSnapshot?.currency || "NGN"),
      ),
    },
    ...(approvedAmount != null
      ? [
          {
            label: "Approved amount",
            value: formatProfileCurrency(approvedAmount, app?.currency || String(plataSnapshot?.currency || "NGN")),
          },
        ]
      : []),
    { label: "Application status", value: app?.status || String(plataApp?.status || "—") },
    {
      label: "Workflow status",
      value: String(plataApp?.loanWorkflowStatus || app?.loanWorkflowStatus || "—").replaceAll("_", " "),
    },
    {
      label: "Reference",
      value: String(
        plataApp?.globalProductReferenceNumber || plataApp?.reference || plataApp?.applicationReference || "—",
      ),
    },
    {
      label: "Merchant",
      value: String(plataApp?.merchantName || plataApp?.offeringMerchantId || "—"),
    },
    {
      label: "Submitted",
      value: formatProfileDate(app?.createdAt || plataApp?.submittedAt || plataApp?.createdAt),
    },
    { label: "Last updated", value: formatProfileDate(app?.updatedAt) },
    { label: "Spring local ID", value: profile?.localApplicationId || String(plataApp?.localApplicationId || "—") },
  ]

  const requirements = collectNonDocumentRequirements(mergedPayload)
  const uploadedDocuments = collectApplicantUploadedDocuments(mergedPayload)
  const guarantors = collectGuarantors(mergedPayload)
  const customerInfo = extractApplicantCustomerInfo(mergedPayload)
  const customerInfoRows = applicantCustomerInfoRows(customerInfo)
  const spouseInfoRows = applicantSpouseInfoRows(customerInfo)
  const spouseKycEntries = collectSpouseKycEntries(mergedPayload)
  const showSpouseSection = hasSpouseDetails(customerInfo) || spouseKycEntries.length > 0
  const kycDocs = Array.isArray(kyc?.documents) ? kyc.documents : []

  return (
    <div className="space-y-4">
      {springProfileWarning && hasPlataContent ? (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Spring profile could not be loaded</p>
            <p className="mt-0.5 text-amber-800">{springProfileWarning}</p>
            <p className="mt-1 text-amber-700">
              {/api key/i.test(springProfileWarning)
                ? "The Spring storefront API key needs to be renewed on the backend. Plata application details are shown below."
                : "Showing Plata application details below."}
            </p>
          </div>
        </div>
      ) : null}

      {partialErrors.length > 0 ? (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Some profile sections are incomplete</p>
            <p className="mt-0.5 text-amber-800">{partialErrors.join(", ").replaceAll("_", " ")}</p>
          </div>
        </div>
      ) : null}

      <Section title="Applicant identity">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8B7355] text-sm font-bold text-white">
            {auth?.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={auth.profilePictureUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-gray-900">{displayName}</p>
              {auth?.kycCompleted || kyc?.completed ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  KYC {kyc?.status || auth?.kycStatus || "verified"}
                </Badge>
              ) : auth?.kycStatus || kyc?.status ? (
                <Badge variant="outline" className="border-amber-300 text-amber-800">
                  KYC {kyc?.status || auth?.kycStatus}
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {profile?.fetchedAt
                ? `Profile fetched ${formatProfileDate(profile.fetchedAt)}`
                : plataApp?.submittedAt
                  ? `Submitted ${formatProfileDate(plataApp.submittedAt)}`
                  : null}
            </p>
          </div>
        </div>
        <FieldGrid rows={identityRows} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Workflow status</p>
            <Badge className="mt-1 bg-[#F5F0E8] text-[#8B7355] hover:bg-[#F5F0E8]">{workflowStatusLabel}</Badge>
          </div>
          {currentStepTitle ? (
            <div className="rounded-lg border border-[#E8DFCF] bg-[#FFFBF5] px-3 py-2.5 sm:col-span-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#8B7355]">Current step</p>
              <p className="mt-0.5 text-sm font-medium text-gray-900">{currentStepTitle}</p>
            </div>
          ) : null}
        </div>
      </Section>

      {customerInfoRows.length > 0 ? (
        <Section title="Customer information">
          <FieldGrid rows={customerInfoRows} />
        </Section>
      ) : null}

      {kyc ? (
        <Section title="KYC & personal information">
          <FieldGrid
            rows={[
              { label: "KYC status", value: kyc.status || "—" },
              { label: "KYC completed", value: boolLabel(kyc.completed) },
              { label: "Completed at", value: formatProfileDate(kyc.completedAt) },
              ...personalRows,
            ].filter((r) => r.value !== "—")}
          />
          {kycDocs.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">KYC documents</p>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {kycDocs.map((doc, i) => {
                  const url =
                    typeof (doc as Record<string, unknown>).url === "string"
                      ? String((doc as Record<string, unknown>).url)
                      : typeof (doc as Record<string, unknown>).fileUrl === "string"
                        ? String((doc as Record<string, unknown>).fileUrl)
                        : ""
                  return (
                    <li key={`${doc.type}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {doc.fileName || doc.type || "Document"}
                          </p>
                          <p className="text-xs text-gray-500">{doc.type?.replaceAll("_", " ") || "—"}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {doc.status ? (
                          <Badge variant="outline" className="text-[10px]">
                            {doc.status}
                          </Badge>
                        ) : null}
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#8B7355] hover:underline"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section title="Submitted requirements">
        {uploadedDocuments.length > 0 ? (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {uploadedDocuments.map((doc) => {
              const sizeLabel = doc.fileSize ? formatFileSize(doc.fileSize) : ""
              const typeLabel = contentTypeLabel(doc.contentType)
              return (
                <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{doc.label}</p>
                      <p className="truncate text-xs text-gray-500">{doc.fileName}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {typeLabel ? (
                          <Badge variant="outline" className="text-[10px]">
                            {typeLabel}
                          </Badge>
                        ) : null}
                        {doc.fileType ? (
                          <span className="text-[10px] text-gray-400">{doc.fileType}</span>
                        ) : null}
                        {sizeLabel ? <span className="text-[10px] text-gray-400">{sizeLabel}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {doc.status ? (
                      <Badge variant="outline" className="text-[10px]">
                        {doc.status}
                      </Badge>
                    ) : null}
                    <div className="flex items-center gap-2">
                      {doc.templateUrl ? (
                        <a
                          href={doc.templateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:underline"
                        >
                          Template <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-[#E8DFCF] bg-[#FFFBF5] px-2.5 py-1 text-xs font-medium text-[#8B7355] hover:bg-[#F5F0E8]"
                        >
                          View submission <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No file</span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-gray-500">
            No submitted requirement documents were returned for this application.
          </p>
        )}
      </Section>

      {app || plataApp ? (
        <Section title="Application submission">
          <FieldGrid rows={applicationRows} />
          {mortgageSel ? (
            <div className="mt-4 rounded-lg border border-[#E8DFCF] bg-[#FFFBF5] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B7355]">Mortgage selection</p>
              <FieldGrid
                rows={[
                  { label: "Property", value: String(mortgageSel.propertyName || "—") },
                  { label: "Quantity", value: String(mortgageSel.quantity ?? "—") },
                  {
                    label: "Unit price",
                    value: formatProfileCurrency(
                      mortgageSel.unitPrice,
                      app?.currency || String(plataSnapshot?.currency || "NGN"),
                    ),
                  },
                  {
                    label: "Total",
                    value: formatProfileCurrency(
                      mortgageSel.total,
                      app?.currency || String(plataSnapshot?.currency || "NGN"),
                    ),
                  },
                ]}
              />
            </div>
          ) : null}
          {(structure || about || plataSnapshot?.propertyValue != null) ? (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Product terms</p>
              <FieldGrid
                rows={[
                  { label: "Tenure", value: String(about?.tenure || "—") },
                  {
                    label: "Interest rate",
                    value: structure?.interestRate != null ? `${structure.interestRate}%` : "—",
                  },
                  {
                    label: "Repayment",
                    value: String(structure?.repaymentSchedule || structure?.repaymentFrequency || "—"),
                  },
                  {
                    label: "Property value",
                    value: formatProfileCurrency(
                      plataSnapshot?.propertyValue,
                      app?.currency || String(plataSnapshot?.currency || "NGN"),
                    ),
                  },
                ].filter((r) => r.value !== "—")}
              />
            </div>
          ) : null}
        </Section>
      ) : null}

      {properties.length > 0 ? (
        <Section title="Property details">
          <ul className="divide-y divide-gray-100">
            {properties.map((property, index) => (
              <li key={`property-${index}`} className="py-3 first:pt-0 last:pb-0">
                <FieldGrid
                  rows={[
                    { label: "Name", value: String(property.name || "—") },
                    { label: "Type", value: String(property.propertyType || "—") },
                    { label: "Location", value: String(property.location || "—") },
                    {
                      label: "Value",
                      value: formatProfileCurrency(
                        property.value,
                        app?.currency || String(plataSnapshot?.currency || "NGN"),
                      ),
                    },
                  ].filter((r) => r.value !== "—")}
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {requirements.length > 0 ? (
        <Section title="Other requirements">
          <ul className="divide-y divide-gray-100">
            {requirements.map((req, i) => {
              const r = req as Record<string, unknown>
              const label = requirementSubmissionLabel(r)
              const parsed = parseRequirementSubmission(r)
              return (
                <li key={`${label}-${i}`} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  {parsed.kind === "fields" ? (
                    <div className="mt-2">
                      <FieldGrid rows={parsed.fields} />
                    </div>
                  ) : parsed.kind === "file" ? (
                    <div className="mt-1">
                      <p className="text-sm text-gray-900">{parsed.fileName}</p>
                      {parsed.url ? (
                        <a
                          href={parsed.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-[#8B7355] hover:underline"
                        >
                          View file <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-0.5 break-words text-sm text-gray-900">{parsed.text}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </Section>
      ) : null}

      {showSpouseSection ? (
        <Section title="Spouse KYC">
          {spouseInfoRows.length > 0 ? (
            <div className="mb-4">
              <FieldGrid rows={spouseInfoRows} />
            </div>
          ) : null}

          {spouseKycEntries.length > 0 ? (
            <ul className="space-y-3">
              {spouseKycEntries.map((entry, i) => {
                const row = entry as Record<string, unknown>
                const name =
                  [row.firstName, row.lastName].filter((x) => typeof x === "string").join(" ").trim() ||
                  String(row.name || row.fullName || `Spouse ${i + 1}`)
                const kycUrl =
                  typeof row.verificationUrl === "string"
                    ? row.verificationUrl
                    : typeof row.kycUrl === "string"
                      ? row.kycUrl
                      : typeof row.kycLink === "string"
                        ? row.kycLink
                        : ""
                const kycStatus =
                  typeof row.kycStatus === "string"
                    ? row.kycStatus
                    : typeof row.status === "string"
                      ? row.status
                      : ""
                const meta = [row.email, row.phone, row.occupation, row.country, row.relationship, kycStatus]
                  .filter((x) => typeof x === "string" && x && x !== "Not specified")
                  .join(" · ")
                const alreadyShownInGrid =
                  spouseInfoRows.length > 0 &&
                  !kycUrl &&
                  !kycStatus &&
                  name === (customerInfo.spouseFullName || "")
                if (alreadyShownInGrid) return null
                return (
                  <li key={`spouse-${name}-${i}`} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{name || "Spouse"}</p>
                        {meta ? <p className="text-xs text-gray-500">{meta}</p> : null}
                        {kycStatus ? (
                          <Badge
                            className={cn(
                              "mt-2",
                              /approved|completed|verified/i.test(kycStatus)
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-[#F5F0E8] text-[#8B7355] hover:bg-[#F5F0E8]",
                            )}
                          >
                            KYC {kycStatus}
                          </Badge>
                        ) : null}
                        {kycUrl ? (
                          <a
                            href={kycUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-[#8B7355] hover:underline"
                          >
                            Verification link <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : customerInfo.repayingWithSpouse?.toLowerCase() === "yes" && spouseInfoRows.length === 0 ? (
            <p className="text-sm text-gray-500">
              Applicant indicated joint repayment with a spouse; spouse KYC details were not returned in this
              profile.
            </p>
          ) : null}
        </Section>
      ) : null}

      {guarantors.length > 0 ? (
        <Section title="Guarantors">
          <ul className="space-y-3">
            {guarantors.map((g, i) => {
              const row = g as Record<string, unknown>
              const name =
                [row.firstName, row.lastName].filter((x) => typeof x === "string").join(" ").trim() ||
                String(row.name || row.fullName || `Guarantor ${i + 1}`)
              const kycUrl =
                typeof row.verificationUrl === "string"
                  ? row.verificationUrl
                  : typeof row.kycUrl === "string"
                    ? row.kycUrl
                    : typeof row.kycLink === "string"
                      ? row.kycLink
                      : ""
              const meta = [row.email, row.phone, row.occupation, row.relationship]
                .filter((x) => typeof x === "string" && x && x !== "Not specified")
                .join(" · ")
              return (
                <li key={`${name}-${i}`} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500">{meta || "—"}</p>
                      {row.status ? (
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          {String(row.status)}
                        </Badge>
                      ) : null}
                      {kycUrl ? (
                        <a
                          href={kycUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-[#8B7355] hover:underline"
                        >
                          Verification link <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}
