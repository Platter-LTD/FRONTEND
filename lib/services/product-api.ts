// Product API helper functions with authentication

import { getAccessToken } from '@/lib/cookieAuth';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

const compactObject = (value: any): any => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  );
};

const toEnum = (value: any) =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[%]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    : '';

const mapMoratoriumType = (value: any) => {
  const normalized = toEnum(value);
  if (!normalized) return '';
  if (normalized.includes('principal') && normalized.includes('interest')) return 'grace_on_both';
  if (normalized.includes('principal')) return 'grace_on_principal';
  if (normalized.includes('interest')) return 'grace_on_interest';
  if (['grace_on_principal', 'grace_on_interest', 'grace_on_both'].includes(normalized)) return normalized;
  return '';
};

const mapRepaymentWorkflow = (value: any) => {
  const normalized = toEnum(value);
  if (!normalized) return '';
  const aliases: Record<string, string> = {
    principal_interest_charges: 'principal_interest_charges',
    charges_principal_interest: 'charges_principal_interest',
    interest_charges_principal: 'interest_charges_principal',
    principal_then_interest_then_charges: 'principal_interest_charges',
    charges_then_principal_then_interest: 'charges_principal_interest',
    interest_then_charges_then_principal: 'interest_charges_principal',
  };
  return aliases[normalized] || '';
};

const buildConfigurationPayload = (productType: string, configuration: any) => {
  const normalizedType = String(productType || '').toLowerCase();

  const common = compactObject({
    name: configuration?.name,
    description: configuration?.description,
    previewImage: configuration?.previewImage,
  });

  const about = compactObject({
    tenure: configuration?.tenure ?? configuration?.duration ?? configuration?.durationOfSavings,
    loanTypes: configuration?.loanTypes,
    mortgageTypes: configuration?.mortgageTypes,
    savingsTypes: configuration?.savingsTypes,
    commodityTypes: configuration?.commodityTypes ?? (!normalizedType.includes('investment') ? configuration?.typeRows : undefined),
    investmentTypes: configuration?.investmentTypes ?? (normalizedType.includes('investment') ? configuration?.typeRows : undefined),
  });

  const structure = compactObject({
    interestRate: configuration?.interestRate,
    interestMethod: configuration?.interestMethod,
    allowMoratorium: configuration?.allowMoratorium ?? configuration?.moratoriumEnabled,
    moratoriumDuration: configuration?.moratoriumDuration ?? configuration?.moratoriumDays,
    moratoriumSelectDuration: configuration?.moratoriumSelectDuration,
    moratoriumDurationOf: configuration?.moratoriumDurationOf,
    moratoriumType: mapMoratoriumType(configuration?.moratoriumType),
    repaymentWorkflow: mapRepaymentWorkflow(configuration?.repaymentWorkflow),
    repaymentSchedule: configuration?.repaymentSchedule,
    amortizationSchedule: configuration?.amortizationSchedule,
    repaymentFrequency: configuration?.repaymentFrequency,
    acceptableNpa: configuration?.acceptableNpa,
    equityRequirement: configuration?.equityRequirement,
    savingsType: configuration?.savingsType,
    withdrawalFlexibility: configuration?.withdrawalFlexibility,
    minLoanAmount: configuration?.minLoanAmount,
    maxLoanAmount: configuration?.maxLoanAmount,
    minSavingsAmount: configuration?.minSavingsAmount,
    maxSavingsAmount: configuration?.maxSavingsAmount,
    minInvestmentAmount: configuration?.minInvestmentAmount ?? configuration?.unitAmount,
    maxInvestmentAmount: configuration?.maxInvestmentAmount ?? configuration?.maxAmount,
    minQuantityPurchase: configuration?.minQuantityPurchase,
    yieldMethod: configuration?.yieldMethod,
    offerYieldOn: configuration?.offerYieldOn,
    offerYieldValue: configuration?.offerYieldValue,
    termsAndConditions: configuration?.termsAndConditions,
    contractId: configuration?.contractId,
    airSignSecretKey: configuration?.airSignSecretKey,
    airSignUid: configuration?.airSignUid,
  });

  const requirements = compactObject({
    securityRequirements: configuration?.securityRequirements,
    documentRequirements: configuration?.documentRequirements,
    otherRequirements: configuration?.otherRequirements,
  });

  const feesAndCharges = compactObject({
    charges: configuration?.charges,
    penalties: configuration?.penalties ?? configuration?.withdrawalPenalties,
    chargePaymentMode: configuration?.chargePaymentMode,
    deductChargesOnLoan: configuration?.deductChargesOnLoan,
    customerPayChargesBeforeDisbursement: configuration?.customerPayChargesBeforeDisbursement,
    enableLateRepaymentCharges: configuration?.enableLateRepaymentCharges,
    chargeForcefulWithdrawal: configuration?.chargeForcefulWithdrawal ?? configuration?.forcefulWithdrawal,
  });

  const normalizedProperties = Array.isArray(configuration?.properties) ? configuration.properties : [];

  return compactObject({
    ...common,
    about,
    structure,
    requirements,
    feesAndCharges,
    properties: normalizedProperties,
  });
};

export const productApi = {
  async getProductOverview(appId: string) {
    const response = await fetch(`/api/v1/products/app/${encodeURIComponent(appId)}/product-overview`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to fetch product overview');
    }
    return data;
  },

  async getLoanWorkflow(params?: { loanWorkflowStatus?: string; limit?: number; skip?: number }) {
    const q = new URLSearchParams();
    if (params?.loanWorkflowStatus) q.set("loanWorkflowStatus", params.loanWorkflowStatus);
    if (typeof params?.limit === "number") q.set("limit", String(params.limit));
    if (typeof params?.skip === "number") q.set("skip", String(params.skip));
    const path = `/api/v1/products/applications/me/loan-workflow${q.toString() ? `?${q.toString()}` : ""}`;

    const response = await fetch(path, {
      headers: getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to fetch loan workflow');
    }
    return data;
  },

  async updateLoanWorkflowStatus(applicationId: string, loanWorkflowStatus: string) {
    const response = await fetch(`/api/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ loanWorkflowStatus }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to update loan workflow status');
    }
    return data;
  },

  // Create a new product
  // P2-005 fix: always include isActive:true and status:'active' to prevent type mismatch
  async createProduct(productData: {
    name: string;
    description: string;
    type: string;
    appId: string;
    status?: string;
    isActive?: boolean;
    [key: string]: any;
  }) {
    const payload = {
      ...productData,
      // Normalize field names — some backends use isActive, others use status
      isActive: productData.isActive !== false, // default true
      status: productData.status || 'active',   // default 'active' (some backends use 'incomplete'/'complete')
    };

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create product');
    }

    return data;
  },

  /** Active / turned-on products for this app — GET /api/v1/products/app/:appId (not the full catalog). */
  async getProductsByAppId(appId: string) {
    const response = await fetch(`/api/v1/products/app/${encodeURIComponent(appId)}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to fetch products');
    }

    return data;
  },

  // Get product by ID
  async getProductById(productId: string) {
    const response = await fetch(`/api/product/${productId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch product');
    }

    return data;
  },

  // Update product
  async updateProduct(productId: string, updates: any) {
    const response = await fetch(`/api/product/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update product');
    }

    return data;
  },

  // Delete product
  async deleteProduct(productId: string) {
    const response = await fetch(`/api/product/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete product');
    }

    return data;
  },

  // Get product configuration
  async getProductConfiguration(productId: string) {
    const response = await fetch(`/api/product/${productId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok && response.status !== 404) {
      throw new Error(data.error || 'Failed to fetch configuration');
    }

    return data;
  },

  // Create or update product configuration
  async saveProductConfiguration(productId: string, productType: string, configuration: any) {
    const payload = buildConfigurationPayload(productType, configuration);
    const response = await fetch(`/api/product/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save configuration');
    }

    return data;
  },

  // Toggle product on/off for an app (PUT /api/v1/products/toggle/:appId/:productId, body { activate })
  async toggleProductStatus(appId: string, productId: string, activate: boolean) {
    const response = await fetch(
      `/api/v1/products/toggle/${encodeURIComponent(appId)}/${encodeURIComponent(productId)}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ activate }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to toggle product');
    }

    return data;
  },

  /** Full catalog — GET /api/v1/products (all products, not app-filtered). */
  async getAllProducts() {
    const response = await fetch('/api/v1/products', {
      headers: getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to fetch products');
    }

    return data;
  },

  // Get all products from PLATA (global pool)
  async getAllProductsFromBuilder() {
    const response = await fetch('/api/product-builder/all', {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch products from PLATA');
    }

    return data;
  },

  /** Alias: active products for app — GET /api/v1/products/app/:appId */
  async getAppProductActivations(appId: string) {
    return this.getProductsByAppId(appId);
  },

  async toggleAppProductActivation(appId: string, productId: string, isActive: boolean) {
    return this.toggleProductStatus(appId, productId, isActive);
  },
};
