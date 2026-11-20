"use client";

import React, { useRef, useState } from "react";
import { ArrowRight, FolderUp } from "lucide-react";
import { BrandButton, DocumentDropTile, SectionCard, StepFooter } from "@/components/compliance/compliance-ui";
import { toast } from "react-toastify";
import { fileToBase64 } from "@/lib/fileUtils";
import { getAccessToken } from "@/lib/cookieAuth";
import { ComplianceService } from "@/lib/services/complianceService";
import { isPdfFile } from "@/lib/isPdfFile";
import { useAuth } from "@/hooks/useAuth";
import { useComplianceForm } from "@/providers/ComplianceFormProvider";
import { useBusinessDocuments } from "@/hooks/queries/compliance";
import { OPTIONAL_TILE_IDS } from "@/lib/businessDocuments";

interface Props {
    onContinue: (missingIds?: string[]) => void;
}

// Helper to resolve userId from various response shapes or JWT fallback
const resolveUserId = (user: any): string | null => {
  if (!user) return null;
  const candidates = [
    user?.id,
    user?._id,
    user?.userId,
    user?.user?.id,
    user?.user?._id,
    user?.user?.userId,
    user?.data?.id,
    user?.data?._id,
    user?.data?.userId,
    user?.data?.user?.id,
    user?.data?.user?._id,
    user?.data?.user?.userId,
  ].filter(Boolean);
  if (candidates.length > 0) return String(candidates[0]);
  try {
    const t = typeof window !== 'undefined' ? getAccessToken() : null;
    if (!t) return null;
    const [, payload] = t.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded?.userId || decoded?.sub || decoded?.id || decoded?._id || null;
  } catch {
    return null;
  }
};

// Define payload types to avoid TSX generic parsing issues
type BusinessDocPayload = {
  type: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  status: string;
};

type GenericDoc = { type: string };

// Map UI IDs to business document type expected by backend dedicated schema
const mapToBusinessDocType = (id: string): string => {
  switch (id) {
    case "coi":
      return "certificate_of_incorporation";
    case "shareholders":
      return "list_of_shareholders";
    case "bank_statement":
      return "bank_statement";
    case "data_privacy":
      return "data_privacy_policy";
    case "article":
      return "articles_of_association";
    case "proof_address":
      return "proof_of_address";
    case "aml":
      return "aml_policies";
    case "license":
      return "license";
    case "director_id":
      return "director_identification";
    default:
      return id; 
  }
};

// Map UI IDs to generic document types used only to satisfy middleware on the backend route
const mapToGenericDocType = (id: string): string | null => {
  switch (id) {
    case "coi":
      return "business_registration";
    case "shareholders":
      return "beneficial_ownership";
    case "bank_statement":
      return "bank";
    case "director_id":
      return "director_identification";
    default:
      return null;
  }
};

const BusinessDocument: React.FC<Props> = ({ onContinue }) => {
  const { user } = useAuth();
  const { businessFiles, setBusinessFile, merchantBusinessSurvey: info } = useComplianceForm();

  const leftList = [
    { id: "coi", title: "COI (certificate of Inc)", hint: "PDF format • Max. 5MB" },
    { id: "shareholders", title: "List of shareholders", hint: "PDF format • Max. 5MB" },
    { id: "bank_statement", title: "Bank Statement (optional)", hint: "PDF format • Max. 5MB" },
    { id: "data_privacy", title: "Data & Privacy Policy", hint: "PDF format • Max. 5MB" },
  ];

  const rightList = [
    { id: "article", title: "Article of formation/Association (optional)", hint: "PDF format • Max. 5MB" },
    { id: "proof_address", title: "Proof of Address", hint: "PDF format • Max. 5MB" },
    { id: "aml", title: "AML Polices", hint: "PDF format • Max. 5MB" },
    { id: "director_id", title: "Director Identification", hint: "PDF format • Max. 5MB" },
    { id: "license", title: "Operating License (if applicable)", hint: "PDF format • Max. 5MB" },
  ];

  const allIds = [...leftList, ...rightList].map(i => i.id);

  const [submitting, setSubmitting] = useState(false);
  // Documents already saved on the server (GET /api/v1/kyc/business/documents), keyed by tile id.
  const saved = useBusinessDocuments().data?.byTile ?? {};

  // Remove previous sessionStorage hydration; we now keep in context

  const MAX_DOC_BYTES = 5 * 1024 * 1024;

  const handleFile = (key: string, file: File | null) => {
    if (!file) {
      setBusinessFile(key, null);
      return;
    }
    if (!isPdfFile(file)) {
      toast.error(`${file.name} must be a PDF`);
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      toast.error(`${file.name} must be 5MB or smaller`);
      return;
    }
    setBusinessFile(key, file);
  };

  const submit = async () => {
    try {
      setSubmitting(true);

      const userId = resolveUserId(user as any);
      if (!userId) {
        toast.error('You must be logged in to submit KYC.');
        return;
      }

      if (!info.businessName?.trim() || !info.country?.trim()) {
        toast.error('Please fill Business Info (business name and country) before uploading documents.');
        return;
      }

      // derive numeric metrics
      const monthlyVol: number = (() => {
        const rawVol = String(info.monthlyVolume ?? "").trim();
        const n = Number(rawVol.replace(/[^0-9.]/g, ""));
        return Number.isFinite(n) && n > 0 ? n : 1;
      })();
      const annualTurnover: number = Math.max(1, Math.round(monthlyVol * 12));

      // collect selected files from context
      const fileEntries = Object.entries(businessFiles).filter(([, f]) => !!f) as Array<[string, File]>;
      const selectedIds = new Set<string>();
      const hasSaved = (id: string) => !!saved[id];

      // Enforce that required business documents are selected (license, bank statement and articles are optional)
      const requiredIds = allIds.filter(id => !OPTIONAL_TILE_IDS.includes(id));
      for (const [key] of fileEntries) selectedIds.add(key);
      const missing = requiredIds.filter((id) => !selectedIds.has(id) && !hasSaved(id));
      if (missing.length > 0) {
        toast.error('Please upload all required documents before continuing.');
        return;
      }
      // Everything is already on file and nothing new was picked: nothing to resubmit.
      if (fileEntries.length === 0) {
        onContinue();
        return;
      }
      if (!fileEntries.some(([key]) => key === 'director_id') && !hasSaved('director_id')) {
        toast.error('Please upload Director Identification (required by compliance).');
        return;
      }

      // Upload each file to compliance service to get real URLs (backend requires these)
      const uploadResults: Array<{ key: string; file: { name: string; size: number }; url: string }> = [];
      for (const [key, f] of fileEntries) {
        const up = await ComplianceService.uploadDocument(f) as { success?: boolean; url?: string; error?: string };
        if (!up?.success || !up?.url) {
          toast.error(up?.error || `Failed to upload ${f.name}. Please try again.`);
          return;
        }
        uploadResults.push({ key, file: f, url: up.url });
      }
      // Reuse already-saved documents (with a known URL) for tiles the merchant did not replace.
      for (const id of allIds) {
        const sd = saved[id];
        if (sd?.fileUrl && !uploadResults.some((r) => r.key === id)) {
          // Backend rejects fileSize <= 0, so fall back to a positive placeholder when the size is unknown.
          uploadResults.push({ key: id, file: { name: sd.fileName || `${id}.pdf`, size: sd.fileSize ?? 1024 }, url: sd.fileUrl });
        }
      }

      // One entry per type; optional types are appended only when the merchant provided them.
      const REQUIRED_BUSINESS_DOC_TYPES = [
        'certificate_of_incorporation',
        'list_of_shareholders',
        'proof_of_address',
        'aml_policies',
        'data_privacy_policy',
        'director_identification',
      ] as const;
      const OPTIONAL_BUSINESS_DOC_TYPES = ['articles_of_association', 'bank_statement', 'license'] as const;
      const businessDocuments: BusinessDocPayload[] = [];
      for (const docType of [...REQUIRED_BUSINESS_DOC_TYPES, ...OPTIONAL_BUSINESS_DOC_TYPES]) {
        const item = uploadResults.find((r) => mapToBusinessDocType(r.key) === docType);
        if (item) {
          businessDocuments.push({
            type: docType,
            fileName: item.file.name,
            fileType: 'application/pdf',
            fileSize: item.file.size,
            fileUrl: item.url,
            uploadedAt: new Date().toISOString(),
            status: 'pending',
          });
        }
      }
      const missingTypes = REQUIRED_BUSINESS_DOC_TYPES.filter((t) => !businessDocuments.some((d) => d.type === t));
      if (missingTypes.length > 0) {
        toast.error(`Missing uploads for required document types: ${missingTypes.join(', ')}.`);
        return;
      }

      const bankUpload = uploadResults.find((r) => r.key === 'bank_statement');
      const shareholderBankStmt = bankUpload
        ? {
            fileName: bankUpload.file.name,
            fileType: 'application/pdf' as const,
            fileSize: bankUpload.file.size,
            fileUrl: bankUpload.url,
            uploadDate: new Date().toISOString(),
          }
        : null;

      const payload = {
        userId,
        userType: 'merchant',
        businessDocuments,
        businessInfo: {
          companyName: info.businessName,
          industry: info.industry || 'Other',
          businessDescription: info.businessModel ? `Model: ${info.businessModel}. Purpose: Payment processing.` : 'Payment processing and merchant onboarding.',
          countryOfIncorporation: info.country || 'NG',
          website: info.website || 'https://example.com',
          companyRegId: info.companyRegId,
          // bvn: (info.bvn || "").replace(/\D/g, "").slice(0, 11),
          companyLogoUrl: "https://via.placeholder.com/1",
        },
        businessSurvey: {
          businessType: (info.businessType || "Other").slice(0, 100),
          country: (info.country || "NG").slice(0, 50),
          businessModel: (info.businessModel || "B2C").slice(0, 20),
          monthlyProcessedVolume: Math.max(0, Math.round(monthlyVol || 0)),
        },
        shareholders: [
          {
            fullName: 'Primary Owner',
            ownershipPercentage: 100,
            bankStatement: shareholderBankStmt || {
              fileName: 'placeholder.pdf',
              fileType: 'application/pdf',
              fileSize: 1024,
              fileUrl: 'data:application/pdf;base64,',
              uploadDate: new Date().toISOString(),
            },
            status: 'pending',
            kyc: {
              url: 'https://example.com/kyc',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
            },
          },
        ],
        riskAssessment: {
          annualTurnover,
          expectedTransactionVolume: Math.max(1, Math.round(monthlyVol || 1)),
          highRiskJurisdiction: false,
          sanctionListCheck: false,
          adverseMediaCheck: false,
        },
      } as any;

      await ComplianceService.submitBusinessKyc(payload as any);
      toast.success('Business KYC submitted');
      // Call onContinue without arguments to signal success
      onContinue();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Business KYC submit failed', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to submit KYC';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const docs = [...leftList, ...rightList];
  const requiredDocIds = allIds.filter((id) => !OPTIONAL_TILE_IDS.includes(id));
  const uploadedRequired = requiredDocIds.filter((id) => !!businessFiles[id] || !!saved[id]).length;
  const progressPct = Math.round((uploadedRequired / requiredDocIds.length) * 100);
  const validateDoc = (file: File) => (!isPdfFile(file) ? "Only PDF files are allowed." : file.size > MAX_DOC_BYTES ? "File must be 5MB or smaller." : null);

  return (
    <div>
      <SectionCard
        icon={<FolderUp />}
        title="Business document upload"
        description="Upload your company documents as PDF files, up to 5MB each."
        action={
          <div className="hidden min-w-44 text-right sm:block">
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {uploadedRequired} / {requiredDocIds.length} required
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {docs.map((item) => (
            <DocumentDropTile
              key={item.id}
              id={item.id}
              title={item.title}
              hint={item.hint}
              accept=".pdf,application/pdf"
              required={!OPTIONAL_TILE_IDS.includes(item.id)}
              file={businessFiles[item.id] || null}
              saved={saved[item.id] || null}
              validate={validateDoc}
              onFile={(file) => handleFile(item.id, file)}
            />
          ))}
        </div>
      </SectionCard>

      <StepFooter
        hint={
          uploadedRequired < requiredDocIds.length
            ? `${requiredDocIds.length - uploadedRequired} required document${requiredDocIds.length - uploadedRequired === 1 ? "" : "s"} left to upload.`
            : "All required documents are ready to submit."
        }
      >
        <BrandButton onClick={submit} loading={submitting}>
          {submitting ? "Submitting…" : "Submit & continue"}
          {!submitting && <ArrowRight className="size-4" />}
        </BrandButton>
      </StepFooter>
    </div>
  );
};

export default BusinessDocument;
