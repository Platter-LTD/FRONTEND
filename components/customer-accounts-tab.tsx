"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Account, accountService } from "@/lib/services/accountService"
import {
    RefreshCw,
    DollarSign,
    Building,
    PiggyBank,
    Coins,
    CreditCard,
    Clock,
    TrendingUp,
    Eye
} from "lucide-react"
import AccountDetailDrawer from "@/components/drawers/account-detail-drawer"
import { toast } from "sonner"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { rowActionsColumn } from "@/components/ui/row-actions"

interface CustomerAccountsTabProps {
    customerId: string
}

// Fallback mock accounts data
const FALLBACK_ACCOUNTS: Account[] = [
    {
        id: "acc-001",
        userId: "cust-001",
        type: "savings",
        balance: 15000,
        currency: "NGN",
        status: "active",
        metadata: { interestRate: 5.5 },
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "acc-002",
        userId: "cust-001",
        type: "loan",
        balance: 25000,
        currency: "NGN",
        status: "active",
        metadata: { interestRate: 12.5, term: 24, monthlyPayment: 1180 },
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "acc-003",
        userId: "cust-001",
        type: "mortgage",
        balance: 350000,
        currency: "NGN",
        status: "active",
        metadata: { interestRate: 6.5, term: 25, propertyType: "Residential" },
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "acc-004",
        userId: "cust-001",
        type: "commodity",
        balance: 8500,
        currency: "NGN",
        status: "active",
        metadata: { commodityType: "Gold", quantity: 3.5, unitPrice: 2428 },
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
]

export default function CustomerAccountsTab({ customerId }: CustomerAccountsTabProps) {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [usingFallback, setUsingFallback] = useState(false)
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
    const [customerName, setCustomerName] = useState<string>("")

    // Fetch accounts for user
    const fetchAccounts = async () => {
        setIsLoading(true)
        try {
            const response = await accountService.accounts.getByUserId(customerId)

            if (response.success && response.data) {
                setAccounts(response.data)
                setUsingFallback(false)
            } else {
                console.warn("API returned error, using fallback data:", response.error)
                // Generate fallback accounts with the customerId
                const fallbackWithId = FALLBACK_ACCOUNTS.map(acc => ({
                    ...acc,
                    userId: customerId,
                }))
                setAccounts(fallbackWithId)
                setUsingFallback(true)
            }
        } catch (error) {
            console.error("Failed to fetch accounts:", error)
            const fallbackWithId = FALLBACK_ACCOUNTS.map(acc => ({
                ...acc,
                userId: customerId,
            }))
            setAccounts(fallbackWithId)
            setUsingFallback(true)
            toast.info("Using demo data - API unavailable")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (customerId) {
            fetchAccounts()
            // Fetch customer details to get name
            const fetchCustomer = async () => {
                try {
                    const response = await accountService.customers.getById(customerId)
                    if (response.success && response.data) {
                        setCustomerName(response.data.name)
                    } else {
                        // Fallback name if using mock/demo data or api fails
                        setCustomerName("Demo User")
                    }
                } catch (error) {
                    console.error("Failed to fetch customer:", error)
                    setCustomerName("Demo User")
                }
            }
            fetchCustomer()
        }
    }, [customerId])

    const handleAccountClick = (account: Account) => {
        setSelectedAccount(account)
        setIsDetailDrawerOpen(true)
    }

    const getAccountIcon = (type: string) => {
        switch (type) {
            case "savings":
                return <PiggyBank className="h-6 w-6" />
            case "loan":
                return <CreditCard className="h-6 w-6" />
            case "mortgage":
                return <Building className="h-6 w-6" />
            case "commodity":
                return <Coins className="h-6 w-6" />
            default:
                return <DollarSign className="h-6 w-6" />
        }
    }

    // All account types use the same purple color
    const getAccountColor = () => {
        return { gradient: "from-[#7C3AED] to-[#6D28D9]", light: "bg-purple-100", text: "text-[#7C3AED]" }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-700"
            case "inactive":
                return "bg-gray-100 text-gray-700"
            case "suspended":
                return "bg-red-100 text-red-700"
            case "closed":
                return "bg-gray-200 text-gray-500"
            default:
                return "bg-gray-100 text-gray-700"
        }
    }

    const formatCurrency = (amount: number, currency = "NGN") => {
        const symbol = currency === "NGN" ? "NGN " : currency === "GBP" ? "£" : "₦"
        return `${symbol}${amount.toLocaleString()}`
    }

    // Calculate totals
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
    const savingsTotal = accounts.filter(a => a.type === "savings").reduce((sum, acc) => sum + acc.balance, 0)
    const loanTotal = accounts.filter(a => a.type === "loan" || a.type === "mortgage").reduce((sum, acc) => sum + acc.balance, 0)


    const accountColumns: ColumnDef<Account, unknown>[] = [
        { id: "name", header: "Name of User", accessorFn: () => customerName || "Loading...", cell: ({ row }) => <span className="font-medium text-gray-900">{customerName || "Loading..."}</span> },
        {
            accessorKey: "balance",
            header: "Balance",
            cell: ({ row }) => <span className="font-semibold text-gray-900">{formatCurrency(row.original.balance, row.original.currency)}</span>,
        },
        { id: "userId", header: "User ID", accessorFn: () => customerId, cell: () => <span className="font-mono text-xs text-gray-500">{customerId}</span> },
        {
            id: "interest",
            header: "Interest",
            accessorFn: (a) => a.metadata?.interestRate ?? "",
            cell: ({ row }) =>
                row.original.metadata?.interestRate ? (
                    <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600">{row.original.metadata.interestRate}%</span>
                ) : (
                    <span className="text-gray-400">-</span>
                ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row: { original: account } }) => (
                <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                        account.status === "active"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : account.status === "inactive"
                              ? "border-gray-200 bg-gray-50 text-gray-700"
                              : account.status === "suspended"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-gray-200 bg-gray-100 text-gray-500"
                    }`}
                >
                    {account.status}
                </span>
            ),
        },
        {
            accessorKey: "type",
            header: "Account Type",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="rounded-md bg-gray-100 p-1.5 text-gray-600">{getAccountIcon(row.original.type)}</div>
                    <span className="font-medium text-gray-700 capitalize">{row.original.type}</span>
                </div>
            ),
        },
        { accessorKey: "currency", header: "Currency" },
        rowActionsColumn<Account>([{ label: "View account", icon: Eye, onClick: (a) => handleAccountClick(a) }]),
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Customer Accounts</h3>
                    <p className="text-sm text-gray-500">
                        {usingFallback && <span className="text-amber-600">(Demo Mode) </span>}
                        {accounts.length} account{accounts.length !== 1 ? 's' : ''} found
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAccounts}
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-gray-800 to-black text-white rounded-xl p-6 min-h-[100px]">
                    <p className="text-sm text-gray-300 mb-2">Total Value</p>
                    <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[100px]">
                    <p className="text-sm text-gray-500 mb-2">Savings & Investments</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(savingsTotal)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[100px]">
                    <p className="text-sm text-gray-500 mb-2">Outstanding Loans</p>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(loanTotal)}</p>
                </div>
            </div>

            {/* Accounts Table */}
            <DataTable
                tableId="customer-accounts"
                title="Accounts"
                columns={accountColumns}
                data={accounts}
                isLoading={isLoading}
                onRefresh={fetchAccounts}
                clientSearch
                download
                onRowClick={handleAccountClick}
                empty={
                    <div className="px-8 py-14 text-center">
                        <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                        <h3 className="mb-2 text-lg font-medium text-gray-700">No Accounts</h3>
                        <p className="text-gray-500">This customer doesn&apos;t have any accounts yet.</p>
                    </div>
                }
            />

            {/* Account Detail Drawer */}
            <AccountDetailDrawer
                isOpen={isDetailDrawerOpen}
                onClose={() => {
                    setIsDetailDrawerOpen(false)
                    setSelectedAccount(null)
                }}
                account={selectedAccount}
                customerName={customerName}
                onRefresh={fetchAccounts}
            />
        </div>
    )
}
