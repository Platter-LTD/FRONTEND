// Product API helper functions with authentication

import { getAccessToken } from '@/lib/cookieAuth';
import { plataAuthFetch } from '@/lib/plataAuthFetch';
import {
  extractProductFromResponse,
  mapProductToConfigurationView,
  resolveProductIdFromAppProducts,
} from '@/lib/productDetailView';
import { normalizeOtherRequirementContentTypeForApi } from '@/lib/otherRequirementPayload';

const decodeTokenMerchantId = (token: string | null): string | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || '')) as Record<string, unknown>;
    const candidates = [
      payload.userMerchantId,
      payload.user_merchant_id,
      payload.merchantId,
      payload.merchant_id,
      (payload.user as Record<string, unknown> | undefined)?.merchantId,
      (payload.user as Record<string, unknown> | undefined)?.merchant_id,
      payload.userId,
      payload.id,
      payload.sub,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c.trim();
    }
    return null;
  } catch {
    return null;
  }
};

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  const merchantId = decodeTokenMerchantId(token);
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(merchantId && { 'x-merchant-id': merchantId, 'x-user-merchant-id': merchantId }),
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

const parseSavingsAmountNumber = (value: any): number | undefined => {
  if (value === '' || value == null) return undefined;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

/** Resolve equityContribution for loan/mortgage PUT (top-level + structure). */
const resolveEquityContribution = (configuration: any): number | undefined => {
  const explicit = parseSavingsAmountNumber(configuration?.equityContribution);
  if (explicit !== undefined) return explicit;

  const eqLabel = String(configuration?.equityRequirement ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
  if (!eqLabel) return undefined;

  if (eqLabel.includes('fixed') && eqLabel.includes('amount')) {
    return parseSavingsAmountNumber(configuration?.equityFixedAmount);
  }
  if (eqLabel.includes('percentage') || (eqLabel.includes('percent') && eqLabel.includes('based'))) {
    const pctRaw = String(configuration?.equityPercentage ?? '').replace(/%/g, '');
    return parseSavingsAmountNumber(pctRaw);
  }
  if (eqLabel.includes('zero') && eqLabel.includes('down')) {
    return 0;
  }
  return undefined;
};

const mapForcefulWithdrawalPenaltiesForApi = (list: any[]) =>
  list.map((p) =>
    compactObject({
      name: p?.name,
      penaltyType: p?.penaltyType ?? p?.type,
      value: p?.value != null ? String(p.value) : undefined,
      ...(p?.triggerDuration ? { triggerDuration: p.triggerDuration } : {}),
    }),
  );

/** Map multi-select security labels to Product MS mortgage `requirements.security` booleans. */
const mortgageSecurityBooleansFromSelection = (selected: string[]) => {
  let realEstateProperties = false;
  let bankGuarantee = false;
  for (const raw of selected) {
    const s = String(raw).toLowerCase().replace(/\s+/g, ' ');
    if (s.includes('bank') && s.includes('guarantee')) {
      bankGuarantee = true;
      continue;
    }
    if (s.includes('real estate') || /\bpropert(y|ies)\b/.test(s) || s.includes('collateral')) {
      realEstateProperties = true;
    }
  }
  return { realEstateProperties, bankGuarantee };
};

/** Map loan security multi-select labels to Product MS `requirements.security` booleans. */
const loanSecurityBooleansFromSelection = (selected: string[]) => {
  let guarantor = false;
  let savingsAccount = false;
  let noSecurity = false;
  for (const raw of selected) {
    const s = String(raw).toLowerCase().replace(/\s+/g, ' ');
    if (s.includes('guarantor')) guarantor = true;
    else if (s.includes('savings') && s.includes('account')) savingsAccount = true;
    else if (
      s.includes('no security') ||
      s.includes('no collateral') ||
      (s.includes('none') && s.includes('security'))
    ) {
      noSecurity = true;
    }
  }
  return { guarantor, savingsAccount, noSecurity };
};

const parseTriggerDurationDays = (v: any): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  const m = String(v).match(/(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const mapLateRepaymentPenaltiesForLoan = (list: any[]) =>
  list.map((p) =>
    compactObject({
      name: p?.name,
      penaltyType: p?.penaltyType ?? p?.type,
      value: p?.value != null ? String(p.value) : undefined,
      triggerDurationDays: parseTriggerDurationDays(p?.triggerDurationDays ?? p?.triggerDuration),
    }),
  );

const mapDocumentsToDownloadForLoan = (raw: any): any[] | undefined => {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const rows = raw
    .map((d: any) =>
      compactObject({
        name: d?.name,
        fileUrl:
          typeof d?.fileUrl === 'string' && d.fileUrl.trim()
            ? d.fileUrl.trim()
            : typeof d?.url === 'string' && d.url.trim()
              ? d.url.trim()
              : undefined,
      }),
    )
    .filter((r) => r && Object.keys(r).length);
  return rows.length ? rows : undefined;
};

const mapOtherRequirementsForLoanApi = (items: any[]) => {
  if (!Array.isArray(items) || !items.length) return undefined;
  return items.map((r: any) => {
    const ctRaw = String(r?.contentType ?? '');
    const contentType = normalizeOtherRequirementContentTypeForApi(ctRaw, {
      hasFile: !!(r?.fileBase64 || r?.templateFileUrl),
    });
    return compactObject({
      requirementType: r?.requirementType ?? r?.type,
      contentType,
      description: r?.description,
      uploadRequired:
        r?.uploadRequired === true ||
        r?.uploadRequired === 'true' ||
        !!r?.fileBase64 ||
        !!r?.templateFileUrl,
      templateFileUrl:
        typeof r?.templateFileUrl === 'string' && r.templateFileUrl.trim()
          ? r.templateFileUrl.trim()
          : typeof r?.url === 'string' && r.url.trim() && contentType && contentType.includes('template')
            ? r.url.trim()
            : undefined,
    });
  });
};

const buildLoanStructure = (configuration: any) => {
  const ir = configuration?.interestRate;
  const interestRate =
    typeof ir === 'string'
      ? ir.replace(/%/g, '').trim()
      : ir != null
        ? String(ir).replace(/%/g, '').trim()
        : '';
  const imRaw = configuration?.interestMethod;
  const interestMethod =
    typeof imRaw === 'string' && imRaw.trim() ? toEnum(imRaw) || imRaw.trim() : '';
  const allowMoratorium = toBool(configuration?.allowMoratorium ?? configuration?.moratoriumEnabled);
  const moratoriumType = allowMoratorium
    ? mapMoratoriumType(configuration?.moratoriumType)
    : undefined;
  const moratoriumStr = allowMoratorium
    ? String(
        configuration?.moratorium ??
          configuration?.moratoriumSelectDuration ??
          configuration?.moratoriumDurationOf ??
          configuration?.moratoriumDays ??
          '',
      ).trim()
    : '';
  const moratorium = allowMoratorium ? normalizeMoratoriumForApi(moratoriumStr) : undefined;
  const rw = mapRepaymentWorkflow(configuration?.repaymentWorkflow);
  const minL = parseSavingsAmountNumber(configuration?.minLoanAmount);
  const maxL = parseSavingsAmountNumber(configuration?.maxLoanAmount);
  const loanAmount = compactObject({ min: minL, max: maxL });
  const sched = configuration?.repaymentSchedule;
  const repaymentSchedule =
    typeof sched === 'string' && sched.trim() ? toEnum(sched) || sched.trim() : '';
  const rf = configuration?.repaymentFrequency;
  const repaymentFrequency = typeof rf === 'string' && rf.trim() ? rf.trim() : '';
  const npa = configuration?.acceptableNPA ?? configuration?.acceptableNpa;
  const acceptableNPA =
    typeof npa === 'string' && npa.trim()
      ? npa.replace(/%/g, '').trim()
      : npa != null
        ? String(npa)
        : '';
  const eq = configuration?.equityRequirement;
  const equityRequirement =
    typeof eq === 'string' && eq.trim() ? toEnum(eq) || eq.trim() : '';
  const equityContribution = resolveEquityContribution(configuration);
  const equityFixedAmount = parseSavingsAmountNumber(configuration?.equityFixedAmount);
  const equityPercentage = parseSavingsAmountNumber(
    String(configuration?.equityPercentage ?? '').replace(/%/g, ''),
  );

  return compactObject({
    interestRate: interestRate || undefined,
    interestMethod: interestMethod || undefined,
    amortizationSchedule: (() => {
      const am =
        configuration?.amortizationSchedule ??
        configuration?.amortization ??
        configuration?.amortizationType
      return typeof am === 'string' && am.trim() ? toEnum(am) || am.trim() : undefined
    })(),
    allowMoratorium,
    autoApproveLoans: toBool(configuration?.autoApproveLoans),
    ...(allowMoratorium && moratoriumType ? { moratoriumType } : {}),
    ...(allowMoratorium && moratorium !== undefined ? { moratorium } : {}),
    repaymentWorkflow: rw || undefined,
    ...(Object.keys(loanAmount).length ? { loanAmount } : {}),
    repaymentSchedule: repaymentSchedule || undefined,
    repaymentFrequency: repaymentFrequency || undefined,
    acceptableNPA: acceptableNPA || undefined,
    equityRequirement: equityRequirement || undefined,
    equityContribution,
    // Some Product MS validators read these sibling fields for fixed/percentage modes.
    ...(equityFixedAmount !== undefined ? { equityFixedAmount } : {}),
    ...(equityPercentage !== undefined ? { equityPercentage } : {}),
  });
};

const mapMortgagePropertiesForApi = (items: any[]) => {
  if (!Array.isArray(items)) return [];
  return items.map((p) => {
    const rawVal = p?.value;
    const valueNum =
      typeof rawVal === 'number' && Number.isFinite(rawVal)
        ? rawVal
        : parseSavingsAmountNumber(rawVal);
    const fromUploads = Array.isArray(p?.previewImages) ? p.previewImages : [];
    const imageUrls = (Array.isArray(p?.imageUrls) ? p.imageUrls : []).filter(
      (u: unknown) => typeof u === 'string' && u.trim().length > 0,
    );

    return compactObject({
      name: p?.name,
      propertyType: p?.propertyType ?? p?.type,
      value: valueNum,
      location: p?.location,
      propertyDescription: p?.propertyDescription ?? p?.description,
      facilities: Array.isArray(p?.facilities) && p.facilities.length ? p.facilities : undefined,
      customFacilities:
        Array.isArray(p?.customFacilities) && p.customFacilities.length ? p.customFacilities : undefined,
      imageUrls: imageUrls.length ? imageUrls : undefined,
      videoUrl: p?.videoUrl || undefined,
      ...(fromUploads.length ? { previewImages: fromUploads } : {}),
    });
  });
};

const mapFeesFromCharges = (raw: any[]) =>
  raw.map((c: any) =>
    compactObject({
      name: c?.name,
      feeType: c?.feeType,
      value: c?.value != null ? String(c.value) : undefined,
    }),
  );

const toBool = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

// Product MS validates structure.moratorium as object|number (not raw string labels).
const normalizeMoratoriumForApi = (raw: unknown): number | { value: string } | undefined => {
  if (raw === undefined || raw === null) return undefined;
  const str = String(raw).trim();
  if (!str) return undefined;
  const num = parseSavingsAmountNumber(str);
  if (num !== undefined && Number.isFinite(num) && num >= 0) return Math.round(num);
  return { value: str };
};

const mapCommodityPricesForApi = (rows: any[]) => {
  if (!Array.isArray(rows) || !rows.length) return undefined;
  const mapped = rows.map((r) =>
    compactObject({
      price: r?.price != null ? String(r.price).replace(/,/g, '') : undefined,
      date: r?.date != null ? String(r.date) : undefined,
      source: r?.source != null ? String(r.source) : undefined,
    }),
  );
  return mapped.length ? mapped : undefined;
};

const buildCommodityStructure = (configuration: any) => {
  const yieldRaw = configuration?.yieldMethod;
  const yieldMethod =
    typeof yieldRaw === 'string' && yieldRaw.trim() ? toEnum(yieldRaw) || yieldRaw.trim() : '';
  const offerYieldEnabled =
    configuration?.offerYieldEnabled !== undefined && configuration?.offerYieldEnabled !== null
      ? toBool(configuration.offerYieldEnabled)
      : toBool(configuration?.offerYieldOn);
  let offerYield = '';
  if (offerYieldEnabled) {
    offerYield = String(configuration?.offerYieldValue ?? configuration?.offerYield ?? '')
      .replace(/%/g, '')
      .trim();
  } else if (configuration?.offerYield != null && String(configuration.offerYield).trim() !== '') {
    offerYield = String(configuration.offerYield)
      .replace(/%/g, '')
      .trim();
  }
  const unitAmt =
    configuration?.unitAmount != null && String(configuration.unitAmount).trim() !== ''
      ? String(configuration.unitAmount).replace(/,/g, '')
      : '';
  const wdraw = configuration?.withdrawalFlexibility;
  const withdrawalFlexibility =
    typeof wdraw === 'string' && wdraw.trim() ? toEnum(wdraw) || wdraw.trim() : '';
  const minQ = parseSavingsAmountNumber(configuration?.minQuantityPurchase);
  const maxA = parseSavingsAmountNumber(configuration?.maxAmount);
  let moratoriumFinal: number | { value: string } | undefined;
  if (configuration?.moratoriumEnabled === false || configuration?.moratoriumEnabled === 'false') {
    moratoriumFinal = undefined;
  } else {
    moratoriumFinal = normalizeMoratoriumForApi(
      configuration?.moratoriumDays ?? configuration?.moratoriumDuration ?? configuration?.moratorium,
    );
  }

  return compactObject({
    yieldMethod: yieldMethod || undefined,
    offerYieldEnabled,
    ...(offerYield ? { offerYield } : {}),
    unitAmount: unitAmt || undefined,
    withdrawalFlexibility: withdrawalFlexibility || undefined,
    minQuantityPurchase:
      minQ !== undefined && Number.isFinite(minQ) ? Math.round(minQ) : undefined,
    maxAmount: maxA,
    commodityTermsAndCondition: configuration?.termsAndConditions,
    ...(moratoriumFinal !== undefined ? { moratorium: moratoriumFinal } : {}),
    contractId:
      typeof configuration?.contractId === 'string' && configuration.contractId.trim()
        ? configuration.contractId.trim()
        : undefined,
    airSignSecretKey:
      typeof configuration?.airSignSecretKey === 'string' && configuration.airSignSecretKey.trim()
        ? configuration.airSignSecretKey.trim()
        : undefined,
    airSignUid:
      typeof configuration?.airSignUid === 'string' && configuration.airSignUid.trim()
        ? configuration.airSignUid.trim()
        : undefined,
  });
};

const buildConfigurationPayload = (productType: string, configuration: any) => {
  const normalizedType = String(productType || '').toLowerCase();
  const isSavings = normalizedType.includes('savings');
  const isMortgage = normalizedType.includes('mortgage');
  const isInvestment = normalizedType.includes('investment');
  const isCommodity = normalizedType.includes('commodity');
  const isLoan = normalizedType.includes('loan') && !normalizedType.includes('mortgage');
  const durationValue =
    configuration?.durationOfSavings ?? configuration?.duration ?? configuration?.tenure;

  const common = compactObject({
    name: configuration?.name,
    description: configuration?.description,
    previewImage: configuration?.previewImage,
  });

  const previewAssetUrl =
    !configuration?.previewImage &&
    typeof configuration?.previewAssetUrl === 'string' &&
    configuration.previewAssetUrl.trim()
      ? configuration.previewAssetUrl.trim()
      : undefined;

  const about = compactObject(
    isSavings
      ? {
          duration: durationValue,
          savingsTypes: configuration?.savingsTypes,
          ...(previewAssetUrl ? { previewAssetUrl } : {}),
        }
      : isMortgage
        ? {
            tenure: configuration?.tenure ?? configuration?.mortgageTenure ?? durationValue,
            mortgageTypes: configuration?.mortgageTypes,
            ...(previewAssetUrl ? { previewAssetUrl } : {}),
          }
        : isInvestment
          ? {
              duration: String(
                configuration?.duration ?? configuration?.investmentTenure ?? durationValue ?? '',
              ).trim(),
              investmentTypes: configuration?.investmentTypes ?? configuration?.typeRows,
              ...(previewAssetUrl ? { previewAssetUrl } : {}),
            }
          : isLoan
            ? {
                tenure: String(
                  configuration?.tenure ?? configuration?.loanTenure ?? durationValue ?? '',
                ).trim(),
                loanTypes: configuration?.loanTypes ?? configuration?.typeRows,
                ...(previewAssetUrl ? { previewAssetUrl } : {}),
              }
            : isCommodity
              ? {
                  duration: String(
                    configuration?.duration ?? configuration?.commodityTenure ?? durationValue ?? '',
                  ).trim(),
                  commodityTypes: configuration?.commodityTypes ?? configuration?.typeRows,
                  ...(previewAssetUrl ? { previewAssetUrl } : {}),
                }
              : {
                  tenure: configuration?.tenure ?? durationValue,
                  loanTypes: configuration?.loanTypes,
                  mortgageTypes: configuration?.mortgageTypes,
                  savingsTypes: configuration?.savingsTypes,
                  commodityTypes:
                    configuration?.commodityTypes ??
                    (!normalizedType.includes('investment') ? configuration?.typeRows : undefined),
                  investmentTypes:
                    configuration?.investmentTypes ??
                    (normalizedType.includes('investment') ? configuration?.typeRows : undefined),
                  ...(previewAssetUrl ? { previewAssetUrl } : {}),
                },
  );

  let structure: Record<string, any>;

  if (isInvestment) {
    const invMin = parseSavingsAmountNumber(configuration?.minInvestmentAmount);
    const invMax = parseSavingsAmountNumber(
      configuration?.maxInvestmentAmount ?? configuration?.maxAmount,
    );
    const investmentAmountObj = compactObject({ min: invMin, max: invMax });
    const unitPriceRaw =
      configuration?.unitAmountPrice != null && String(configuration.unitAmountPrice).trim() !== ''
        ? String(configuration.unitAmountPrice).replace(/,/g, '')
        : configuration?.unitAmount != null && String(configuration.unitAmount).trim() !== ''
          ? String(configuration.unitAmount).replace(/,/g, '')
          : '';
    const minQtyRaw = configuration?.minQuantityPurchase;
    const minQtyParsed = parseSavingsAmountNumber(minQtyRaw);
    const minQty =
      minQtyParsed !== undefined && Number.isFinite(minQtyParsed) ? Math.round(minQtyParsed) : undefined;
    const moratoriumNum = configuration?.moratoriumEnabled
      ? parseSavingsAmountNumber(configuration?.moratoriumDays ?? configuration?.moratoriumDuration)
      : undefined;
    const moratoriumFallback = configuration?.moratoriumEnabled
      ? normalizeMoratoriumForApi(
          configuration?.moratoriumDays ?? configuration?.moratoriumDuration ?? configuration?.moratorium,
        )
      : undefined;
    let returnsOn = '';
    if (configuration?.offerYieldOn) {
      returnsOn = String(configuration?.offerYieldValue ?? '')
        .replace(/%/g, '')
        .trim();
    } else if (configuration?.returnsOnInvestment != null && configuration?.returnsOnInvestment !== '') {
      returnsOn = String(configuration.returnsOnInvestment)
        .replace(/%/g, '')
        .trim();
    }
    const interestMethodRaw = configuration?.interestMethod ?? configuration?.yieldMethod;
    const interestMethod =
      typeof interestMethodRaw === 'string' && interestMethodRaw.trim()
        ? toEnum(interestMethodRaw) || interestMethodRaw.trim()
        : '';
    const invTypeRaw =
      configuration?.investmentStructureType ??
      configuration?.structureInvestmentType ??
      configuration?.investmentType;
    const investmentType =
      typeof invTypeRaw === 'string' && invTypeRaw.trim()
        ? toEnum(invTypeRaw) || invTypeRaw.trim()
        : 'unit_based';
    const wdraw = configuration?.withdrawalFlexibility;
    const withdrawalFlexibility =
      typeof wdraw === 'string' && wdraw.trim() ? toEnum(wdraw) || wdraw.trim() : '';
    const unitObj = compactObject({
      amount: unitPriceRaw || undefined,
      minQuantity: minQty,
    });
    const enableUnit =
      configuration?.enableUnitInvestmentPurchase === false ||
      configuration?.enableUnitInvestmentPurchase === 'false' ||
      configuration?.enableUnitInvestment === false ||
      configuration?.enableUnitInvestment === 'false'
        ? false
        : configuration?.enableUnitInvestmentPurchase === true ||
            configuration?.enableUnitInvestmentPurchase === 'true' ||
            configuration?.enableUnitInvestment === true ||
            configuration?.enableUnitInvestment === 'true'
          ? true
          : Boolean(Object.keys(unitObj).length);
    structure = compactObject({
      returnsOnInvestment: returnsOn || undefined,
      interestMethod: interestMethod || undefined,
      investmentType,
      withdrawalFlexibility: withdrawalFlexibility || undefined,
      ...(Object.keys(investmentAmountObj).length ? { investmentAmount: investmentAmountObj } : {}),
      investmentTermsAndCondition: configuration?.termsAndConditions,
      enableUnitInvestmentPurchase: enableUnit,
      ...(moratoriumNum !== undefined && Number.isFinite(moratoriumNum) && moratoriumNum > 0
        ? { moratorium: Math.round(moratoriumNum) }
        : moratoriumFallback !== undefined
          ? { moratorium: moratoriumFallback }
          : {}),
      ...(Object.keys(unitObj).length ? { unitAmount: unitObj } : {}),
      contractId:
        typeof configuration?.contractId === 'string' && configuration.contractId.trim()
          ? configuration.contractId.trim()
          : undefined,
      airSignSecretKey:
        typeof configuration?.airSignSecretKey === 'string' && configuration.airSignSecretKey.trim()
          ? configuration.airSignSecretKey.trim()
          : undefined,
      airSignUid:
        typeof configuration?.airSignUid === 'string' && configuration.airSignUid.trim()
          ? configuration.airSignUid.trim()
          : undefined,
    });
  } else if (isCommodity) {
    structure = buildCommodityStructure(configuration);
  } else if (isLoan) {
    structure = buildLoanStructure(configuration);
  } else {
    const structureBase: Record<string, any> = {
      interestRate: configuration?.interestRate,
      interestMethod: configuration?.interestMethod,
      allowMoratorium: configuration?.allowMoratorium ?? configuration?.moratoriumEnabled,
      moratoriumDuration: configuration?.moratoriumDuration ?? configuration?.moratoriumDays,
      moratoriumSelectDuration: configuration?.moratoriumSelectDuration,
      moratoriumDurationOf: configuration?.moratoriumDurationOf,
      moratoriumType: mapMoratoriumType(configuration?.moratoriumType),
      repaymentWorkflow: mapRepaymentWorkflow(configuration?.repaymentWorkflow),
      // Mortgage uses repaymentStructure; keep repaymentSchedule only as a fallback for older drafts
      repaymentStructure:
        configuration?.repaymentStructure ??
        (isMortgage ? configuration?.repaymentSchedule : undefined),
      repaymentSchedule: isMortgage ? undefined : configuration?.repaymentSchedule,
      amortizationSchedule: configuration?.amortizationSchedule,
      repaymentFrequency: configuration?.repaymentFrequency,
      acceptableNPA: configuration?.acceptableNPA ?? configuration?.acceptableNpa,
      equityRequirement: configuration?.equityRequirement,
      savingsType: configuration?.savingsType,
      withdrawalFlexibility: configuration?.withdrawalFlexibility,
      minLoanAmount: isMortgage || isLoan ? undefined : configuration?.minLoanAmount,
      maxLoanAmount: isMortgage || isLoan ? undefined : configuration?.maxLoanAmount,
      minInvestmentAmount: configuration?.minInvestmentAmount ?? configuration?.unitAmount,
      maxInvestmentAmount: configuration?.maxInvestmentAmount ?? configuration?.maxAmount,
      minQuantityPurchase: configuration?.minQuantityPurchase,
      yieldMethod: configuration?.yieldMethod,
      offerYieldOn: configuration?.offerYieldOn,
      offerYieldValue: configuration?.offerYieldValue,
      termsAndConditions: configuration?.termsAndConditions,
      savingsTermsAndCondition: isSavings ? configuration?.termsAndConditions : undefined,
      contractId: configuration?.contractId,
      airSignSecretKey: configuration?.airSignSecretKey,
      airSignUid: configuration?.airSignUid,
    };

    if (!isSavings) {
      structureBase.minSavingsAmount = configuration?.minSavingsAmount;
      structureBase.maxSavingsAmount = configuration?.maxSavingsAmount;
    } else {
      const minN = parseSavingsAmountNumber(configuration?.minSavingsAmount);
      const maxN = parseSavingsAmountNumber(configuration?.maxSavingsAmount);
      const savingsAmount = compactObject({ min: minN, max: maxN });
      if (Object.keys(savingsAmount).length) structureBase.savingsAmount = savingsAmount;
    }

    if (isMortgage) {
      const minL = parseSavingsAmountNumber(configuration?.minLoanAmount);
      const maxL = parseSavingsAmountNumber(configuration?.maxLoanAmount);
      const loanAmount = compactObject({ min: minL, max: maxL });
      if (Object.keys(loanAmount).length) structureBase.loanAmount = loanAmount;
      if (typeof structureBase.interestRate === 'string') {
        structureBase.interestRate = structureBase.interestRate.replace(/%/g, '').trim();
      }
      if (configuration?.equityRequirement) {
        const eq = String(configuration.equityRequirement);
        structureBase.equityRequirement = toEnum(eq) || eq;
      }
      const mortgageEquity = resolveEquityContribution(configuration);
      if (mortgageEquity !== undefined) structureBase.equityContribution = mortgageEquity;
      const eqFixed = parseSavingsAmountNumber(configuration?.equityFixedAmount);
      if (eqFixed !== undefined) structureBase.equityFixedAmount = eqFixed;
      const eqPct = parseSavingsAmountNumber(
        String(configuration?.equityPercentage ?? '').replace(/%/g, ''),
      );
      if (eqPct !== undefined) structureBase.equityPercentage = eqPct;
    }

    structure = compactObject(structureBase);
  }

  const requirements = compactObject(
    isMortgage
      ? {
          security: compactObject(
            mortgageSecurityBooleansFromSelection(
              Array.isArray(configuration?.securityRequirements) ? configuration.securityRequirements : [],
            ),
          ),
          documentsToDownload: mapDocumentsToDownloadForLoan(
            configuration?.documentsToDownload ?? configuration?.documentRequirements,
          ),
          otherRequirements: mapOtherRequirementsForLoanApi(configuration?.otherRequirements ?? []),
          contractId: configuration?.contractId,
          airSignSecretKey: configuration?.airSignSecretKey,
          airSignUid: configuration?.airSignUid,
        }
      : isLoan
        ? {
            security: compactObject(
              loanSecurityBooleansFromSelection(
                Array.isArray(configuration?.securityRequirements) ? configuration.securityRequirements : [],
              ),
            ),
            documentsToDownload: mapDocumentsToDownloadForLoan(
              configuration?.documentsToDownload ?? configuration?.documentRequirements,
            ),
            otherRequirements: mapOtherRequirementsForLoanApi(configuration?.otherRequirements ?? []),
            contractId: configuration?.contractId,
            airSignSecretKey: configuration?.airSignSecretKey,
            airSignUid: configuration?.airSignUid,
          }
        : undefined,
  );

  const loanLikeFeeToggles = () =>
    compactObject({
      fees: (() => {
        const raw = configuration?.charges ?? configuration?.fees ?? [];
        if (!Array.isArray(raw) || !raw.length) return undefined;
        return mapFeesFromCharges(raw);
      })(),
      deductAllChargesOnLoan: (() => {
        const customerPays =
          configuration?.customerPaysChargesBeforeDisbursement === true ||
          configuration?.customerPaysChargesBeforeDisbursement === 'true' ||
          configuration?.customerPayChargesBeforeDisbursement === true ||
          configuration?.chargePaymentMode === 'customer-pay' ||
          configuration?.chargePaymentMode === 'customer_pay';
        if (customerPays) return false;
        if (configuration?.deductAllChargesOnLoan === false || configuration?.deductAllChargesOnLoan === 'false')
          return false;
        if (configuration?.deductChargesOnLoan === false || configuration?.deductChargesOnLoan === 'false')
          return false;
        return true;
      })(),
      customerPaysChargesBeforeDisbursement:
        configuration?.customerPaysChargesBeforeDisbursement === true ||
        configuration?.customerPaysChargesBeforeDisbursement === 'true' ||
        configuration?.customerPayChargesBeforeDisbursement === true ||
        configuration?.chargePaymentMode === 'customer-pay' ||
        configuration?.chargePaymentMode === 'customer_pay',
      lateRepayment: compactObject({
        enabled: !(
          configuration?.enableLateRepaymentCharges === false ||
          configuration?.enableLateRepaymentCharges === 'false'
        ),
        penalties: (() => {
          const raw =
            configuration?.penalties ??
            configuration?.lateRepayment?.penalties ??
            configuration?.lateRepaymentPenalties ??
            [];
          const mapped = Array.isArray(raw) ? mapLateRepaymentPenaltiesForLoan(raw) : [];
          return mapped.length ? mapped : undefined;
        })(),
      }),
    });

  const feesAndCharges = compactObject(
    isSavings
      ? {
          fees: (() => {
            const raw = configuration?.charges ?? configuration?.fees ?? [];
            if (!Array.isArray(raw) || !raw.length) return undefined;
            return mapFeesFromCharges(raw);
          })(),
          chargeForForcefulWithdrawal:
            configuration?.chargeForForcefulWithdrawal ?? configuration?.chargeForcefulWithdrawal,
          forcefulWithdrawalPenalties: (() => {
            const raw = configuration?.withdrawalPenalties ?? configuration?.penalties ?? [];
            const mapped = Array.isArray(raw) ? mapForcefulWithdrawalPenaltiesForApi(raw) : [];
            return mapped.length ? mapped : undefined;
          })(),
        }
      : isMortgage || isLoan
        ? loanLikeFeeToggles()
        : isCommodity
          ? {
              fees: (() => {
                const raw = configuration?.charges ?? configuration?.fees ?? [];
                if (!Array.isArray(raw) || !raw.length) return undefined;
                return mapFeesFromCharges(raw);
              })(),
              chargeForForcefulWithdrawal:
                configuration?.chargeForForcefulWithdrawal ?? configuration?.chargeForcefulWithdrawal,
              forcefulWithdrawalPenalties: (() => {
                const raw = configuration?.withdrawalPenalties ?? configuration?.penalties ?? [];
                const mapped = Array.isArray(raw) ? mapForcefulWithdrawalPenaltiesForApi(raw) : [];
                return mapped.length ? mapped : undefined;
              })(),
            }
        : isInvestment
          ? {
              fees: (() => {
                const raw = configuration?.charges ?? configuration?.fees ?? [];
                if (!Array.isArray(raw) || !raw.length) return undefined;
                return mapFeesFromCharges(raw);
              })(),
              chargeForForcefulWithdrawal:
                configuration?.chargeForForcefulWithdrawal ?? configuration?.forcefulWithdrawal,
              forcefulWithdrawalPenalties: (() => {
                const raw = configuration?.penalties ?? configuration?.withdrawalPenalties ?? [];
                const mapped = Array.isArray(raw) ? mapForcefulWithdrawalPenaltiesForApi(raw) : [];
                return mapped.length ? mapped : undefined;
              })(),
              contractId: configuration?.contractId,
              airSignSecretKey: configuration?.airSignSecretKey,
              airSignUid: configuration?.airSignUid,
            }
          : {
              charges: configuration?.charges,
              penalties: configuration?.penalties ?? configuration?.withdrawalPenalties,
              chargePaymentMode: configuration?.chargePaymentMode,
              deductChargesOnLoan: configuration?.deductChargesOnLoan,
              customerPayChargesBeforeDisbursement: configuration?.customerPayChargesBeforeDisbursement,
              enableLateRepaymentCharges: configuration?.enableLateRepaymentCharges,
              chargeForcefulWithdrawal: configuration?.chargeForcefulWithdrawal ?? configuration?.forcefulWithdrawal,
            },
  );

  const normalizedProperties = isMortgage
    ? mapMortgagePropertiesForApi(configuration?.properties ?? [])
    : Array.isArray(configuration?.properties)
      ? configuration.properties
      : [];

  // Product MS validates equityContribution at the document root (loan + mortgage).
  const equityContributionTopLevel = isLoan || isMortgage
    ? resolveEquityContribution(configuration)
    : undefined;

  const mortgageTopLevel = isMortgage
    ? compactObject({
        equityContribution: equityContributionTopLevel,
        propertyValue: parseSavingsAmountNumber(configuration?.propertyValue),
        mortgageWorkflowStepOrder: Array.isArray(configuration?.mortgageWorkflowStepOrder)
          ? configuration.mortgageWorkflowStepOrder
          : undefined,
        inspectionDates: Array.isArray(configuration?.inspectionDates)
          ? configuration.inspectionDates
              .map((slot: Record<string, unknown>) => {
                const scheduledFor = String(slot?.scheduledFor ?? "").trim()
                if (!scheduledFor) return null
                const label = String(slot?.label ?? "").trim().slice(0, 200)
                const location = String(slot?.location ?? "").trim().slice(0, 300)
                const notes = String(slot?.notes ?? "").trim().slice(0, 500)
                return compactObject({
                  scheduledFor,
                  label: label || undefined,
                  location: location || undefined,
                  notes: notes || undefined,
                })
              })
              .filter(Boolean)
          : undefined,
      })
    : {};

  const loanTopLevel = isLoan
    ? compactObject({
        equityContribution: equityContributionTopLevel,
      })
    : {};

  const commodityPriceRows = configuration?.commodityPrices ?? configuration?.priceHistory ?? [];
  const commodityPricesNormalized = isCommodity ? mapCommodityPricesForApi(commodityPriceRows) : undefined;

  const commodityTopLevel = isCommodity
    ? compactObject({
        price: (() => {
          const explicit = parseSavingsAmountNumber(configuration?.price ?? configuration?.latestPrice);
          if (explicit !== undefined) return explicit;
          if (Array.isArray(commodityPriceRows) && commodityPriceRows.length) {
            const last = commodityPriceRows[commodityPriceRows.length - 1];
            return parseSavingsAmountNumber(last?.price);
          }
          return undefined;
        })(),
        minimumQuantity: (() => {
          const m = parseSavingsAmountNumber(
            configuration?.minimumQuantity ?? configuration?.minQuantityPurchase,
          );
          return m !== undefined && Number.isFinite(m) ? Math.round(m) : undefined;
        })(),
        unitOfMeasure:
          typeof configuration?.unitOfMeasure === 'string' && configuration.unitOfMeasure.trim()
            ? configuration.unitOfMeasure.trim()
            : undefined,
        config: (() => {
          const c = configuration?.config;
          if (c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length) return c;
          const cf = configuration?.compoundingFrequency;
          if (typeof cf === 'string' && cf.trim()) {
            const normalized = toEnum(cf) || cf.trim();
            return compactObject({ compoundingFrequency: normalized });
          }
          return undefined;
        })(),
      })
    : {};

  return compactObject({
    ...common,
    // Platform default false — only send true when merchant opts in.
    requireApplicantSignature: toBool(configuration?.requireApplicantSignature),
    about,
    structure,
    ...(requirements && Object.keys(requirements).length ? { requirements } : {}),
    feesAndCharges,
    ...(isMortgage ? { properties: normalizedProperties } : {}),
    ...(commodityPricesNormalized ? { commodityPrices: commodityPricesNormalized } : {}),
    ...loanTopLevel,
    ...mortgageTopLevel,
    ...commodityTopLevel,
  });
};

export const productApi = {
  async getProductOverview(appId: string, signal?: AbortSignal) {
    const response = await plataAuthFetch(
      `/api/v1/products/app/${encodeURIComponent(appId)}/product-overview`,
      { headers: getAuthHeaders(), signal },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to fetch product overview');
    }
    return data;
  },

  async getProductOverviewByType(appId: string, productType: string, signal?: AbortSignal) {
    const type = encodeURIComponent(String(productType || '').trim().toUpperCase());
    const response = await plataAuthFetch(
      `/api/v1/products/app/${encodeURIComponent(appId)}/product-overview/by-type/${type}`,
      { headers: getAuthHeaders(), signal },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to fetch product overview by type');
    }
    return data;
  },

  async getProductApplications(params?: { appId?: string; userId?: string; limit?: number; skip?: number }) {
    const q = new URLSearchParams();
    if (params?.appId) q.set("appId", params.appId);
    if (params?.userId) q.set("userId", params.userId);
    if (typeof params?.limit === "number") q.set("limit", String(params.limit));
    if (typeof params?.skip === "number") q.set("skip", String(params.skip));

    const path = `/api/v1/products/applications${q.toString() ? `?${q.toString()}` : ""}`;
    const response = await fetch(path, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as { error?: string }).error || "Failed to fetch product applications");
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
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to fetch products');
    }

    return data;
  },

  // Get product by ID — Product MS GET /api/v1/products/:id (proxied)
  async getProductById(productId: string) {
    const response = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
      headers: getAuthHeaders(),
    });

    const raw = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((raw as { error?: string }).error || (raw as { message?: string }).message || 'Failed to fetch product');
    }

    const product = extractProductFromResponse(raw);
    if (!product) {
      throw new Error('Invalid product response');
    }

    return { success: true as const, data: product };
  },

  /**
   * Resolves URL slug (Mongo id, referenceNumber, or name) against app products, then loads
   * GET /api/v1/products/:id. Use on product detail pages.
   */
  async getProductDetailForApp(appId: string, slugOrId: string) {
    const headers = getAuthHeaders();

    const fetchProduct = async (id: string) => {
      const res = await fetch(`/api/v1/products/${encodeURIComponent(id)}`, { headers });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    };

    let { res, json } = await fetchProduct(slugOrId);
    let product = extractProductFromResponse(json);

    if (!res.ok || !product) {
      const appRes = await fetch(`/api/v1/products/app/${encodeURIComponent(appId)}`, { headers });
      const appJson = await appRes.json().catch(() => ({}));
      const rows = Array.isArray(appJson?.data) ? appJson.data : [];
      const resolved = resolveProductIdFromAppProducts(rows, slugOrId);
      if (resolved) {
        const second = await fetchProduct(resolved);
        res = second.res;
        json = second.json;
        product = extractProductFromResponse(json);
      }
    }

    if (!res.ok) {
      return {
        success: false as const,
        data: null,
        configuration: null,
        error: (json as { error?: string }).error || (json as { message?: string }).message || 'Failed to fetch product',
      };
    }

    if (!product) {
      return {
        success: false as const,
        data: null,
        configuration: null,
        error: 'Product not found',
      };
    }

    return {
      success: true as const,
      data: product,
      configuration: mapProductToConfigurationView(product),
      error: undefined as string | undefined,
    };
  },

  // Update product
  async updateProduct(productId: string, updates: any) {
    const response = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update product');
    }

    return data;
  },

  // Manage product (status-gated edit path for complete products)
  async manageProduct(productId: string, updates: any) {
    const response = await fetch(`/api/v1/products/${encodeURIComponent(productId)}/manage`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to manage product');
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

  // Tab-shaped view derived from Product MS document (about / structure / feesAndCharges)
  async getProductConfiguration(productId: string) {
    try {
      const { data } = await this.getProductById(productId);
      const mapped = mapProductToConfigurationView(data as Record<string, unknown>);
      return { success: true as const, data: mapped };
    } catch {
      return { success: false as const, data: null };
    }
  },

  // Create or update product configuration
  async saveProductConfiguration(productId: string, productType: string, configuration: any) {
    const payload = buildConfigurationPayload(productType, configuration);
    const response = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save configuration');
    }

    return data;
  },

  // Save configuration through /manage endpoint (for complete products)
  async saveProductConfigurationWithManage(productId: string, productType: string, configuration: any) {
    const payload = buildConfigurationPayload(productType, configuration);
    const response = await fetch(`/api/v1/products/${encodeURIComponent(productId)}/manage`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
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
      credentials: 'include',
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
