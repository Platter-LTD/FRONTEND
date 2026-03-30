import { apiClient } from "@/lib/api";
import { getAccessToken } from "@/lib/cookieAuth";
import { ENDPOINTS } from "@/lib/endpoints";

// Decode userId from JWT (mirrors logic in kycService)
function decodeUserIdFromToken(t: string | null): string | null {
  try {
    if (!t) return null;
    const [, payload] = t.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(
      typeof atob === "function" ? atob(payload) : Buffer.from(payload, "base64").toString("utf8"),
    );
    return decoded?.userId || decoded?.sub || decoded?.id || decoded?._id || null;
  } catch {
    return null;
  }
}

export class ComplianceService {
  // --- Individual KYC ---
  static async submitIndividualKyc(payload: unknown) {
    const res = await apiClient.post(ENDPOINTS.compliance.individual.submit, payload);
    return res.data;
  }

  // --- Business KYC ---
  static async submitBusinessKyc(payload: unknown) {
    const p = payload as { businessDocuments?: Array<{ type?: string }> };
    console.log('[ComplianceService] submitBusinessKyc: businessDocuments length:', p?.businessDocuments?.length, 'types:', p?.businessDocuments?.map((d) => d?.type));
    const res = await apiClient.post(ENDPOINTS.compliance.business.submit, payload);
    console.log('[ComplianceService] submitBusinessKyc response status:', res.status);
    return res.data;
  }

  static async getKycStatusForCurrentUser() {
    const token = getAccessToken();
    const userId = decodeUserIdFromToken(token);
    if (!userId) throw new Error("Unable to resolve userId from token");
    if (process.env.NODE_ENV !== "production") {
      console.log("[ComplianceService] getKycStatusForCurrentUser userId:", userId);
    }
    const res = await apiClient.get(ENDPOINTS.compliance.status(userId));
    if (process.env.NODE_ENV !== "production") {
      console.log("[ComplianceService] getKycStatusForCurrentUser response:", res.data);
    }
    return res.data;
  }

  // --- Shareholders (per compliance-ms docs: GET with merchantId, PUT full array) ---
  static async getShareholdersForCurrentMerchant() {
    const token = getAccessToken();
    const userId = decodeUserIdFromToken(token);
    if (!userId) return [];
    try {
      const res = await apiClient.get(ENDPOINTS.compliance.business.beneficialOwners(userId));
      const data: unknown = res.data ?? {};
      const arr =
        (data as { data?: unknown[] })?.data ??
        (data as { shareholders?: unknown[] })?.shareholders ??
        [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  static async upsertShareholdersForCurrentMerchant(payload: unknown) {
    const token = getAccessToken();
    if (!token) throw new Error("Missing access token. Please log in before submitting shareholders.");
    const res = await apiClient.put(ENDPOINTS.compliance.business.beneficialOwnersPut, payload);
    return res.data;
  }

  // --- Business dropdown options (from compliance-ms) ---
  static async getBusinessTypeOptions(): Promise<{ value: string; label: string }[]> {
    try {
      const res = await apiClient.get(ENDPOINTS.compliance.business.businessTypeOptions);
      const data = (res.data as { success?: boolean; data?: { value: string; label: string }[] })?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  static async getIndustryTypeOptions(): Promise<{ value: string; label: string }[]> {
    try {
      const res = await apiClient.get(ENDPOINTS.compliance.business.industryTypeOptions);
      const data = (res.data as { success?: boolean; data?: { value: string; label: string }[] })?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  static async getBusinessModelOptions(): Promise<{ value: string; label: string }[]> {
    try {
      const res = await apiClient.get(ENDPOINTS.compliance.business.businessModelOptions);
      const data = (res.data as { success?: boolean; data?: { value: string; label: string }[] })?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  // --- Business KYC status & documents ---
  static async getBusinessKycStatus() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.status);
    return res.data;
  }

  static async getBusinessDocuments() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.documents);
    return res.data;
  }

  static async getBusinessDocument(documentId: string) {
    const res = await apiClient.get(ENDPOINTS.compliance.business.document(documentId));
    return res.data;
  }

  /** Upload a file for KYC (multipart/form-data, field: file). Returns { success, url?, key?, error? }. Retries on 5xx or network/timeout. */
  static async uploadDocument(file: File, maxRetries = 3): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await apiClient.post(ENDPOINTS.compliance.upload, form);
        const data = res.data as { success?: boolean; url?: string; key?: string; error?: string };
        if (res.status >= 500 && attempt < maxRetries) {
          lastError = data?.error || `Server error (${res.status})`;
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        return { success: !!data?.success, url: data?.url, key: data?.key, error: data?.error };
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const isRetryable =
          (status != null && status >= 500) ||
          (err as { code?: string }).code === "ECONNABORTED" ||
          (err as { message?: string }).message?.toLowerCase().includes("timeout") ||
          (err as { message?: string }).message?.toLowerCase().includes("network");
        lastError = (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (err as { message?: string }).message ?? "Upload failed";
        if (isRetryable && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        return { success: false, error: lastError };
      }
    }
    return { success: false, error: lastError ?? "Upload failed after retries" };
  }
}

