"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { Eye, EyeOff, Plus } from "lucide-react"

interface Credential {
  id: string
  merchantId: string
  secretKey: string
  privateKey: string
  generatedOn: string
  expiresOn: string
}

interface CredentialsTabProps {
  onGenerateNewKeys?: () => void
  onDownload?: (credentialId: string) => void
  credentials?: Credential[]
  buttonClassName?: string
  showSecrets?: Record<string, boolean>
  secretKeyValue?: string
  privateKeyValue?: string
}

const defaultCredentials: Credential[] = [
  {
    id: "1",
    merchantId: "MERCH_0LSKBL5FS",
    secretKey: "••••••••••",
    privateKey: "••••••••••",
    generatedOn: "12/09/2025",
    expiresOn: "14/09/2025",
  },
  {
    id: "2",
    merchantId: "MERCH_0LSKBL5FS",
    secretKey: "••••••••••",
    privateKey: "••••••••••",
    generatedOn: "12/09/2025",
    expiresOn: "14/09/2025",
  },
  {
    id: "3",
    merchantId: "MERCH_0LSKBL5FS",
    secretKey: "••••••••••",
    privateKey: "••••••••••",
    generatedOn: "12/09/2025",
    expiresOn: "14/09/2025",
  },
  {
    id: "4",
    merchantId: "MERCH_0LSKBL5FS",
    secretKey: "••••••••••",
    privateKey: "••••••••••",
    generatedOn: "12/09/2025",
    expiresOn: "14/09/2025",
  },
]

export default function CredentialsTab({
  onGenerateNewKeys,
  onDownload,
  credentials = defaultCredentials,
  buttonClassName = "bg-black text-white hover:bg-gray-800",
  showSecrets,
  secretKeyValue = "sk_live_abc123def456",
  privateKeyValue = "pk_live_xyz789uvw012"
}: CredentialsTabProps) {
  const [internalShowSecrets, setInternalShowSecrets] = useState<Record<string, boolean>>({})
  const currentShowSecrets = showSecrets ?? internalShowSecrets
  const setShowSecrets = showSecrets ? undefined : setInternalShowSecrets

  const toggleSecret = (id: string) => {
    if (setShowSecrets) {
      setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }))
    }
  }

  const handleDownload = (credentialId: string) => {
    if (onDownload) {
      onDownload(credentialId)
    } else {
      // Default download behavior
      console.log("Download credential:", credentialId)
    }
  }

  const secretCell = (key: string, shown: string, masked: string) => (
    <div className="flex items-center gap-2">
      <span>{currentShowSecrets[key] ? shown : masked}</span>
      <button
        type="button"
        aria-label={currentShowSecrets[key] ? "Hide key" : "Show key"}
        onClick={() => toggleSecret(key)}
        className="text-gray-400 hover:text-gray-600"
        disabled={!setShowSecrets}
      >
        {currentShowSecrets[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )

  const columns: ColumnDef<Credential, unknown>[] = [
    { accessorKey: "merchantId", header: "Merchant ID", cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.merchantId}</span> },
    { accessorKey: "secretKey", header: "Secret Key", cell: ({ row }) => secretCell(`secret-${row.original.id}`, secretKeyValue, row.original.secretKey) },
    { accessorKey: "privateKey", header: "Private Key", cell: ({ row }) => secretCell(`private-${row.original.id}`, privateKeyValue, row.original.privateKey) },
    { accessorKey: "generatedOn", header: "Generated On" },
    { accessorKey: "expiresOn", header: "Expires on" },
    {
      id: "download",
      header: "Download",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => handleDownload(row.original.id)}>
          Download
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      tableId="api-credentials"
      title="API credentials"
      columns={columns}
      data={credentials}
      clientSearch
      action={
        <Button className={buttonClassName} onClick={onGenerateNewKeys}>
          <Plus className="mr-2 h-4 w-4" />
          Generate New Keys
        </Button>
      }
    />
  )
}
