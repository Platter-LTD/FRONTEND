"use client"

import * as React from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"
import { Upload, FileText } from "lucide-react"
import { ComplianceService } from "@/lib/services/complianceService"
import { toast } from "react-toastify"
import { useComplianceForm } from "@/providers/ComplianceFormProvider"
import { isPdfFile } from "@/lib/isPdfFile"
import { snapshotFile } from "@/lib/snapshotFile"
import { AddressAutocomplete } from "@/components/AddressAutocomplete"
import { toBeneficialOwnerPayload, toShareholderRow } from "@/lib/shareholders"

const formatFileSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ELEVEN_DIGITS = /^\d{11}$/

const EMPTY_FORM = { fullName: "", email: "", phoneNumber: "", bvn: "", nin: "", address: "" }

export const CreateShareholderDrawer: React.FC = () => {
  const { shareholderDrawerOpen, setShareholderDrawerOpen, addShareholder } = useComplianceForm()
  const addressInputRef = React.useRef<HTMLInputElement>(null)

  const [formData, setFormData] = React.useState(EMPTY_FORM)
  // True only once the address was picked from a Google Places suggestion.
  const [addressVerified, setAddressVerified] = React.useState(false)
  const [addressFile, setAddressFile] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleDigits = (field: "bvn" | "nin", value: string) => handleChange(field, value.replace(/\D/g, "").slice(0, 11))

  const handleAddressFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const f = input.files?.[0] ?? null
    input.value = ""
    if (!f) return setAddressFile(null)
    if (!isPdfFile(f)) {
      toast.error(`${f.name} must be a PDF file`)
      return setAddressFile(null)
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error(`${f.name} must be 5MB or smaller`)
      return setAddressFile(null)
    }
    try {
      setAddressFile(await snapshotFile(f))
    } catch {
      toast.error(`Could not read ${f.name}. Please pick the file again.`)
      setAddressFile(null)
    }
  }

  // Start clean each time the drawer opens.
  React.useEffect(() => {
    if (!shareholderDrawerOpen) {
      setFormData(EMPTY_FORM)
      setAddressVerified(false)
      setAddressFile(null)
      if (addressInputRef.current) addressInputRef.current.value = ""
    }
  }, [shareholderDrawerOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const bvn = formData.bvn.trim()
    const nin = formData.nin.trim()
    if (!formData.fullName.trim() || !formData.email.trim()) return toast.error("Please provide full name and email")
    if (!bvn && !nin) return toast.error("Enter the shareholder's BVN or NIN")
    if (bvn && !ELEVEN_DIGITS.test(bvn)) return toast.error("BVN must be 11 digits")
    if (nin && !ELEVEN_DIGITS.test(nin)) return toast.error("NIN must be 11 digits")
    if (!formData.address.trim() || !addressVerified) return toast.error("Select the shareholder's address from the suggestions")
    if (!addressFile) return toast.error("Please upload the proof of address")

    setLoading(true)
    try {
      // Upload first, then send the returned URL (per API docs).
      const upload = await ComplianceService.uploadDocument(addressFile)
      if (!upload.success || !upload.url) {
        toast.error(upload.error || "Proof of address upload failed")
        return
      }

      const newShareholder = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        bvn: bvn || undefined,
        nin: nin || undefined,
        address: formData.address.trim(),
        addressDocument: {
          fileName: addressFile.name,
          fileType: addressFile.type || "application/pdf",
          fileSize: addressFile.size,
          fileUrl: upload.url,
          uploadDate: new Date().toISOString(),
        },
        status: "pending" as const,
      }

      // PUT replaces the full list: resend existing rows (only spec fields) plus the new one.
      const existing: unknown[] = await ComplianceService.getShareholdersForCurrentMerchant().catch(() => [])
      const payload = [...existing.map(toBeneficialOwnerPayload), newShareholder]
      const res = (await ComplianceService.upsertShareholdersForCurrentMerchant(payload)) as
        | { data?: { shareholder?: unknown }; shareholder?: unknown }
        | undefined
      const saved = res?.data?.shareholder ?? res?.shareholder ?? newShareholder

      addShareholder(toShareholderRow(saved))
      setShareholderDrawerOpen(false)
      toast.success("Shareholder created successfully.")
    } catch (err: any) {
      const data = err?.response?.data
      const msg = data?.error ?? data?.message ?? err?.message ?? "Failed to create shareholder"
      console.error("Create shareholder failed", { status: err?.response?.status, data, err })
      if (err?.response?.status === 401) {
        toast.error("Unauthorized — please log in again.")
      } else if (String(msg).toLowerCase().includes("no kyc profile") || String(msg).toLowerCase().includes("no profile found")) {
        toast.error("Complete the Business Info step first, then add shareholders.")
      } else {
        toast.error(String(msg))
      }
    } finally {
      setLoading(false)
    }
  }

  const textField = (field: keyof typeof EMPTY_FORM, placeholder: string, type = "text") => (
    <div className="border rounded-lg p-5 bg-white shadow-sm">
      <input
        type={type}
        placeholder={placeholder}
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
      />
    </div>
  )

  const idField = (field: "bvn" | "nin", placeholder: string) => (
    <div className="border rounded-lg p-5 bg-white shadow-sm">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={formData[field]}
        onChange={(e) => handleDigits(field, e.target.value)}
        className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400 tabular-nums"
      />
    </div>
  )

  return (
    <DrawerPanel
      open={!!shareholderDrawerOpen}
      onOpenChange={(next) => {
        if (!next) setShareholderDrawerOpen(false)
      }}
      title="Create shareholder"
      className="sm:max-w-[52rem]"
      description="Add the shareholder's details, BVN or NIN, and proof of address."
      bodyClassName="p-0 gap-0"
    >
      <form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col min-h-0 px-6 sm:px-10 py-10 w-full max-w-full mx-auto overflow-y-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
          <div className="flex flex-col gap-6 min-w-0">
            {textField("fullName", "Full Name")}
            {textField("email", "Email", "email")}
            {textField("phoneNumber", "Phone Number", "tel")}
          </div>

          <div className="flex flex-col gap-6 min-w-0">
            {idField("bvn", "BVN (11 digits)")}
            {idField("nin", "NIN (11 digits)")}
            <p className="-mt-4 text-xs text-gray-500">Provide a BVN or NIN (at least one).</p>
          </div>

          <div className="md:col-span-2 flex flex-col gap-6 min-w-0">
            <AddressAutocomplete
              value={formData.address}
              verified={addressVerified}
              onChange={(text, verified) => {
                handleChange("address", text)
                setAddressVerified(verified)
              }}
            />

            <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm flex-wrap gap-2">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Upload className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">Proof of Address</p>
                  <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
                  {addressFile && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="truncate max-w-[160px]" title={addressFile.name}>
                          {addressFile.name}
                        </span>
                        <span className="text-gray-500 text-xs">({formatFileSize(addressFile.size)})</span>
                      </span>
                      <button type="button" onClick={() => setAddressFile(null)} className="text-xs text-red-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <label
                className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors shrink-0 cursor-pointer"
                style={{ backgroundColor: "#9A813F", color: "#fff" }}
              >
                <input
                  ref={addressInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,application/pdf"
                  onChange={handleAddressFileSelect}
                />
                {addressFile ? "Change file" : "Upload"}
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full text-white py-3 rounded-md font-medium hover:opacity-90 transition-colors disabled:opacity-50 shrink-0"
          style={{ backgroundColor: "#9A813F" }}
        >
          {loading ? "Saving..." : "Save Shareholder"}
        </button>
      </form>
    </DrawerPanel>
  )
}

export default CreateShareholderDrawer
