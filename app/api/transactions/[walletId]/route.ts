import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import https from "https"
import dns from "dns"
import { getApiUpstreamBase } from "@/lib/server/apiUpstreamBase"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const agent = new https.Agent({
  keepAlive: true,
  family: 4,
  lookup: (hostname: string, _opts: unknown, cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) =>
    dns.lookup(hostname, { family: 4 }, cb),
})

const http = axios.create({
  timeout: 55000,
  httpsAgent: agent,
  validateStatus: () => true,
  responseType: "arraybuffer",
})

function forwardHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {}
  const auth = req.headers.get("authorization")
  if (auth) out.Authorization = auth
  const ct = req.headers.get("content-type")
  if (ct) out["Content-Type"] = ct
  for (const name of ["x-user-role", "x-user-type", "x-user-roles", "x-app-id", "x-selected-app-id", "x-dashboard-app-id"]) {
    const v = req.headers.get(name)
    if (v) out[name] = v
  }
  return out
}

async function proxyTransactions(req: NextRequest, walletId: string) {
  const base = getApiUpstreamBase()
  const url = `${base}/api/v1/transactions/${encodeURIComponent(walletId)}${req.nextUrl.search || ""}`
  const method = req.method.toUpperCase()
  const headers = forwardHeaders(req)

  try {
    const resp = await http.request<ArrayBuffer>({ url, method, headers })
    const contentType = resp.headers["content-type"] || "application/json"
    const ct = Array.isArray(contentType) ? contentType[0] : contentType
    return new NextResponse(resp.data, { status: resp.status, headers: { "Content-Type": ct } })
  } catch (err) {
    console.error("[api/transactions proxy]", url, err)
    return NextResponse.json(
      { success: false, error: "Transaction service unreachable" },
      { status: 502 },
    )
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ walletId: string }> }) {
  const { walletId } = await ctx.params
  return proxyTransactions(req, walletId)
}
