import { redirect } from "next/navigation"

/** App wallets overview removed — always land on Treasury wallet. */
export default async function WalletsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/create-app/all-apps/${id}/wallets/treasury`)
}
