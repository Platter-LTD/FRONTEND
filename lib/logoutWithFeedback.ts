import { toast } from "sonner"

/**
 * Runs logout with visible feedback: loading → success + redirect (or error).
 */
export async function logoutWithFeedback(
  logout: () => void | Promise<void>,
  onSignedOut: () => void | Promise<void>,
): Promise<void> {
  const toastId = toast.loading("Logging out…")
  try {
    await Promise.resolve(logout())
    toast.success("Signed out. Redirecting…", { id: toastId, duration: 4000 })
    await Promise.resolve(onSignedOut())
  } catch {
    toast.error("Could not sign out. Please try again.", { id: toastId })
  }
}
