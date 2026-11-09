"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"

export function ProductTab() {
  const [showProducts, setShowProducts] = useState(false)

  const products = [
    {
      id: "1",
      name: "Product Name",
      productId: "MEHL0LSKBL5FS",
      dateCreated: "12/09/2025",
      metaRef: "X20445-78P",
      status: "Successful",
    },
    {
      id: "2",
      name: "Product Name",
      productId: "MEHL0LSKBL5FS",
      dateCreated: "12/09/2025",
      metaRef: "X20445-78P",
      status: "Failed",
    },
    {
      id: "3",
      name: "Product Name",
      productId: "MEHL0LSKBL5FS",
      dateCreated: "12/09/2025",
      metaRef: "X20445-78P",
      status: "Successful",
    },
    {
      id: "4",
      name: "Product Name",
      productId: "MEHL0LSKBL5FS",
      dateCreated: "12/09/2025",
      metaRef: "X20445-78P",
      status: "Pending",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Successful":
        return "bg-green-100 text-green-800"
      case "Failed":
        return "bg-red-100 text-red-800"
      case "Pending":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  type Product = (typeof products)[number]
  const columns: ColumnDef<Product, unknown>[] = [
    { accessorKey: "name", header: "Product Name", cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span> },
    { accessorKey: "productId", header: "Product ID" },
    { accessorKey: "dateCreated", header: "Date Created" },
    { accessorKey: "metaRef", header: "Meta_Ref" },
    { accessorKey: "status", header: "Product Status", cell: ({ row }) => <Badge className={getStatusColor(row.original.status)}>{row.original.status}</Badge> },
    {
      id: "download",
      header: "Download",
      cell: () => (
        <Button variant="outline" size="sm">
          Download
        </Button>
      ),
    },
  ]

  const createButton = (
    <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setShowProducts(true)}>
      <Plus className="mr-2 h-4 w-4" />
      Create Product
    </Button>
  )

  return (
    <DataTable
      tableId="developer-products"
      title="Products"
      columns={columns}
      data={showProducts ? products : []}
      clientSearch
      download
      action={createButton}
      empty={
        <div className="px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black">
            <Plus className="h-8 w-8 text-white" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Products Created</h3>
          <p className="mb-6 text-gray-500">Create your first product to get started with the API.</p>
          {createButton}
        </div>
      }
    />
  )
}
