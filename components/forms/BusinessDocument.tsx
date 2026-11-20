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
import { complianceKeys, useBusinessDocuments } from "@/hooks/queries/compliance";
import { useQueryClient } from "@tanstack/react-query";
import { OPTIONAL_TILE_IDS } from "@/lib/businessDocuments";
import { snapshotFile } from "@/lib/snapshotFile";

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

type UploadedFile = { url: string; key?: string; name: string; size: number };

// One entry per type in the first submission; optional types only when the merchant provided them.
const REQUIRED_BUSINESS_DOC_TYPES = [
  'certificate_of_incorporation',
  'list_of_shareholders',
  'proof_of_address',
  'aml_policies',
  'data_privacy_policy',
  'director_identification',
] as const;
const OPTIONAL_BUSINESS_DOC_TYPES = ['articles_of_association', 'bank_statement', 'license'] as const;

/** Backend error code, e.g. KYC_PROFILE_NOT_FOUND / DOCUMENT_ALREADY_APPROVED. */
const errorCode = (err: any): string | undefined => {
  const d = err?.response?.data;
  return d?.code ?? d?.error?.code ?? d?.errorCode;
};

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
  const queryClient = useQueryClient();
  // Documents already saved on the server (GET /api/v1/kyc/business/documents), keyed by tile id.
  const docsQuery = useBusinessDocuments();
  const saved = docsQuery.data?.byTile ?? {};

  // Remove previous sessionStorage hydration; we now keep in context

  const MAX_DOC_BYTES = 5 * 1024 * 1024;

  // One upload per picked file: started on pick, reused by every save attempt (so a failed
  // save never re-uploads). A failed upload is dropped from the cache so the next save retries it.
  const uploadsRef = useRef(new Map<File, Promise<UploadedFile>>());
  const ensureUploaded = (file: File): Promise<UploadedFile> => {
    const cached = uploadsRef.current.get(file);
    if (cached) return cached;
    const p = ComplianceService.uploadDocument(file).then((up) => {
      if (!up?.success || !up?.url) throw new Error(up?.error || `Failed to upload ${file.name}. Please try again.`);
      return { url: up.url, key: up.key, name: file.name, size: file.size };
    });
    p.catch(() => uploadsRef.current.delete(file));
    uploadsRef.current.set(file, p);
    return p;
  };

  const handleFile = async (key: string, file: File | null) => {
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
    let snap: File;
    try {
      snap = await snapshotFile(file);
    } catch {
      toast.error(`Could not read ${file.name}. Please pick the file again.`);
      return;
    }
    setBusinessFile(key, snap);
    // Upload in the background; errors surface when the merchant saves.
    ensureUploaded(snap).catch(() => {});
  };

  const monthlyVolume = (): number => {
    const n = Number(String(info.monthlyVolume ?? "").trim().replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const buildBusinessInfo = () => ({
    companyName: info.businessName,
    industry: info.industry || 'Other',
    businessDescription: info.businessModel ? `Model: ${info.businessModel}. Purpose: Payment processing.` : 'Payment processing and merchant onboarding.',
    countryOfIncorporation: info.country || 'NG',
    website: info.website || 'https://example.com',
    companyRegId: info.companyRegId,
    companyLogoUrl: "https://via.placeholder.com/1",
  });

  const buildBusinessSurvey = () => ({
    businessType: (info.businessType || "Other").slice(0, 100),
    country: (info.country || "NG").slice(0, 50),
    businessModel: (info.businessModel || "B2C").slice(0, 20),
    monthlyProcessedVolume: Math.max(0, Math.round(monthlyVolume())),
  });

  /** Profile already exists: save business info + survey, and only the documents the merchant changed. */
  const saveChanges = async (picked: Array<{ id: string; upload: UploadedFile }>) => {
    await ComplianceService.updateBusinessInfo(buildBusinessInfo());
    await ComplianceService.updateBusinessSurvey(buildBusinessSurvey());
    if (picked.length > 0) {
      await ComplianceService.updateBusinessDocuments(
        picked.map(({ id, upload }) => ({
          type: mapToBusinessDocType(id),
          key: upload.key,
          fileUrl: upload.url,
          fileName: upload.name,
          fileType: 'application/pdf',
          fileSize: upload.size,
        })),
      );
    }
  };

  /** First submission: creates the KYC profile with business info and every document. */
  const firstSubmit = async (userId: string, picked: Array<{ id: string; upload: UploadedFile }>): Promise<boolean> => {
    // Picked files first, then documents already on file for tiles the merchant did not replace.
    const byId = new Map<string, { name: string; size: number; url: string }>();
    for (const { id, upload } of picked) byId.set(id, { name: upload.name, size: upload.size, url: upload.url });
    for (const id of allIds) {
      const sd = saved[id];
      // Backend rejects fileSize <= 0, so fall back to a positive placeholder when the size is unknown.
      if (sd?.fileUrl && !byId.has(id)) byId.set(id, { name: sd.fileName || `${id}.pdf`, size: sd.fileSize ?? 1024, url: sd.fileUrl });
    }

    const businessDocuments: BusinessDocPayload[] = [];
    for (const docType of [...REQUIRED_BUSINESS_DOC_TYPES, ...OPTIONAL_BUSINESS_DOC_TYPES]) {
      const id = allIds.find((x) => mapToBusinessDocType(x) === docType);
      const item = id ? byId.get(id) : undefined;
      if (item) {
        businessDocuments.push({
          type: docType,
          fileName: item.name,
          fileType: 'application/pdf',
          fileSize: item.size,
          fileUrl: item.url,
          uploadedAt: new Date().toISOString(),
          status: 'pending',
        });
      }
    }
    const missingTypes = REQUIRED_BUSINESS_DOC_TYPES.filter((t) => !businessDocuments.some((d) => d.type === t));
    if (missingTypes.length > 0) {
      toast.error(`Missing uploads for required document types: ${missingTypes.join(', ')}.`);
      return false;
    }

    const bank = byId.get('bank_statement');
    const monthlyVol = monthlyVolume();
    const payload = {
      userId,
      userType: 'merchant',
      businessDocuments,
      businessInfo: buildBusinessInfo(),
      businessSurvey: buildBusinessSurvey(),
      shareholders: [
        {
          fullName: 'Primary Owner',
          ownershipPercentage: 100,
          bankStatement: {
            fileName: bank?.name ?? 'placeholder.pdf',
            fileType: 'application/pdf',
            fileSize: bank?.size ?? 1024,
            fileUrl: bank?.url ?? 'data:application/pdf;base64,',
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
        annualTurnover: Math.max(1, Math.round(monthlyVol * 12)),
        expectedTransactionVolume: Math.max(1, Math.round(monthlyVol)),
        highRiskJurisdiction: false,
        sanctionListCheck: false,
        adverseMediaCheck: false,
      },
    };
    await ComplianceService.submitBusinessKyc(payload);
    return true;
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

      // Saved documents decide between "update" and "first submit", so wait until they are known.
      if (docsQuery.isLoading) {
        toast.info('Still loading your saved documents. Please try again in a moment.');
        return;
      }

      const fileEntries = Object.entries(businessFiles).filter(([, f]) => !!f) as Array<[string, File]>;
      const missing = allIds
        .filter((id) => !OPTIONAL_TILE_IDS.includes(id))
        .filter((id) => !businessFiles[id] && !saved[id]);
      if (missing.length > 0) {
        toast.error('Please upload all required documents before continuing.');
        return;
      }

      // Await uploads (already started on pick; cached results are reused on retries).
      const picked: Array<{ id: string; upload: UploadedFile }> = [];
      for (const [id, f] of fileEntries) picked.push({ id, upload: await ensureUploaded(f) });

      // A profile exists once business KYC was submitted, which is when documents are on file.
      const hasProfile = Object.keys(saved).length > 0;
      let submitted = false;
      if (hasProfile) {
        try {
          await saveChanges(picked);
        } catch (err: any) {
          if (errorCode(err) !== 'KYC_PROFILE_NOT_FOUND') throw err;
          submitted = await firstSubmit(userId, picked);
          if (!submitted) return;
        }
      } else {
        submitted = await firstSubmit(userId, picked);
        if (!submitted) return;
      }

      // Picked files are now on the server: clear them so tiles show the saved versions.
      for (const [id] of fileEntries) setBusinessFile(id, null);
      await queryClient.invalidateQueries({ queryKey: complianceKeys.businessDocuments });
      toast.success(submitted ? 'Business KYC submitted' : 'Changes saved');
      onContinue();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Business KYC save failed', err);
      if (errorCode(err) === 'DOCUMENT_ALREADY_APPROVED') {
        toast.error('One of these documents is already approved and cannot be replaced. Remove it and try again.');
        return;
      }
      const data = err?.response?.data;
      toast.error(data?.error || data?.message || err?.message || 'Failed to save business KYC');
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
