'use client';

import React, { useState, useEffect } from 'react';
import { Building2, ClipboardList, Globe, ArrowRight } from 'lucide-react';
import { CurrencyVolumeField } from './CurrencyVolumeField';
import { toast } from 'react-toastify';
import { WEBSITE_URL_PREFIX } from '@/lib/websiteUrl';
import { CountrySelect } from '@/components/ui/country-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplianceService } from '@/lib/services/complianceService';
import { useComplianceForm } from '@/providers/ComplianceFormProvider';
import {
  BrandButton,
  DocumentDropTile,
  Field,
  SectionCard,
  StepFooter,
  fieldControlClass,
} from '@/components/compliance/compliance-ui';
import { cn } from '@/lib/utils';

interface BusinessInfoTabProps {
  onContinue?: () => void;
}

type Option = { value: string; label: string };

const LOGO_ACCEPT = 'image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg';
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

function validateLogo(file: File): string | null {
  const name = file.name.toLowerCase();
  const okType = /^image\/(png|jpe?g)$/.test(file.type) || /\.(png|jpe?g)$/.test(name);
  if (!okType) return 'This file type is not allowed for this upload.';
  if (file.size > LOGO_MAX_BYTES) return 'File must be 5MB or smaller.';
  return null;
}

/** Option list as a styled select; shows "Loading…" until the options arrive. */
function OptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  loading,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  loading: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={loading}>
      <SelectTrigger id={id} className={cn(fieldControlClass, 'data-[placeholder]:text-gray-400')}>
        <SelectValue placeholder={loading ? 'Loading…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const BusinessInfoTab: React.FC<BusinessInfoTabProps> = ({ onContinue }) => {
  const { merchantBusinessSurvey: formData, setMerchantBusinessSurvey } = useComplianceForm();

  const [businessTypeOptions, setBusinessTypeOptions] = useState<Option[]>([]);
  const [industryTypeOptions, setIndustryTypeOptions] = useState<Option[]>([]);
  const [businessModelOptions, setBusinessModelOptions] = useState<Option[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      ComplianceService.getBusinessTypeOptions(),
      ComplianceService.getIndustryTypeOptions(),
      ComplianceService.getBusinessModelOptions(),
    ])
      .then(([types, industries, models]) => {
        if (cancelled) return;
        const fallback = [{ value: 'Other', label: 'Other' }];
        setBusinessTypeOptions(Array.isArray(types) && types.length > 0 ? types : fallback);
        setIndustryTypeOptions(Array.isArray(industries) && industries.length > 0 ? industries : fallback);
        setBusinessModelOptions(Array.isArray(models) && models.length > 0 ? models : fallback);
      })
      .catch(() => {
        if (cancelled) return;
        setBusinessTypeOptions([{ value: 'Other', label: 'Other' }]);
        setIndustryTypeOptions([{ value: 'Other', label: 'Other' }]);
        setBusinessModelOptions([{ value: 'Other', label: 'Other' }]);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setMerchantBusinessSurvey((prev) => ({ ...prev, [field]: value }));
  };

  // Shown without the scheme; stored with it (the scheme is added as the user types).
  const websiteDisplay = (formData.website || '').replace(/^https?:\/\//, '');

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          icon={<ClipboardList />}
          title="Business survey"
          description="Tell us what you’re building and who you serve."
        >
          <div className="space-y-5">
            <Field label="What do you want to create?" htmlFor="businessType">
              <OptionSelect
                id="businessType"
                value={formData.businessType}
                onChange={(val) => handleInputChange('businessType', val)}
                options={businessTypeOptions}
                placeholder="Select a business type"
                loading={optionsLoading}
              />
            </Field>

            <Field label="Where is your user base?" hint="Search by country name, code or dial code.">
              <CountrySelect
                value={formData.userBase}
                onValueChange={(val) => handleInputChange('userBase', val)}
                placeholder="Select a country"
                triggerClassName={fieldControlClass}
              />
            </Field>

            <Field label="What is your business model?" htmlFor="businessModel">
              <OptionSelect
                id="businessModel"
                value={formData.businessModel}
                onChange={(val) => handleInputChange('businessModel', val)}
                options={businessModelOptions}
                placeholder="Select a business model"
                loading={optionsLoading}
              />
            </Field>

            <Field
              label="Monthly processed volume"
              htmlFor="monthlyVolume"
              hint="Shown in the currency of your country of incorporation."
            >
              <CurrencyVolumeField
                id="monthlyVolume"
                value={formData.monthlyVolume}
                onChange={(val) => handleInputChange('monthlyVolume', val)}
                countryCode={formData.country || formData.userBase}
                className={fieldControlClass}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={<Building2 />} title="About the business" description="Your registered company details.">
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Industry" htmlFor="industry">
                <OptionSelect
                  id="industry"
                  value={formData.industry}
                  onChange={(val) => handleInputChange('industry', val)}
                  options={industryTypeOptions}
                  placeholder="Select industry"
                  loading={optionsLoading}
                />
              </Field>

              <Field label="Country of incorporation">
                <CountrySelect
                  value={formData.country}
                  onValueChange={(val) => handleInputChange('country', val)}
                  placeholder="Select a country"
                  triggerClassName={fieldControlClass}
                />
              </Field>
            </div>

            <Field label="Business name" htmlFor="businessName">
              <input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                placeholder="e.g. Acme Payments Ltd"
                className={fieldControlClass}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Website" htmlFor="website">
                <div className="flex h-11 overflow-hidden rounded-lg border border-gray-300 bg-white shadow-xs transition-[color,box-shadow] focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/20 hover:border-gray-400">
                  <span className="flex items-center gap-1.5 border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                    <Globe className="size-4" />
                    https://
                  </span>
                  <input
                    id="website"
                    type="text"
                    inputMode="url"
                    value={websiteDisplay}
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = val.startsWith('https://') || val.startsWith('http://') ? val : WEBSITE_URL_PREFIX + val;
                      handleInputChange('website', next);
                    }}
                    placeholder="example.com"
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </Field>

              <Field label="Company registration ID" htmlFor="companyRegId">
                <input
                  id="companyRegId"
                  value={formData.companyRegId}
                  onChange={(e) => handleInputChange('companyRegId', e.target.value)}
                  placeholder="e.g. RC1234567"
                  className={fieldControlClass}
                />
              </Field>
            </div>

            {/* BVN field intentionally disabled for current compliance flow */}

            <Field label="Company logo">
              <DocumentDropTile
                id="company-logo"
                title="Company logo"
                hint="PNG or JPG · Max. 5MB"
                accept={LOGO_ACCEPT}
                file={logoFile}
                validate={validateLogo}
                onFile={setLogoFile}
              />
            </Field>
          </div>
        </SectionCard>
      </div>

      <StepFooter hint="You can come back and edit these details before submitting your documents.">
        <BrandButton
          onClick={() => {
            toast.success('✅ Business info saved successfully');
            // Navigate to next tab
            if (onContinue) {
              setTimeout(() => onContinue(), 500);
            }
          }}
        >
          Save &amp; continue
          <ArrowRight className="size-4" />
        </BrandButton>
      </StepFooter>
    </div>
  );
};

export default BusinessInfoTab;
