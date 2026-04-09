import { toast } from 'sonner';

export function toastApiSuccess(message: string, options?: { id?: string; duration?: number }) {
  toast.success(message, { duration: options?.duration ?? 2800, id: options?.id });
}

export function toastApiError(message: string, options?: { id?: string; duration?: number }) {
  toast.error(message, { duration: options?.duration ?? 6500, id: options?.id });
}
