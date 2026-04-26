/** Unwraps Product MS / API errors sometimes returned as JSON-stringified strings. */
export function formatProductApiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    let msg = error.message.trim()
    if (msg.length >= 2 && msg.startsWith('"') && msg.endsWith('"')) {
      try {
        msg = JSON.parse(msg) as string
      } catch {
        msg = msg.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, "\n")
      }
    }
    return msg
  }
  if (typeof error === "string" && error.trim()) return error.trim()
  return "Something went wrong. Please try again."
}
