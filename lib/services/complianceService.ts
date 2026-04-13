import { apiClient } from "@/lib/api";
import { getAccessToken } from "@/lib/cookieAuth";
import { ENDPOINTS } from "@/lib/endpoints";

/** localStorage key for sign-in redirect fallback when KYC status API is unavailable */
export const COMPLIANCE_COMPLETE_KEY = "plata_compliance_complete_v1";

// Decode userId from JWT (mirrors logic in kycService)
function decodeUserIdFromToken(t: string | null): string | null {
  try {
    if (!t) return null;
    const [, payload] = t.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(
      typeof atob === "function" ? atob(payload) : Buffer.from(payload, "base64").toString("utf8"),
    );
    return (
      decoded?.userId ||
      decoded?.user_merchant_id ||
      decoded?.userMerchantId ||
      decoded?.merchantId ||
      decoded?.sub ||
      decoded?.id ||
      decoded?._id ||
      null
    );
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
    const res = await apiClient.post(ENDPOINTS.compliance.business.submit, payload);
    return res.data;
  }

  static async getKycStatusForCurrentUser() {
    const token = getAccessToken();
    const userId = decodeUserIdFromToken(token);
    if (!userId) throw new Error("Unable to resolve userId from token");
    const res = await apiClient.get(ENDPOINTS.compliance.status(userId));
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

  static async getBusinessInfo() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.businessInfo);
    return res.data;
  }

  static async getBusinessSurvey() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.businessSurvey);
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

  static async getBusinessRiskAssessment() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.riskAssessment);
    return res.data;
  }

  static async getBusinessMessages() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.messages);
    return res.data;
  }

  static async getBusinessEnhancedDueDiligence() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.enhancedDueDiligence);
    return res.data;
  }

  static async getBusinessCorporateStructure() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.corporateStructure);
    return res.data;
  }

  static async getBusinessNonProfitVerification() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.nonProfitVerification);
    return res.data;
  }

  static async getBusinessGovernmentVerification() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.governmentVerification);
    return res.data;
  }

  static async getCompliancePrefillForCurrentMerchant() {
    const token = getAccessToken();
    const merchantId = decodeUserIdFromToken(token);
    const safe = async <T>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch {
        return null;
      }
    };
    const unwrapData = <T>(payload: unknown): T | null => {
      if (payload == null) return null;
      const p = payload as { data?: unknown };
      if (p && typeof p === "object" && "data" in p) return (p.data as T) ?? null;
      return payload as T;
    };

    const [
      statusRaw,
      businessInfoRaw,
      businessSurveyRaw,
      documentsRaw,
      beneficialOwnersRaw,
      riskAssessmentRaw,
      messagesRaw,
      eddRaw,
      businessTypeOptionsRaw,
      industryTypeOptionsRaw,
      businessModelOptionsRaw,
    ] = await Promise.all([
      safe(() => this.getBusinessKycStatus()),
      safe(() => this.getBusinessInfo()),
      safe(() => this.getBusinessSurvey()),
      safe(() => this.getBusinessDocuments()),
      safe(() => this.getShareholdersForCurrentMerchant()),
      safe(() => this.getBusinessRiskAssessment()),
      safe(() => this.getBusinessMessages()),
      safe(() => this.getBusinessEnhancedDueDiligence()),
      safe(() => this.getBusinessTypeOptions()),
      safe(() => this.getIndustryTypeOptions()),
      safe(() => this.getBusinessModelOptions()),
    ]);

    const survey = unwrapData<Record<string, unknown>>(businessSurveyRaw) ?? {};
    const info = unwrapData<Record<string, unknown>>(businessInfoRaw) ?? {};
    const businessTypeRaw = String(
      survey.businessType ?? survey.business_type ?? info.businessType ?? info.business_type ?? "",
    )
      .trim()
      .toLowerCase();
    const businessType = businessTypeRaw.replace(/[\s-]+/g, "_");

    const isGovernmentEntity = businessType.includes("government");
    const isNonProfit = businessType.includes("non_profit") || businessType.includes("nonprofit") || businessType.includes("ngo");
    const isCorporate = businessType.includes("corporation") || businessType.includes("llc") || businessType.includes("limited");

    const [corporateStructureRaw, nonProfitRaw, governmentRaw] = await Promise.all([
      isCorporate ? safe(() => this.getBusinessCorporateStructure()) : Promise.resolve(null),
      isNonProfit ? safe(() => this.getBusinessNonProfitVerification()) : Promise.resolve(null),
      isGovernmentEntity ? safe(() => this.getBusinessGovernmentVerification()) : Promise.resolve(null),
    ]);

    const beneficialOwnersList = Array.isArray(beneficialOwnersRaw)
      ? beneficialOwnersRaw
      : (unwrapData<unknown[]>(beneficialOwnersRaw) ?? []);

    return {
      merchantId,
      status: unwrapData<Record<string, unknown>>(statusRaw),
      businessInfo: info,
      businessSurvey: survey,
      documents: unwrapData<unknown[]>(documentsRaw) ?? [],
      beneficialOwners: Array.isArray(beneficialOwnersList) ? beneficialOwnersList : [],
      riskAssessment: unwrapData<Record<string, unknown>>(riskAssessmentRaw),
      messages: unwrapData<unknown[]>(messagesRaw) ?? [],
      enhancedDueDiligence: unwrapData<Record<string, unknown>>(eddRaw),
      corporateStructure: unwrapData<Record<string, unknown>>(corporateStructureRaw),
      nonProfitVerification: unwrapData<Record<string, unknown>>(nonProfitRaw),
      governmentVerification: unwrapData<Record<string, unknown>>(governmentRaw),
      businessTypeOptions: Array.isArray(businessTypeOptionsRaw) ? businessTypeOptionsRaw : [],
      industryTypeOptions: Array.isArray(industryTypeOptionsRaw) ? industryTypeOptionsRaw : [],
      businessModelOptions: Array.isArray(businessModelOptionsRaw) ? businessModelOptionsRaw : [],
    };
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

