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
import { shareholderId, toBeneficialOwnerPayload } from "@/lib/shareholders"

const formatFileSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ELEVEN_DIGITS = /^\d{11}$/

const EMPTY_FORM = { fullName: "", email: "", phoneNumber: "", bvn: "", nin: "", address: "" }

type ShareholderType = "individual" | "entity"
type Raw = Record<string, unknown>

const isObj = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v)
const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")
/** A saved document (addressDocument / statusReport) if it has a file URL or name. */
const savedDoc = (v: unknown): Raw | null => (isObj(v) && (text(v.fileUrl) || text(v.fileName)) ? v : null)

export const CreateShareholderDrawer: React.FC = () => {
  const { shareholderDrawerOpen, setShareholderDrawerOpen, editingShareholder, setEditingShareholder, reloadShareholders } =
    useComplianceForm()
  // Edit mode: the shareholder as the API returned it (null when creating).
  const editing = editingShareholder?.raw ?? null
  const editingId = editingShareholder?.id || (editing ? shareholderId(editing) : "")
  const isEdit = !!editing
  const addressInputRef = React.useRef<HTMLInputElement>(null)
  const statusReportInputRef = React.useRef<HTMLInputElement>(null)

  const [formData, setFormData] = React.useState(EMPTY_FORM)
  // True only once the address was picked from a Google Places suggestion.
  const [addressVerified, setAddressVerified] = React.useState(false)
  const [addressFile, setAddressFile] = React.useState<File | null>(null)
  // Individual: BVN/NIN. Entity (company): no BVN/NIN, a status report instead.
  const [shareholderType, setShareholderType] = React.useState<ShareholderType>("individual")
  const [statusReportFile, setStatusReportFile] = React.useState<File | null>(null)
  // Files already on the server for the shareholder being edited (kept unless replaced).
  const [savedAddressDoc, setSavedAddressDoc] = React.useState<Raw | null>(null)
  const [savedStatusReport, setSavedStatusReport] = React.useState<Raw | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleDigits = (field: "bvn" | "nin", value: string) => handleChange(field, value.replace(/\D/g, "").slice(0, 11))

  const pickPdf = (setFile: (f: File | null) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const f = input.files?.[0] ?? null
    input.value = ""
    if (!f) return setFile(null)
    if (!isPdfFile(f)) {
      toast.error(`${f.name} must be a PDF file`)
      return setFile(null)
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error(`${f.name} must be 5MB or smaller`)
      return setFile(null)
    }
    try {
      setFile(await snapshotFile(f))
    } catch {
      toast.error(`Could not read ${f.name}. Please pick the file again.`)
      setFile(null)
    }
  }
  const handleAddressFileSelect = pickPdf(setAddressFile)
  const handleStatusReportSelect = pickPdf(setStatusReportFile)

  const changeShareholderType = (next: ShareholderType) => {
    setShareholderType(next)
    // Each type only sends its own fields: clear the other type's inputs.
    if (next === "entity") setFormData((prev) => ({ ...prev, bvn: "", nin: "" }))
    else setStatusReportFile(null)
  }

  const closeDrawer = () => {
    setShareholderDrawerOpen(false)
    setEditingShareholder(null)
  }

  // Start clean each time the drawer closes; prefill from the shareholder when it opens in edit mode.
  React.useEffect(() => {
    if (addressInputRef.current) addressInputRef.current.value = ""
    if (statusReportInputRef.current) statusReportInputRef.current.value = ""
    setAddressFile(null)
    setStatusReportFile(null)
    if (!shareholderDrawerOpen || !editing) {
      setFormData(EMPTY_FORM)
      setAddressVerified(false)
      setShareholderType("individual")
      setSavedAddressDoc(null)
      setSavedStatusReport(null)
      return
    }
    const type: ShareholderType = String(editing.shareholderType).toLowerCase() === "entity" ? "entity" : "individual"
    // Only prefill BVN/NIN when the API returns the full number (masked values stay on file).
    const digits = (v: unknown) => (ELEVEN_DIGITS.test(text(v)) ? text(v) : "")
    const address = text(editing.address)
    setShareholderType(type)
    setFormData({
      fullName: text(editing.fullName) || text(editing.name),
      email: text(editing.email),
      phoneNumber: editingShareholder?.phone || text(editing.phoneNumber),
      bvn: type === "individual" ? digits(editing.bvn) : "",
      nin: type === "individual" ? digits(editing.nin) : "",
      address,
    })
    // The saved address was already verified when the shareholder was created.
    setAddressVerified(!!address)
    setSavedAddressDoc(savedDoc(editing.addressDocument))
    setSavedStatusReport(savedDoc(editing.statusReport))
  }, [shareholderDrawerOpen, editing, editingShareholder?.phone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const bvn = formData.bvn.trim()
    const nin = formData.nin.trim()
    if (!formData.fullName.trim() || !formData.email.trim()) return toast.error("Please provide full name and email")
    const isEntity = shareholderType === "entity"
    // Editing: a blank BVN/NIN keeps the one on file.
    const keptBvn = isEdit && !bvn && String(editing?.shareholderType ?? "individual") !== "entity" ? text(editing?.bvn) : ""
    const keptNin = isEdit && !nin && String(editing?.shareholderType ?? "individual") !== "entity" ? text(editing?.nin) : ""
    const keptStatusReport = isEntity && !statusReportFile ? savedStatusReport : null
    const keptAddressDoc = !addressFile ? savedAddressDoc : null
    if (!isEntity) {
      if (!bvn && !nin && !keptBvn && !keptNin) return toast.error("Enter the shareholder's BVN or NIN")
      if (bvn && !ELEVEN_DIGITS.test(bvn)) return toast.error("BVN must be 11 digits")
      if (nin && !ELEVEN_DIGITS.test(nin)) return toast.error("NIN must be 11 digits")
    } else if (!statusReportFile && !keptStatusReport) {
      return toast.error("Please upload the entity's status report")
    }
    if (!formData.address.trim() || !addressVerified) return toast.error("Select the shareholder's address from the suggestions")
    if (!addressFile && !keptAddressDoc) return toast.error("Please upload the proof of address")

    setLoading(true)
    try {
      // Upload new files first, then send the returned URLs (per API docs). Unchanged files are resent as-is.
      let addressDocument: Record<string, unknown> | null = keptAddressDoc
      if (addressFile) {
        const upload = await ComplianceService.uploadDocument(addressFile)
        if (!upload.success || !upload.url) {
          toast.error(upload.error || "Proof of address upload failed")
          return
        }
        addressDocument = {
          fileName: addressFile.name,
          fileType: addressFile.type || "application/pdf",
          fileSize: addressFile.size,
          fileUrl: upload.url,
          uploadDate: new Date().toISOString(),
        }
      }
      let statusReport: Record<string, unknown> | undefined = keptStatusReport ?? undefined
      if (isEntity && statusReportFile) {
        const reportUpload = await ComplianceService.uploadDocument(statusReportFile)
        if (!reportUpload.success || !reportUpload.url) {
          toast.error(reportUpload.error || "Status report upload failed")
          return
        }
        statusReport = {
          fileName: statusReportFile.name,
          fileType: statusReportFile.type || "application/pdf",
          fileSize: statusReportFile.size,
          fileUrl: reportUpload.url,
          uploadDate: new Date().toISOString(),
        }
      }

      const shareholder = {
        ...(isEdit && editingId ? { _id: editingId } : {}),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        shareholderType,
        // Individual: BVN and/or NIN. Entity: status report instead (no BVN/NIN).
        ...(isEntity
          ? { statusReport }
          : { bvn: bvn || keptBvn || undefined, nin: nin || keptNin || undefined }),
        address: formData.address.trim(),
        addressDocument: addressDocument ?? undefined,
        status: isEdit ? (text(editing?.status) || "pending") : "pending",
      }

      // PUT replaces the full list: resend existing rows (only spec fields) with this one added or replaced.
      const existing: unknown[] = await ComplianceService.getShareholdersForCurrentMerchant().catch(() => [])
      const rows = existing.map(toBeneficialOwnerPayload)
      const index = isEdit && editingId ? rows.findIndex((r) => shareholderId(r) === editingId) : -1
      if (isEdit && index < 0) {
        toast.error("This shareholder no longer exists. Refresh the list and try again.")
        return
      }
      const payload = index >= 0 ? rows.map((r, i) => (i === index ? toBeneficialOwnerPayload(shareholder) : r)) : [...rows, shareholder]
      await ComplianceService.upsertShareholdersForCurrentMerchant(payload)

      await reloadShareholders().catch(() => undefined)
      closeDrawer()
      toast.success(isEdit ? "Shareholder updated successfully." : "Shareholder created successfully.")
    } catch (err: any) {
      const data = err?.response?.data
      const msg = data?.error ?? data?.message ?? err?.message ?? (isEdit ? "Failed to update shareholder" : "Failed to create shareholder")
      console.error(isEdit ? "Update shareholder failed" : "Create shareholder failed", { status: err?.response?.status, data, err })
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

  const fileTile = (opts: {
    label: string
    file: File | null
    /** File already on the server (edit mode), shown until a new one is picked. */
    saved?: Raw | null
    inputRef: React.RefObject<HTMLInputElement>
    onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
    onRemove: () => void
  }) => (
    <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm flex-wrap gap-2">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <Upload className="w-5 h-5 text-gray-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700">{opts.label}</p>
          <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
          {opts.file && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="truncate max-w-[160px]" title={opts.file.name}>
                  {opts.file.name}
                </span>
                <span className="text-gray-500 text-xs">({formatFileSize(opts.file.size)})</span>
              </span>
              <button type="button" onClick={opts.onRemove} className="text-xs text-red-600 hover:underline">
                Remove
              </button>
            </div>
          )}
          {!opts.file && opts.saved && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="truncate max-w-[160px]" title={text(opts.saved.fileName) || "Saved file"}>
                  {text(opts.saved.fileName) || "Saved file"}
                </span>
              </span>
              {text(opts.saved.fileUrl) && (
                <a href={text(opts.saved.fileUrl)} target="_blank" rel="noreferrer" className="text-xs text-[#9A813F] hover:underline">
                  View
                </a>
              )}
              <span className="text-xs text-gray-500">On file</span>
            </div>
          )}
        </div>
      </div>
      <label
        className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors shrink-0 cursor-pointer"
        style={{ backgroundColor: "#9A813F", color: "#fff" }}
      >
        <input ref={opts.inputRef} type="file" className="hidden" accept=".pdf,application/pdf" onChange={opts.onSelect} />
        {opts.file || opts.saved ? "Change file" : "Upload"}
      </label>
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
        if (!next) closeDrawer()
      }}
      title={isEdit ? "Edit shareholder" : "Create shareholder"}
      className="sm:max-w-[52rem]"
      description="Add the shareholder's details: BVN or NIN for an individual, or a status report for an entity."
      bodyClassName="p-0 gap-0"
    >
      <form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col min-h-0 px-6 sm:px-10 py-10 w-full max-w-full mx-auto overflow-y-auto"
      >
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-gray-700">Is this shareholder an individual or an entity?</p>
          <div role="radiogroup" aria-label="Shareholder type" className="inline-flex rounded-lg border bg-gray-50 p-1">
            {(["individual", "entity"] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={shareholderType === type}
                onClick={() => changeShareholderType(type)}
                className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                  shareholderType === type ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
                style={shareholderType === type ? { color: "#9A813F" } : undefined}
              >
                {type === "individual" ? "Individual" : "Entity"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
          <div className="flex flex-col gap-6 min-w-0">
            {textField("fullName", shareholderType === "entity" ? "Entity Name" : "Full Name")}
            {textField("email", "Email", "email")}
            {textField("phoneNumber", "Phone Number", "tel")}
          </div>

          <div className="flex flex-col gap-6 min-w-0">
            {shareholderType === "individual" ? (
              <>
                {idField("bvn", isEdit && text(editing?.bvn) && !formData.bvn ? "BVN on file (leave blank to keep)" : "BVN (11 digits)")}
                {idField("nin", isEdit && text(editing?.nin) && !formData.nin ? "NIN on file (leave blank to keep)" : "NIN (11 digits)")}
                <p className="-mt-4 text-xs text-gray-500">Provide a BVN or NIN (at least one).</p>
              </>
            ) : (
              fileTile({
                label: "Status Report",
                file: statusReportFile,
                saved: savedStatusReport,
                inputRef: statusReportInputRef,
                onSelect: handleStatusReportSelect,
                onRemove: () => setStatusReportFile(null),
              })
            )}
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

            {fileTile({
              label: "Proof of Address",
              file: addressFile,
              saved: savedAddressDoc,
              inputRef: addressInputRef,
              onSelect: handleAddressFileSelect,
              onRemove: () => setAddressFile(null),
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full text-white py-3 rounded-md font-medium hover:opacity-90 transition-colors disabled:opacity-50 shrink-0"
          style={{ backgroundColor: "#9A813F" }}
        >
          {loading ? "Saving..." : isEdit ? "Update Shareholder" : "Save Shareholder"}
        </button>
      </form>
    </DrawerPanel>
  )
}

export default CreateShareholderDrawer
