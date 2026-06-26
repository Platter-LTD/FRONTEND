import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
import { getAccessToken } from '@/lib/cookieAuth';

/** Plata account / product API origin — `NEXT_PUBLIC_API_URL` from `.env`. */
const ACCOUNT_API_BASE = getPlataApiBaseUrl();
export const PLATA_ACCOUNT_API_BASE = getPlataApiBaseUrl();

// ============================================================================
// Helper Functions
// ============================================================================

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Account {
  id: string;
  userId: string;
  merchantId?: string;
  type: 'savings' | 'loan' | 'mortgage' | 'commodity' | 'checking' | 'investment';
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'suspended' | 'closed';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface LoanApplication {
  id: string;
  userId: string;
  productId: string;
  merchantId: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'closed';
  amount: number;
  term: number; // in months
  interestRate?: number;
  purpose?: string;
  monthlyPayment?: number;
  totalRepayment?: number;
  applicationData?: Record<string, any>;
  rejectionReason?: string;
  approvedAt?: string;
  disbursedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MortgageApplication {
  id: string;
  userId: string;
  productId: string;
  merchantId: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'closed';
  propertyValue: number;
  loanAmount: number;
  downPayment: number;
  term: number; // in years
  interestRate?: number;
  propertyAddress?: string;
  propertyType?: 'residential' | 'commercial' | 'land';
  applicationData?: Record<string, any>;
  rejectionReason?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsAccount {
  id: string;
  userId: string;
  productId: string;
  merchantId?: string;
  accountNumber?: string;
  balance: number;
  currency: string;
  interestRate?: number;
  interestAccrued?: number;
  targetAmount?: number;
  maturityDate?: string;
  status: 'active' | 'inactive' | 'matured' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CommodityPurchase {
  id: string;
  userId: string;
  productId: string;
  merchantId?: string;
  commodityType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  purchaseDate: string;
  deliveryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductApplication {
  id: string;
  userId: string;
  productId: string;
  merchantId: string;
  applicationType: 'loan' | 'mortgage' | 'savings' | 'commodity' | 'investment';
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  applicationData?: Record<string, any>;
  documents?: string[];
  rejectionReason?: string;
  reviewedBy?: string;
  submittedAt: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LoanWorkflowStatus = 'requested' | 'under_review' | 'approved' | 'declined' | 'blacklisted';

export interface LoanWorkflowApplication {
  id: string;
  appId?: string;
  merchantId: string;
  merchantName?: string;
  offeringMerchantId?: string;
  offeringMerchantName?: string;
  userId: string;
  productType: 'LOAN' | 'MORTGAGE' | string;
  globalProductId?: string;
  globalProductReferenceNumber?: string;
  localApplicationId?: string;
  merchantProductId?: string;
  status?: string;
  loanWorkflowStatus?: LoanWorkflowStatus;
  loanWorkflowCallbackUrl?: string;
  loanDisbursement?: Record<string, any> | null;
  submittedAt?: string;
  signedAt?: string | null;
  contractSnapshot?: Record<string, any>;
  payoutSplit?: Record<string, any>;
  snapshotVersion?: number;
  snapshotHash?: string;
  submittedRequirements?: Array<Record<string, any>>;
  createdAt: string;
}

export interface PricingInfo {
  productId: string;
  basePrice: number;
  currency: string;
  interestRate?: number;
  fees?: {
    type: string;
    amount: number;
    description?: string;
  }[];
  discounts?: {
    type: string;
    amount: number;
    description?: string;
  }[];
  totalPrice: number;
  effectiveRate?: number;
}

export interface BillingStatus {
  userId: string;
  status: 'current' | 'overdue' | 'delinquent';
  totalDue: number;
  nextPaymentDate?: string;
  overdueAmount?: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

export interface AppOwnership {
  userId: string;
  apps: {
    appId: string;
    appName: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: string;
  }[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending';
  merchantId?: string;
  totalApplications?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// ============================================================================
// Account Management API
// ============================================================================

export const accountApi = {
  /**
   * Create a new account
   */
  async create(data: {
    userId: string;
    type: Account['type'];
    currency?: string;
    merchantId?: string;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<Account>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/accounts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to create account',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Create account error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create account',
      };
    }
  },

  /**
   * Get account by ID
   */
  async getById(id: string): Promise<ApiResponse<Account>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/accounts/${id}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get account',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get account error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get account',
      };
    }
  },

  /**
   * Get all accounts for a user
   */
  async getByUserId(userId: string): Promise<ApiResponse<Account[]>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/users/${userId}/accounts`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get user accounts',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get user accounts error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user accounts',
      };
    }
  },

  /**
   * Update account balance
   */
  async updateBalance(
    id: string,
    data: {
      amount: number;
      type: 'credit' | 'debit';
      description?: string;
    }
  ): Promise<ApiResponse<Account>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/accounts/${id}/balance`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to update account balance',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Update account balance error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update account balance',
      };
    }
  },

  /**
   * Delete an account
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/accounts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to delete account',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Delete account error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete account',
      };
    }
  },
};

// ============================================================================
// Loan Applications API
// ============================================================================

export const loanApi = {
  /**
   * Apply for a loan
   */
  async apply(data: {
    product_id: string;
    merchant_id: string;
    user_id: string;
    amount: number;
    term: number;
    purpose?: string;
    applicationData?: Record<string, any>;
  }): Promise<ApiResponse<LoanApplication>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/loans/apply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to submit loan application',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Loan application error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit loan application',
      };
    }
  },

  /**
   * Get loan application by ID
   */
  async getById(id: string): Promise<ApiResponse<LoanApplication>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/loans/${id}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get loan application',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get loan error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get loan application',
      };
    }
  },

  /**
   * Get all loans for a user
   */
  async getUserLoans(userId: string): Promise<ApiResponse<LoanApplication[]>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/loans/user/${userId}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get user loans',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get user loans error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user loans',
      };
    }
  },
};

// ============================================================================
// Mortgage Applications API
// ============================================================================

export const mortgageApi = {
  /**
   * Apply for a mortgage
   */
  async apply(data: {
    product_id: string;
    merchant_id: string;
    user_id: string;
    propertyValue: number;
    loanAmount: number;
    downPayment: number;
    term: number;
    propertyAddress?: string;
    propertyType?: 'residential' | 'commercial' | 'land';
    applicationData?: Record<string, any>;
  }): Promise<ApiResponse<MortgageApplication>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/mortgages/apply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to submit mortgage application',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Mortgage application error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit mortgage application',
      };
    }
  },

  /**
   * Get mortgage application by ID
   */
  async getById(id: string): Promise<ApiResponse<MortgageApplication>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/mortgages/${id}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get mortgage application',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get mortgage error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get mortgage application',
      };
    }
  },

  /**
   * Get all mortgages for a user
   */
  async getUserMortgages(userId: string): Promise<ApiResponse<MortgageApplication[]>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/mortgages/user/${userId}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get user mortgages',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get user mortgages error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user mortgages',
      };
    }
  },
};

// ============================================================================
// Savings Accounts API
// ============================================================================

export const savingsApi = {
  /**
   * Create a savings account
   */
  async create(data: {
    product_id: string;
    user_id: string;
    initial_deposit?: number;
    currency?: string;
    targetAmount?: number;
    maturityDate?: string;
  }): Promise<ApiResponse<SavingsAccount>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/savings-accounts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to create savings account',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Create savings account error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create savings account',
      };
    }
  },
};

// ============================================================================
// Commodities API
// ============================================================================

export const commodityApi = {
  /**
   * Buy a commodity
   */
  async buy(data: {
    product_id: string;
    user_id: string;
    amount: number;
    quantity?: number;
  }): Promise<ApiResponse<CommodityPurchase>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/commodities/buy`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to purchase commodity',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Buy commodity error:', error);
      return {
        success: false,
        error: error.message || 'Failed to purchase commodity',
      };
    }
  },

  /**
   * Get commodity details
   */
  async getDetails(productId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/commodities/${productId}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get commodity details',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get commodity details error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get commodity details',
      };
    }
  },
};

// ============================================================================
// Application Processing API (Admin)
// ============================================================================

export const applicationApi = {
  /**
   * Submit a generic product application
   */
  async apply(data: {
    product_id: string;
    merchant_id: string;
    user_id: string;
    applicationType: 'loan' | 'mortgage' | 'savings' | 'commodity' | 'investment';
    applicationData?: Record<string, any>;
  }): Promise<ApiResponse<ProductApplication>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/apply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to submit application',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Submit application error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit application',
      };
    }
  },

  /**
   * Approve an application (Admin only)
   */
  async approve(id: string, approvedAmount?: number): Promise<ApiResponse<LoanWorkflowApplication>> {
    try {
      const response = await fetch(`/api/v1/products/applications/${encodeURIComponent(id)}/loan-workflow`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          loanWorkflowStatus: 'approved',
          ...(approvedAmount != null ? { approvedAmount } : {}),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to approve application',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Approve application error:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve application',
      };
    }
  },

  /**
   * Reject an application (Admin only)
   */
  async reject(id: string, _reason?: string): Promise<ApiResponse<LoanWorkflowApplication>> {
    try {
      const response = await fetch(`/api/v1/products/applications/${encodeURIComponent(id)}/loan-workflow`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ loanWorkflowStatus: 'declined' }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to reject application',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Reject application error:', error);
      return {
        success: false,
        error: error.message || 'Failed to reject application',
      };
    }
  },

  async blacklist(id: string, _reason?: string): Promise<ApiResponse<LoanWorkflowApplication>> {
    return this.updateLoanWorkflowStatus(id, { loanWorkflowStatus: 'blacklisted' });
  },

  async getLoanWorkflowApplications(params?: {
    loanWorkflowStatus?: LoanWorkflowStatus;
    limit?: number;
    skip?: number;
  }): Promise<ApiResponse<LoanWorkflowApplication[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.loanWorkflowStatus) queryParams.set('loanWorkflowStatus', params.loanWorkflowStatus);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await fetch(
        `/api/v1/products/applications/me/loan-workflow${queryParams.toString() ? `?${queryParams}` : ''}`,
        { headers: getAuthHeaders() },
      );
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to load workflow applications',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get loan workflow applications error:', error);
      return {
        success: false,
        error: error.message || 'Failed to load workflow applications',
      };
    }
  },

  async getWorkflowApplication(id: string): Promise<ApiResponse<LoanWorkflowApplication>> {
    try {
      const response = await fetch(`/api/v1/products/applications/${encodeURIComponent(id)}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to load application',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get workflow application error:', error);
      return {
        success: false,
        error: error.message || 'Failed to load application',
      };
    }
  },

  async updateLoanWorkflowStatus(
    id: string,
    body: { loanWorkflowStatus: LoanWorkflowStatus; approvedAmount?: number },
  ): Promise<ApiResponse<LoanWorkflowApplication>> {
    try {
      const response = await fetch(`/api/v1/products/applications/${encodeURIComponent(id)}/loan-workflow`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to update workflow status',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Update loan workflow status error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update workflow status',
      };
    }
  },

  /**
   * Get all applications (Admin only)
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    appId?: string;
  }): Promise<ApiResponse<ProductApplication[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.type) queryParams.append('type', params.type);
      if (params?.appId) queryParams.append('appId', params.appId);

      const url = `/api/v1/applications${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get applications',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get all applications error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get applications',
      };
    }
  },

  /**
   * Get pending applications (Admin only)
   */
  async getPending(params?: { appId?: string }): Promise<ApiResponse<ProductApplication[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.appId) queryParams.append('appId', params.appId);
      const response = await fetch(`/api/v1/applications/pending${queryParams.toString() ? `?${queryParams}` : ''}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get pending applications',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get pending applications error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get pending applications',
      };
    }
  },

  /**
   * Get applications by user ID
   */
  async getByUser(userId: string): Promise<ApiResponse<ProductApplication[]>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/user/${userId}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get user applications',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get user applications error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user applications',
      };
    }
  },

  /**
   * Get application by ID
   */
  async getById(id: string): Promise<ApiResponse<ProductApplication>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/${id}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get application',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get application error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get application',
      };
    }
  },
};

// ============================================================================
// Pricing API
// ============================================================================

export const pricingApi = {
  /**
   * Calculate pricing for a product
   */
  async calculate(data: {
    productId: string;
    userId?: string;
    amount?: number;
    term?: number;
  }): Promise<ApiResponse<PricingInfo>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/pricing/calculate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to calculate pricing',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Calculate pricing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate pricing',
      };
    }
  },

  /**
   * Get product pricing information
   */
  async getProductPricing(productId: string): Promise<ApiResponse<PricingInfo>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/pricing/product/${productId}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get product pricing',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get product pricing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get product pricing',
      };
    }
  },
};

// ============================================================================
// Billing Check API
// ============================================================================

export const billingCheckApi = {
  /**
   * Check billing status for a user
   */
  async checkStatus(userId: string): Promise<ApiResponse<BillingStatus>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/users/${userId}/billing-check`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to check billing status',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Check billing status error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check billing status',
      };
    }
  },

  /**
   * Get app ownership information for a user
   */
  async getAppOwnership(userId: string): Promise<ApiResponse<AppOwnership>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/users/${userId}/app-ownership`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get app ownership',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get app ownership error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get app ownership',
      };
    }
  },
};

// ============================================================================
// Customers API
// ============================================================================

export const customersApi = {
  /**
   * Get all customers for a merchant
   */
  async getAll(merchantId?: string, params?: {
    page?: number;
    limit?: number;
    status?: 'active' | 'inactive' | 'pending';
    search?: string;
  }): Promise<ApiResponse<Customer[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (merchantId) queryParams.append('merchantId', merchantId);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);

      const url = `${ACCOUNT_API_BASE}/api/v1/customers${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get customers',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get customers error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get customers',
      };
    }
  },

  /**
   * Get customer by ID
   */
  async getById(id: string): Promise<ApiResponse<Customer>> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/customers/${id}`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get customer',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get customer error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get customer',
      };
    }
  },

  /**
   * Get customer applications
   */
  async getApplications(customerId: string, params?: {
    page?: number;
    limit?: number;
    type?: 'loan' | 'mortgage' | 'savings' | 'commodity';
    status?: 'pending' | 'under_review' | 'approved' | 'rejected';
  }): Promise<ApiResponse<ProductApplication[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.type) queryParams.append('type', params.type);
      if (params?.status) queryParams.append('status', params.status);

      const url = `${ACCOUNT_API_BASE}/api/v1/applications/user/${customerId}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || result.message || 'Failed to get customer applications',
        };
      }

      return result;
    } catch (error: any) {
      console.error('Get customer applications error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get customer applications',
      };
    }
  },
};

// ============================================================================
// Health Check
// ============================================================================

export const healthApi = {
  /**
   * Check if the Account-MS service is healthy
   */
  async check(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const response = await fetch(`${ACCOUNT_API_BASE}/health`);

      if (response.ok) {
        return { healthy: true, message: 'Account service is healthy' };
      }

      return { healthy: false, message: 'Account service health check failed' };
    } catch (error: any) {
      console.error('Health check error:', error);
      return { healthy: false, message: error.message || 'Failed to reach account service' };
    }
  },
};

// ============================================================================
// Combined Account Service Export
// ============================================================================

export const accountService = {
  accounts: accountApi,
  loans: loanApi,
  mortgages: mortgageApi,
  savings: savingsApi,
  commodities: commodityApi,
  applications: applicationApi,
  pricing: pricingApi,
  billing: billingCheckApi,
  health: healthApi,
  customers: customersApi,
};

export default accountService;
