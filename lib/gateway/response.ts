/** Build a JSON `Response` so ported route logic keeps the exact contract its callers expect. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/** Read a JSON body without throwing on empty/invalid payloads. */
export async function readJson<T = Record<string, any>>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T
}

/** `{ error }` / `{ message }` from an upstream error body, or the fallback. */
export function upstreamError(body: Record<string, any>, fallback: string): string {
  return body?.message || body?.error || fallback
}
