"use client"

import * as React from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "react-toastify"
import { rowActionsColumn } from "@/components/ui/row-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ComplianceService } from "@/lib/services/complianceService"
import { useComplianceForm, type ShareholderRow } from "@/providers/ComplianceFormProvider"

const apiError = (err: any, fallback: string) =>
  String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? fallback)

/**
 * Edit / Delete for the shareholders table. Edit opens the Create shareholder drawer prefilled
 * (saved with PUT …/beneficial-owners); Delete re-sends the list without that shareholder (PUT).
 */
export function useShareholderActions() {
  const { shareholders, setShareholders, setShareholderDrawerOpen, setEditingShareholder } = useComplianceForm()
  const [pendingDelete, setPendingDelete] = React.useState<ShareholderRow | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const openCreate = () => {
    setEditingShareholder(null)
    setShareholderDrawerOpen(true)
  }

  const openEdit = (row: ShareholderRow) => {
    if (!row.id) {
      toast.error("This shareholder can't be edited yet. Refresh the list and try again.")
      return
    }
    setEditingShareholder(row)
    setShareholderDrawerOpen(true)
  }

  const confirmDelete = async () => {
    const id = pendingDelete?.id
    if (!id) return
    setDeleting(true)
    try {
      await ComplianceService.deleteShareholder(id)
      setShareholders(shareholders.filter((s) => s.id !== id))
      setPendingDelete(null)
      toast.success("Shareholder deleted.")
    } catch (err: any) {
      toast.error(apiError(err, "Failed to delete shareholder"))
    } finally {
      setDeleting(false)
    }
  }

  const actionsColumn = rowActionsColumn<ShareholderRow>([
    { label: "Edit", icon: Pencil, onClick: openEdit },
    {
      label: "Delete",
      icon: Trash2,
      destructive: true,
      separatorBefore: true,
      disabled: (row) => !row.id,
      onClick: (row) => setPendingDelete(row),
    },
  ])

  const deleteDialog = (
    <AlertDialog
      open={!!pendingDelete}
      onOpenChange={(open) => {
        if (!open && !deleting) setPendingDelete(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete shareholder?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingDelete?.name || "This shareholder"} will be removed from your business. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(e) => {
              // Keep the dialog open until the request finishes.
              e.preventDefault()
              void confirmDelete()
            }}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { openCreate, actionsColumn, deleteDialog }
}
