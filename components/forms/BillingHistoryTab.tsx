'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { TransactionHistoryDrawer } from '@/components/TransactionHistoryDrawer';

interface BillingRecord {
  date: string;
  amount: string;
  status: 'Successful' | 'Failed' | 'Pending';
  method: string;
  transactionId: string;
  downloadable: boolean;
}

const mockData: BillingRecord[] = [
  {
    date: '12/09/2025',
    amount: '₦10,000',
    status: 'Successful',
    method: 'Visa 5134',
    transactionId: '3456788944',
    downloadable: true,
  },
  {
    date: '12/09/2025',
    amount: '₦10,000',
    status: 'Failed',
    method: 'Bank transfer',
    transactionId: '3456788945',
    downloadable: false,
  },
  {
    date: '12/09/2025',
    amount: '₦10,000',
    status: 'Successful',
    method: 'Bank transfer',
    transactionId: '3456788946',
    downloadable: false,
  },
  {
    date: '12/09/2025',
    amount: '₦10,000',
    status: 'Pending',
    method: 'Mastercard 5031',
    transactionId: '3456788947',
    downloadable: true,
  },
   {
    date: '12/09/2025',
    amount: '₦200,000',
    status: 'Failed',
    method: 'Mastercard 5031',
    transactionId: '3456788947',
    downloadable: false,
  },
   {
    date: '12/09/2025',
    amount: '₦600,000',
    status: 'Successful',
    method: 'Verve card 5531',
    transactionId: '3456787998',
    downloadable: true,
  },
];

const columns: ColumnDef<BillingRecord, unknown>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'amount', header: 'Amount' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        className={cn(
          row.original.status === 'Successful' && 'bg-green-100 text-green-700',
          row.original.status === 'Failed' && 'bg-red-100 text-red-700',
          row.original.status === 'Pending' && 'bg-yellow-100 text-yellow-700'
        )}
      >
        {row.original.status}
      </Badge>
    ),
  },
  { accessorKey: 'method', header: 'Payment Method' },
  { accessorKey: 'transactionId', header: 'Transaction ID' },
  {
    id: 'paymentLink',
    header: 'Payment Link',
    accessorFn: (r) => (r.downloadable ? 'Download' : 'Unavailable'),
    cell: ({ row }) => (
      <Button size="sm" variant="outline" disabled={!row.original.downloadable} onClick={(e) => e.stopPropagation()}>
        {row.original.downloadable ? 'Download' : 'Unavailable'}
      </Button>
    ),
  },
];

export function BillingHistoryTab() {
  const [open, setOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);

  function handleRowClick(record: BillingRecord) {
    setSelectedRecord(record);
    setOpen(true);
  }

  return (
    <div className="space-y-8">
      <DataTable
        tableId="billing-history"
        title="Billing history"
        columns={columns}
        data={mockData}
        clientSearch
        download
        onRowClick={handleRowClick}
      />

      {/* Transaction Drawer */}
      {selectedRecord && (
        <TransactionHistoryDrawer
          open={open}
          onOpenChange={setOpen}
          record={selectedRecord}
          onDownload={() => {}}
          onShare={() => {}}
        />
      )}
    </div>
  );
}
