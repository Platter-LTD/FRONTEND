"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, FolderUp } from "lucide-react";
import { BrandButton, DocumentDropTile, SectionCard, StepFooter } from "@/components/compliance/compliance-ui";
import { isPdfFile } from "@/lib/isPdfFile";
import { fileToBase64 } from "@/lib/fileUtils";
import { submitBusinessKyc } from "@/lib/services/kycService";
import { toast } from "react-toastify";
import { useComplianceForm } from "@/providers/ComplianceFormProvider";

interface Props {
  missingIds?: string[];
}

const BusinessDocumentWithError: React.FC<Props> = ({ missingIds = [] }) => {
  const { merchantBusinessSurvey: info } = useComplianceForm();
  const [selected, setSelected] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);

  const leftList = [
    { id: "coi", title: "COI (certificate of Inc)" },
    { id: "shareholders", title: "List of shareholders" },
    { id: "bank_statement", title: "Bank Statement" },
    { id: "data_privacy", title: "Data & Privacy Policy" },
  ];

  const rightList = [
    { id: "article", title: "Article of formation/Association" },
    { id: "proof_address", title: "Proof of Address" },
    { id: "aml", title: "AML Polices" },
  ];

  const allIds = useMemo(() => [...leftList, ...rightList].map((i) => i.id), []);

  const markError = (id: string) => {
    // Show red if it was missing when we arrived OR still not selected
    if (missingIds.includes(id)) return true;
    return !selected[id];
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      if (!info.businessName?.trim() || !info.country?.trim()) {
        toast.error("Please fill Business Info before uploading documents.");
        return;
      }

      // build documents from selected
      const entries = Object.entries(selected).filter(([, f]) => !!f) as Array<[string, File]>;
      const documents: Array<{ type: string; fileName: string; fileType: string; fileSize: number; fileData: string }> = [];
      for (const [key, f] of entries) {
        const base64 = await fileToBase64(f);
        documents.push({ type: key, fileName: f.name, fileType: f.type, fileSize: f.size, fileData: base64 });
      }

      if (documents.length === 0) {
        toast.error("Please upload at least one required document.");
        return;
      }

      if (!info.businessName || !info.companyRegId || !info.country) {
        toast.error("Business name, company reg. ID and country are required.");
        return;
      }

      const payload = {
        businessInfo: {
          businessName: info.businessName,
          businessType: info.businessType,
          registrationNumber: info.companyRegId,
          // bvn: (info.bvn || "").replace(/\D/g, "").slice(0, 11),
          industry: info.industry || "",
          address: {
            street: "",
            city: info.userBase || "",
            state: "",
            postalCode: "",
            country: info.country || "NG",
          },
        },
        beneficialOwners: [],
        directors: [],
        documents,
      };

      await submitBusinessKyc(payload as any);
      toast.success("Business KYC submitted");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Business KYC submit failed", err);
      const msg = err?.response?.data?.error || err?.message || "Failed to submit KYC";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const docs = [...leftList, ...rightList];
  const stillMissing = docs.filter((d) => !selected[d.id]).length;

  return (
    <div className="space-y-6">
      <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-red-900">Some required documents are missing</p>
          <p className="text-sm text-red-800/80">Please upload the highlighted items and try again.</p>
        </div>
      </div>

      <SectionCard
        icon={<FolderUp />}
        title="Business document upload"
        description="Upload the missing company documents as PDF files."
        action={
          <span className="hidden text-sm font-semibold text-gray-900 tabular-nums sm:block">
            {docs.length - stillMissing} / {docs.length} uploaded
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {docs.map((item) => (
            <DocumentDropTile
              key={item.id}
              id={item.id}
              title={item.title}
              hint="PDF format · Max. 5MB"
              accept=".pdf,application/pdf"
              required
              file={selected[item.id] ?? null}
              invalid={markError(item.id)}
              validate={(file: File) => (!isPdfFile(file) ? "Only PDF files are allowed." : file.size > 5 * 1024 * 1024 ? "File must be 5MB or smaller." : null)}
              onFile={(file) => setSelected((p) => ({ ...p, [item.id]: file }))}
            />
          ))}
        </div>
      </SectionCard>

      <StepFooter hint={stillMissing > 0 ? `${stillMissing} document${stillMissing === 1 ? "" : "s"} still missing.` : "All documents are ready to submit."}>
        <BrandButton onClick={handleSubmit} loading={submitting}>
          {submitting ? "Submitting…" : "Save & continue"}
        </BrandButton>
      </StepFooter>
    </div>
  );
};

export default BusinessDocumentWithError;
