"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Banknote,
  Home,
  Package,
  PiggyBank,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Theme                                                                      */
/* -------------------------------------------------------------------------- */

const CARD = "rounded-xl border border-[#E7E5E0] bg-white"
const HEADING = "text-base font-medium text-[#1C1917]"
const APPROVE_BUTTON =
  "rounded-lg bg-[#B08D57] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#96723F]"
const OUTLINE_BUTTON =
  "rounded-lg border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#78716C] transition-colors hover:bg-[#FAFAF9]"
const REVIEW_BUTTON =
  "rounded-lg border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#96723F] transition-colors hover:bg-[#F7EEDD]"

type Tone = "success" | "muted" | "warning" | "danger" | "gold" | "info"

const TONE_DOT: Record<Tone, string> = {
  success: "bg-[#1D9E75]",
  muted: "bg-[#A8A29E]",
  warning: "bg-[#C9852E]",
  danger: "bg-[#C0392B]",
  gold: "bg-[#B08D57]",
  info: "bg-[#2563EB]",
}

const TONE_NOTE: Record<Tone, string> = {
  success: "text-[#157F5E]",
  muted: "text-[#78716C]",
  warning: "text-[#A9701F]",
  danger: "text-[#B3372C]",
  gold: "text-[#96723F]",
  info: "text-[#1D4ED8]",
}

const TONE_BADGE: Record<Tone, string> = {
  success: "bg-[rgba(29,158,117,0.12)] text-[#157F5E]",
  muted: "bg-[rgba(120,113,108,0.12)] text-[#57534E]",
  warning: "bg-[rgba(201,133,46,0.14)] text-[#A9701F]",
  danger: "bg-[rgba(192,57,43,0.12)] text-[#B3372C]",
  gold: "bg-[#F7EEDD] text-[#96723F]",
  info: "bg-[rgba(37,99,235,0.12)] text-[#1D4ED8]",
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type TabKey = "loan" | "mortgage" | "savings" | "investment" | "commodity"

type Column = { label: string; align?: "right" }
type Cell = string | { badge: string; tone: Tone }

type TableSpec = {
  id: string
  title: string
  description?: string
  columns: Column[]
  rows: Cell[][]
}

type KpiSpec = {
  id: string
  label: string
  value: string
  note: string
  tone: Tone
  drilldown?: TableSpec
  special?: "mortgage-savings"
}

type DueSpec = { label: string; note: string; amount: number }

type RequestStatus = "pending" | "approved" | "declined"

type RequestRow = {
  id: string
  reference: string
  customer: string
  detail: string
  amount: number
  requestedOn: string
  status: RequestStatus
}

type RequestTableSpec = {
  title: string
  description: string
  detailLabel: string
}

type TabSpec = {
  key: TabKey
  label: string
  icon: LucideIcon
  kpis: KpiSpec[]
  due?: DueSpec
  tables: TableSpec[]
  requests?: RequestTableSpec
}

type SavingsApplication = {
  id: string
  reference: string
  customer: string
  property: string
  target: number
  monthly: number
  tenure: string
  submittedOn: string
  status: "pending" | "approved" | "declined"
}

type SavingsPlan = {
  id: string
  reference: string
  customer: string
  property: string
  saved: number
  target: number
  monthly: number
  startedOn: string
}

type MissedSavingsPlan = {
  id: string
  reference: string
  customer: string
  missed: number
  lastPaidOn: string
  monthly: number
}

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function money(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function count(value: number) {
  return value.toLocaleString("en-NG")
}

/* -------------------------------------------------------------------------- */
/*  Mock data — loan                                                           */
/* -------------------------------------------------------------------------- */

const LOAN_KPIS: KpiSpec[] = [
  {
    id: "loan-active",
    label: "Active loan",
    value: "1,240",
    note: "+38 this month",
    tone: "success",
    drilldown: {
      id: "loan-active-table",
      title: "Active loan account",
      description: "Accounts currently repaying on schedule.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Principal", align: "right" },
        { label: "Outstanding", align: "right" },
        { label: "Next repayment" },
        { label: "Status" },
      ],
      rows: [
        [
          "LN-24817",
          "Adebayo Ogundimu",
          money(2_500_000),
          money(1_840_500),
          "04 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "LN-24802",
          "Chinwe Okonkwo",
          money(1_200_000),
          money(742_300),
          "05 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "LN-24788",
          "Ibrahim Musa",
          money(5_000_000),
          money(3_915_000),
          "06 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "LN-24771",
          "Folake Adeyemi",
          money(850_000),
          money(318_600),
          "07 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "LN-24759",
          "Emeka Nwosu",
          money(3_400_000),
          money(2_106_750),
          "08 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
      ],
    },
  },
  {
    id: "loan-inactive",
    label: "Inactive loan",
    value: "86",
    note: "Matured or closed",
    tone: "muted",
    drilldown: {
      id: "loan-inactive-table",
      title: "Inactive loan account",
      description: "Fully repaid or closed by the customer.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Principal", align: "right" },
        { label: "Closed on" },
        { label: "Status" },
      ],
      rows: [
        [
          "LN-24118",
          "Kelechi Obi",
          money(1_500_000),
          "12 Jul 2026",
          { badge: "Closed", tone: "muted" },
        ],
        [
          "LN-24096",
          "Halima Sani",
          money(640_000),
          "09 Jul 2026",
          { badge: "Closed", tone: "muted" },
        ],
        [
          "LN-24077",
          "Segun Adeleke",
          money(2_250_000),
          "06 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
        [
          "LN-24052",
          "Amaka Nnamdi",
          money(980_000),
          "03 Jul 2026",
          { badge: "Closed", tone: "muted" },
        ],
        [
          "LN-24031",
          "Suleiman Garba",
          money(1_100_000),
          "01 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
      ],
    },
  },
  {
    id: "loan-non-performing",
    label: "Non-performing loan",
    value: "34",
    note: "90+ days overdue",
    tone: "warning",
    drilldown: {
      id: "loan-non-performing-table",
      title: "Non-performing loan",
      description: "No repayment received for more than 90 days.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Outstanding", align: "right" },
        { label: "Days overdue", align: "right" },
        { label: "Status" },
      ],
      rows: [
        [
          "LN-23840",
          "Titilayo Ojo",
          money(1_860_400),
          "112",
          { badge: "Non-performing", tone: "warning" },
        ],
        [
          "LN-23815",
          "Chidi Anyanwu",
          money(945_200),
          "104",
          { badge: "Non-performing", tone: "warning" },
        ],
        [
          "LN-23790",
          "Zainab Lawal",
          money(2_410_000),
          "98",
          { badge: "Non-performing", tone: "warning" },
        ],
        [
          "LN-23764",
          "Obinna Eze",
          money(1_275_600),
          "95",
          { badge: "Non-performing", tone: "warning" },
        ],
        [
          "LN-23739",
          "Rukayat Adeniyi",
          money(688_900),
          "91",
          { badge: "Non-performing", tone: "warning" },
        ],
      ],
    },
  },
  {
    id: "loan-bad",
    label: "Bad loan",
    value: "12",
    note: "Written off",
    tone: "danger",
    drilldown: {
      id: "loan-bad-table",
      title: "Bad loan",
      description: "Removed from the book after recovery attempts failed.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Amount written off", align: "right" },
        { label: "Written off on" },
        { label: "Status" },
      ],
      rows: [
        [
          "LN-23402",
          "Nnamdi Okeke",
          money(2_150_000),
          "18 Jul 2026",
          { badge: "Written off", tone: "danger" },
        ],
        [
          "LN-23388",
          "Fatima Abubakar",
          money(760_500),
          "15 Jul 2026",
          { badge: "Written off", tone: "danger" },
        ],
        [
          "LN-23371",
          "Kunle Ajayi",
          money(1_480_000),
          "11 Jul 2026",
          { badge: "Written off", tone: "danger" },
        ],
        [
          "LN-23350",
          "Grace Etim",
          money(520_300),
          "08 Jul 2026",
          { badge: "Written off", tone: "danger" },
        ],
        [
          "LN-23327",
          "Musa Aliyu",
          money(1_905_000),
          "04 Jul 2026",
          { badge: "Written off", tone: "danger" },
        ],
      ],
    },
  },
]

const LOAN_TABLES: TableSpec[] = [
  {
    id: "loan-repayments",
    title: "Repayments",
    description: "Last 5 repayments received.",
    columns: [
      { label: "Reference" },
      { label: "Customer" },
      { label: "Amount", align: "right" },
      { label: "Received on" },
      { label: "Status" },
    ],
    rows: [
      [
        "LN-24817",
        "Adebayo Ogundimu",
        money(148_500),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "LN-24802",
        "Chinwe Okonkwo",
        money(92_750),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "LN-24788",
        "Ibrahim Musa",
        money(310_000),
        "27 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "LN-24771",
        "Folake Adeyemi",
        money(76_400),
        "27 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "LN-24759",
        "Emeka Nwosu",
        money(205_900),
        "26 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
    ],
  },
  {
    id: "loan-failed-repayments",
    title: "Failed repayment",
    description: "Last 5 repayment attempts that did not go through.",
    columns: [
      { label: "Reference" },
      { label: "Customer" },
      { label: "Amount", align: "right" },
      { label: "Attempted on" },
      { label: "Reason" },
      { label: "Status" },
    ],
    rows: [
      [
        "LN-24746",
        "Aisha Bello",
        money(118_200),
        "28 Jul 2026",
        "Insufficient funds",
        { badge: "Failed", tone: "danger" },
      ],
      [
        "LN-24733",
        "Tunde Bakare",
        money(64_800),
        "27 Jul 2026",
        "Card declined",
        { badge: "Failed", tone: "danger" },
      ],
      [
        "LN-24720",
        "Ngozi Eze",
        money(187_500),
        "27 Jul 2026",
        "Mandate expired",
        { badge: "Failed", tone: "danger" },
      ],
      [
        "LN-24705",
        "Yusuf Danjuma",
        money(95_300),
        "26 Jul 2026",
        "Insufficient funds",
        { badge: "Failed", tone: "danger" },
      ],
      [
        "LN-24692",
        "Bukola Salami",
        money(142_000),
        "25 Jul 2026",
        "Account frozen",
        { badge: "Failed", tone: "danger" },
      ],
    ],
  },
]

/* -------------------------------------------------------------------------- */
/*  Mock data — mortgage                                                       */
/* -------------------------------------------------------------------------- */

const MORTGAGE_KPIS: KpiSpec[] = [
  {
    id: "mortgage-active",
    label: "Active mortgage",
    value: "412",
    note: "+12 this month",
    tone: "success",
    drilldown: {
      id: "mortgage-active-table",
      title: "Active mortgage account",
      description: "Accounts currently repaying on schedule.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Property value", align: "right" },
        { label: "Outstanding", align: "right" },
        { label: "Next repayment" },
        { label: "Status" },
      ],
      rows: [
        [
          "MG-1042",
          "Adebayo Ogundimu",
          money(48_000_000),
          money(39_215_400),
          "05 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "MG-1038",
          "Chinwe Okonkwo",
          money(62_500_000),
          money(51_940_200),
          "05 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "MG-1031",
          "Ibrahim Musa",
          money(35_000_000),
          money(22_608_000),
          "06 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "MG-1024",
          "Folake Adeyemi",
          money(74_200_000),
          money(66_311_750),
          "07 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "MG-1019",
          "Emeka Nwosu",
          money(41_800_000),
          money(28_475_300),
          "08 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
      ],
    },
  },
  {
    id: "mortgage-inactive",
    label: "Inactive mortgage",
    value: "18",
    note: "Matured or closed",
    tone: "muted",
    drilldown: {
      id: "mortgage-inactive-table",
      title: "Inactive mortgage account",
      description: "Fully repaid, refinanced or closed.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Property value", align: "right" },
        { label: "Closed on" },
        { label: "Status" },
      ],
      rows: [
        [
          "MG-0914",
          "Kelechi Obi",
          money(28_000_000),
          "14 Jul 2026",
          { badge: "Closed", tone: "muted" },
        ],
        [
          "MG-0902",
          "Halima Sani",
          money(52_600_000),
          "10 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
        [
          "MG-0897",
          "Segun Adeleke",
          money(19_500_000),
          "07 Jul 2026",
          { badge: "Closed", tone: "muted" },
        ],
        [
          "MG-0881",
          "Amaka Nnamdi",
          money(44_300_000),
          "03 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
        [
          "MG-0876",
          "Suleiman Garba",
          money(31_750_000),
          "01 Jul 2026",
          { badge: "Closed", tone: "muted" },
        ],
      ],
    },
  },
  {
    id: "mortgage-non-performing",
    label: "Non-performing mortgage",
    value: "9",
    note: "90+ days overdue",
    tone: "warning",
    drilldown: {
      id: "mortgage-non-performing-table",
      title: "Non-performing mortgage",
      description: "No repayment received for more than 90 days.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Outstanding", align: "right" },
        { label: "Days overdue", align: "right" },
        { label: "Status" },
      ],
      rows: [
        [
          "MG-0842",
          "Titilayo Ojo",
          money(37_480_000),
          "126",
          { badge: "Non-performing", tone: "warning" },
        ],
        [
          "MG-0836",
          "Chidi Anyanwu",
          money(21_905_600),
          "108",
          { badge: "Non-performing", tone: "warning" },
        ],
        [
          "MG-0829",
          "Zainab Lawal",
          money(45_120_000),
          "97",
          { badge: "Non-performing", tone: "warning" },
        ],
        [
          "MG-0821",
          "Obinna Eze",
          money(18_640_250),
          "94",
          { badge: "Non-performing", tone: "warning" },
        ],
        [
          "MG-0815",
          "Rukayat Adeniyi",
          money(29_300_000),
          "91",
          { badge: "Non-performing", tone: "warning" },
        ],
      ],
    },
  },
  {
    id: "mortgage-bad",
    label: "Bad mortgage",
    value: "3",
    note: "Written off",
    tone: "danger",
    drilldown: {
      id: "mortgage-bad-table",
      title: "Bad mortgage",
      description: "Removed from the book after recovery attempts failed.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Amount written off", align: "right" },
        { label: "Written off on" },
        { label: "Status" },
      ],
      rows: [
        [
          "MG-0748",
          "Nnamdi Okeke",
          money(34_600_000),
          "16 Jul 2026",
          { badge: "Written off", tone: "danger" },
        ],
        [
          "MG-0731",
          "Fatima Abubakar",
          money(12_850_400),
          "09 Jul 2026",
          { badge: "Written off", tone: "danger" },
        ],
        [
          "MG-0722",
          "Kunle Ajayi",
          money(26_075_000),
          "02 Jul 2026",
          { badge: "Written off", tone: "danger" },
        ],
      ],
    },
  },
]

const MORTGAGE_TABLES: TableSpec[] = [
  {
    id: "mortgage-repayments",
    title: "Repayments",
    description: "Last 5 repayments received.",
    columns: [
      { label: "Reference" },
      { label: "Customer" },
      { label: "Amount", align: "right" },
      { label: "Received on" },
      { label: "Status" },
    ],
    rows: [
      [
        "MG-1042",
        "Adebayo Ogundimu",
        money(1_845_000),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "MG-1038",
        "Chinwe Okonkwo",
        money(2_410_500),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "MG-1031",
        "Ibrahim Musa",
        money(1_120_750),
        "27 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "MG-1024",
        "Folake Adeyemi",
        money(3_075_200),
        "26 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "MG-1019",
        "Emeka Nwosu",
        money(1_688_400),
        "26 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
    ],
  },
  {
    id: "mortgage-failed-repayments",
    title: "Failed repayment",
    description: "Last 5 repayment attempts that did not go through.",
    columns: [
      { label: "Reference" },
      { label: "Customer" },
      { label: "Amount", align: "right" },
      { label: "Attempted on" },
      { label: "Reason" },
      { label: "Status" },
    ],
    rows: [
      [
        "MG-1015",
        "Aisha Bello",
        money(2_240_000),
        "28 Jul 2026",
        "Insufficient funds",
        { badge: "Failed", tone: "danger" },
      ],
      [
        "MG-1008",
        "Tunde Bakare",
        money(1_396_500),
        "27 Jul 2026",
        "Mandate expired",
        { badge: "Failed", tone: "danger" },
      ],
      [
        "MG-0996",
        "Ngozi Eze",
        money(3_180_000),
        "27 Jul 2026",
        "Insufficient funds",
        { badge: "Failed", tone: "danger" },
      ],
      [
        "MG-0987",
        "Yusuf Danjuma",
        money(1_742_300),
        "25 Jul 2026",
        "Bank timeout",
        { badge: "Failed", tone: "danger" },
      ],
      [
        "MG-0975",
        "Bukola Salami",
        money(2_508_900),
        "24 Jul 2026",
        "Account frozen",
        { badge: "Failed", tone: "danger" },
      ],
    ],
  },
]

const INITIAL_SAVINGS_APPLICATIONS: SavingsApplication[] = [
  {
    id: "mg-sv-318",
    reference: "MG-SV-318",
    customer: "Chinwe Okonkwo",
    property: "3-bedroom terrace, Lekki Phase 1",
    target: 12_000_000,
    monthly: 450_000,
    tenure: "24 months",
    submittedOn: "24 Jul 2026",
    status: "pending",
  },
  {
    id: "mg-sv-317",
    reference: "MG-SV-317",
    customer: "Ibrahim Musa",
    property: "Detached duplex, Gwarinpa",
    target: 18_500_000,
    monthly: 620_000,
    tenure: "30 months",
    submittedOn: "23 Jul 2026",
    status: "pending",
  },
  {
    id: "mg-sv-315",
    reference: "MG-SV-315",
    customer: "Folake Adeyemi",
    property: "2-bedroom flat, Yaba",
    target: 8_400_000,
    monthly: 280_000,
    tenure: "30 months",
    submittedOn: "22 Jul 2026",
    status: "pending",
  },
  {
    id: "mg-sv-312",
    reference: "MG-SV-312",
    customer: "Emeka Nwosu",
    property: "Semi-detached duplex, Enugu",
    target: 15_000_000,
    monthly: 500_000,
    tenure: "30 months",
    submittedOn: "21 Jul 2026",
    status: "pending",
  },
  {
    id: "mg-sv-309",
    reference: "MG-SV-309",
    customer: "Aisha Bello",
    property: "4-bedroom terrace, Wuse 2",
    target: 22_000_000,
    monthly: 730_000,
    tenure: "30 months",
    submittedOn: "20 Jul 2026",
    status: "pending",
  },
]

const INITIAL_SAVINGS_PLANS: SavingsPlan[] = [
  {
    id: "mg-sv-284",
    reference: "MG-SV-284",
    customer: "Tunde Bakare",
    property: "3-bedroom terrace, Ikeja GRA",
    saved: 6_300_000,
    target: 12_000_000,
    monthly: 450_000,
    startedOn: "12 Feb 2026",
  },
  {
    id: "mg-sv-271",
    reference: "MG-SV-271",
    customer: "Ngozi Eze",
    property: "Semi-detached duplex, Ajah",
    saved: 9_150_000,
    target: 15_000_000,
    monthly: 500_000,
    startedOn: "05 Jan 2026",
  },
  {
    id: "mg-sv-263",
    reference: "MG-SV-263",
    customer: "Yusuf Danjuma",
    property: "2-bedroom flat, Kaduna",
    saved: 2_480_000,
    target: 8_400_000,
    monthly: 280_000,
    startedOn: "18 Mar 2026",
  },
  {
    id: "mg-sv-248",
    reference: "MG-SV-248",
    customer: "Bukola Salami",
    property: "4-bedroom terrace, Maitama",
    saved: 16_720_000,
    target: 22_000_000,
    monthly: 730_000,
    startedOn: "22 Aug 2025",
  },
  {
    id: "mg-sv-236",
    reference: "MG-SV-236",
    customer: "Kelechi Obi",
    property: "Detached duplex, Port Harcourt",
    saved: 4_050_000,
    target: 18_500_000,
    monthly: 620_000,
    startedOn: "09 Apr 2026",
  },
]

const MISSED_SAVINGS_PLANS: MissedSavingsPlan[] = [
  {
    id: "mg-sv-198",
    reference: "MG-SV-198",
    customer: "Halima Sani",
    missed: 3,
    lastPaidOn: "18 Apr 2026",
    monthly: 280_000,
  },
  {
    id: "mg-sv-187",
    reference: "MG-SV-187",
    customer: "Segun Adeleke",
    missed: 4,
    lastPaidOn: "06 Mar 2026",
    monthly: 450_000,
  },
  {
    id: "mg-sv-176",
    reference: "MG-SV-176",
    customer: "Amaka Nnamdi",
    missed: 3,
    lastPaidOn: "12 Apr 2026",
    monthly: 620_000,
  },
]

/* -------------------------------------------------------------------------- */
/*  Mock data — savings, investment, commodity                                 */
/* -------------------------------------------------------------------------- */

const SAVINGS_KPIS: KpiSpec[] = [
  {
    id: "savings-active",
    label: "Active savings plan",
    value: "3,180",
    note: "+124 this month",
    tone: "success",
    drilldown: {
      id: "savings-active-table",
      title: "Active savings plan",
      description: "Plans contributing on schedule.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Plan" },
        { label: "Balance", align: "right" },
        { label: "Next contribution" },
        { label: "Status" },
      ],
      rows: [
        [
          "SV-8814",
          "Adebayo Ogundimu",
          "Flex save",
          money(1_248_500),
          "01 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "SV-8809",
          "Chinwe Okonkwo",
          "Target save",
          money(742_000),
          "01 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "SV-8796",
          "Ibrahim Musa",
          "Fixed save",
          money(3_500_000),
          "03 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "SV-8781",
          "Folake Adeyemi",
          "Flex save",
          money(318_600),
          "04 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "SV-8770",
          "Emeka Nwosu",
          "Target save",
          money(2_106_750),
          "05 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
      ],
    },
  },
  {
    id: "savings-inactive",
    label: "Inactive savings plan",
    value: "240",
    note: "Matured or withdrawn",
    tone: "muted",
    drilldown: {
      id: "savings-inactive-table",
      title: "Inactive savings plan",
      description: "Plans that matured or were fully withdrawn.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Plan" },
        { label: "Final balance", align: "right" },
        { label: "Closed on" },
        { label: "Status" },
      ],
      rows: [
        [
          "SV-8412",
          "Kelechi Obi",
          "Fixed save",
          money(1_950_000),
          "13 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
        [
          "SV-8398",
          "Halima Sani",
          "Flex save",
          money(486_300),
          "10 Jul 2026",
          { badge: "Closed", tone: "muted" },
        ],
        [
          "SV-8377",
          "Segun Adeleke",
          "Target save",
          money(1_204_800),
          "08 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
        [
          "SV-8361",
          "Amaka Nnamdi",
          "Flex save",
          money(275_900),
          "05 Jul 2026",
          { badge: "Closed", tone: "muted" },
        ],
        [
          "SV-8344",
          "Suleiman Garba",
          "Fixed save",
          money(3_100_000),
          "02 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
      ],
    },
  },
  {
    id: "savings-missed",
    label: "Missed contribution",
    value: "148",
    note: "Behind schedule",
    tone: "warning",
    drilldown: {
      id: "savings-missed-table",
      title: "Missed contribution",
      description: "Plans that skipped at least one scheduled debit.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Amount", align: "right" },
        { label: "Missed debits", align: "right" },
        { label: "Last paid on" },
        { label: "Status" },
      ],
      rows: [
        [
          "SV-8702",
          "Titilayo Ojo",
          money(50_000),
          "3",
          "28 Apr 2026",
          { badge: "Behind schedule", tone: "warning" },
        ],
        [
          "SV-8688",
          "Chidi Anyanwu",
          money(25_000),
          "2",
          "30 May 2026",
          { badge: "Behind schedule", tone: "warning" },
        ],
        [
          "SV-8671",
          "Zainab Lawal",
          money(100_000),
          "4",
          "27 Mar 2026",
          { badge: "Behind schedule", tone: "warning" },
        ],
        [
          "SV-8654",
          "Obinna Eze",
          money(35_000),
          "2",
          "29 May 2026",
          { badge: "Behind schedule", tone: "warning" },
        ],
        [
          "SV-8640",
          "Rukayat Adeniyi",
          money(75_000),
          "3",
          "26 Apr 2026",
          { badge: "Behind schedule", tone: "warning" },
        ],
      ],
    },
  },
  {
    id: "savings-pending-withdrawal",
    label: "Pending withdrawal",
    value: "26",
    note: "Awaiting your approval",
    tone: "gold",
    drilldown: {
      id: "savings-pending-withdrawal-table",
      title: "Pending withdrawal, oldest first",
      description: "How long each request has been waiting.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Amount", align: "right" },
        { label: "Requested on" },
        { label: "Waiting" },
        { label: "Status" },
      ],
      rows: [
        [
          "SV-W-412",
          "Aisha Bello",
          money(680_000),
          "25 Jul 2026",
          "3 days",
          { badge: "Pending", tone: "warning" },
        ],
        [
          "SV-W-408",
          "Tunde Bakare",
          money(145_500),
          "26 Jul 2026",
          "2 days",
          { badge: "Pending", tone: "warning" },
        ],
        [
          "SV-W-401",
          "Ngozi Eze",
          money(1_250_000),
          "27 Jul 2026",
          "1 day",
          { badge: "Pending", tone: "warning" },
        ],
        [
          "SV-W-396",
          "Yusuf Danjuma",
          money(92_800),
          "28 Jul 2026",
          "6 hours",
          { badge: "Pending", tone: "warning" },
        ],
      ],
    },
  },
]

const SAVINGS_TABLES: TableSpec[] = [
  {
    id: "savings-activity",
    title: "Savings activity",
    description: "Last 5 contributions received.",
    columns: [
      { label: "Reference" },
      { label: "Customer" },
      { label: "Plan" },
      { label: "Amount", align: "right" },
      { label: "Received on" },
      { label: "Status" },
    ],
    rows: [
      [
        "SV-8814",
        "Adebayo Ogundimu",
        "Flex save",
        money(50_000),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "SV-8809",
        "Chinwe Okonkwo",
        "Target save",
        money(25_000),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "SV-8796",
        "Ibrahim Musa",
        "Fixed save",
        money(500_000),
        "27 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "SV-8781",
        "Folake Adeyemi",
        "Flex save",
        money(15_000),
        "27 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "SV-8770",
        "Emeka Nwosu",
        "Target save",
        money(120_000),
        "26 Jul 2026",
        { badge: "Failed", tone: "danger" },
      ],
    ],
  },
]

const INVESTMENT_KPIS: KpiSpec[] = [
  {
    id: "investment-active",
    label: "Active investment",
    value: "1,062",
    note: "+52 this month",
    tone: "success",
    drilldown: {
      id: "investment-active-table",
      title: "Active investment",
      description: "Positions currently earning a return.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Instrument" },
        { label: "Amount", align: "right" },
        { label: "Matures on" },
        { label: "Status" },
      ],
      rows: [
        [
          "IV-4218",
          "Adebayo Ogundimu",
          "Treasury note",
          money(5_000_000),
          "14 Sep 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "IV-4205",
          "Chinwe Okonkwo",
          "Fixed income",
          money(2_400_000),
          "02 Oct 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "IV-4191",
          "Ibrahim Musa",
          "Money market",
          money(8_750_000),
          "20 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "IV-4180",
          "Folake Adeyemi",
          "Treasury note",
          money(1_150_000),
          "11 Nov 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "IV-4172",
          "Emeka Nwosu",
          "Fixed income",
          money(3_600_000),
          "30 Sep 2026",
          { badge: "Active", tone: "success" },
        ],
      ],
    },
  },
  {
    id: "investment-matured",
    label: "Matured investment",
    value: "318",
    note: "Paid out or rolled over",
    tone: "muted",
    drilldown: {
      id: "investment-matured-table",
      title: "Matured investment",
      description: "Positions that reached the end of their tenure.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Instrument" },
        { label: "Payout", align: "right" },
        { label: "Matured on" },
        { label: "Status" },
      ],
      rows: [
        [
          "IV-3902",
          "Kelechi Obi",
          "Money market",
          money(2_186_400),
          "15 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
        [
          "IV-3888",
          "Halima Sani",
          "Treasury note",
          money(1_074_800),
          "12 Jul 2026",
          { badge: "Rolled over", tone: "muted" },
        ],
        [
          "IV-3871",
          "Segun Adeleke",
          "Fixed income",
          money(4_512_000),
          "09 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
        [
          "IV-3860",
          "Amaka Nnamdi",
          "Money market",
          money(806_250),
          "06 Jul 2026",
          { badge: "Rolled over", tone: "muted" },
        ],
        [
          "IV-3844",
          "Suleiman Garba",
          "Treasury note",
          money(6_240_500),
          "02 Jul 2026",
          { badge: "Matured", tone: "muted" },
        ],
      ],
    },
  },
  {
    id: "investment-underperforming",
    label: "Underperforming investment",
    value: "24",
    note: "Below target return",
    tone: "warning",
    drilldown: {
      id: "investment-underperforming-table",
      title: "Underperforming investment",
      description: "Positions returning less than the quoted rate.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Instrument" },
        { label: "Amount", align: "right" },
        { label: "Return gap" },
        { label: "Status" },
      ],
      rows: [
        [
          "IV-4098",
          "Titilayo Ojo",
          "Money market",
          money(3_200_000),
          "-2.4%",
          { badge: "Underperforming", tone: "warning" },
        ],
        [
          "IV-4081",
          "Chidi Anyanwu",
          "Fixed income",
          money(1_480_000),
          "-1.8%",
          { badge: "Underperforming", tone: "warning" },
        ],
        [
          "IV-4066",
          "Zainab Lawal",
          "Treasury note",
          money(7_050_000),
          "-3.1%",
          { badge: "Underperforming", tone: "warning" },
        ],
        [
          "IV-4052",
          "Obinna Eze",
          "Money market",
          money(940_600),
          "-1.2%",
          { badge: "Underperforming", tone: "warning" },
        ],
      ],
    },
  },
  {
    id: "investment-pending-liquidation",
    label: "Pending liquidation",
    value: "15",
    note: "Awaiting your approval",
    tone: "gold",
    drilldown: {
      id: "investment-pending-liquidation-table",
      title: "Pending liquidation, oldest first",
      description: "How long each request has been waiting.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Amount", align: "right" },
        { label: "Requested on" },
        { label: "Waiting" },
        { label: "Status" },
      ],
      rows: [
        [
          "IV-L-118",
          "Aisha Bello",
          money(2_500_000),
          "24 Jul 2026",
          "4 days",
          { badge: "Pending", tone: "warning" },
        ],
        [
          "IV-L-114",
          "Tunde Bakare",
          money(860_400),
          "26 Jul 2026",
          "2 days",
          { badge: "Pending", tone: "warning" },
        ],
        [
          "IV-L-109",
          "Ngozi Eze",
          money(4_180_000),
          "27 Jul 2026",
          "1 day",
          { badge: "Pending", tone: "warning" },
        ],
        [
          "IV-L-104",
          "Yusuf Danjuma",
          money(1_325_750),
          "28 Jul 2026",
          "9 hours",
          { badge: "Pending", tone: "warning" },
        ],
      ],
    },
  },
]

const INVESTMENT_TABLES: TableSpec[] = [
  {
    id: "investment-activity",
    title: "Investment activity",
    description: "Last 5 subscriptions and payouts.",
    columns: [
      { label: "Reference" },
      { label: "Customer" },
      { label: "Activity" },
      { label: "Amount", align: "right" },
      { label: "Date" },
      { label: "Status" },
    ],
    rows: [
      [
        "IV-4218",
        "Adebayo Ogundimu",
        "Subscription",
        money(5_000_000),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "IV-3902",
        "Kelechi Obi",
        "Maturity payout",
        money(2_186_400),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "IV-4205",
        "Chinwe Okonkwo",
        "Subscription",
        money(2_400_000),
        "27 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "IV-4191",
        "Ibrahim Musa",
        "Top-up",
        money(1_750_000),
        "26 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "IV-4172",
        "Emeka Nwosu",
        "Subscription",
        money(3_600_000),
        "25 Jul 2026",
        { badge: "Failed", tone: "danger" },
      ],
    ],
  },
]

const COMMODITY_KPIS: KpiSpec[] = [
  {
    id: "commodity-active",
    label: "Active commodity plan",
    value: "640",
    note: "+28 this month",
    tone: "success",
    drilldown: {
      id: "commodity-active-table",
      title: "Active commodity plan",
      description: "Plans still accumulating units.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Commodity" },
        { label: "Value", align: "right" },
        { label: "Next delivery" },
        { label: "Status" },
      ],
      rows: [
        [
          "CM-2114",
          "Adebayo Ogundimu",
          "Rice, 50kg",
          money(486_000),
          "10 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "CM-2108",
          "Chinwe Okonkwo",
          "Cement, 40 bags",
          money(1_240_000),
          "12 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "CM-2096",
          "Ibrahim Musa",
          "Maize, 100kg",
          money(312_500),
          "14 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "CM-2088",
          "Folake Adeyemi",
          "Gold, 5g",
          money(2_075_000),
          "18 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
        [
          "CM-2079",
          "Emeka Nwosu",
          "Cement, 25 bags",
          money(775_000),
          "20 Aug 2026",
          { badge: "Active", tone: "success" },
        ],
      ],
    },
  },
  {
    id: "commodity-completed",
    label: "Completed commodity plan",
    value: "210",
    note: "Delivered or redeemed",
    tone: "muted",
    drilldown: {
      id: "commodity-completed-table",
      title: "Completed commodity plan",
      description: "Plans fully delivered or cashed out.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Commodity" },
        { label: "Value", align: "right" },
        { label: "Completed on" },
        { label: "Status" },
      ],
      rows: [
        [
          "CM-1904",
          "Kelechi Obi",
          "Rice, 50kg",
          money(452_000),
          "15 Jul 2026",
          { badge: "Delivered", tone: "muted" },
        ],
        [
          "CM-1892",
          "Halima Sani",
          "Cement, 30 bags",
          money(915_000),
          "11 Jul 2026",
          { badge: "Delivered", tone: "muted" },
        ],
        [
          "CM-1881",
          "Segun Adeleke",
          "Gold, 2g",
          money(830_500),
          "08 Jul 2026",
          { badge: "Redeemed", tone: "muted" },
        ],
        [
          "CM-1874",
          "Amaka Nnamdi",
          "Maize, 100kg",
          money(298_400),
          "04 Jul 2026",
          { badge: "Delivered", tone: "muted" },
        ],
        [
          "CM-1866",
          "Suleiman Garba",
          "Cement, 50 bags",
          money(1_525_000),
          "01 Jul 2026",
          { badge: "Redeemed", tone: "muted" },
        ],
      ],
    },
  },
  {
    id: "commodity-delayed",
    label: "Delayed delivery",
    value: "18",
    note: "Past promised date",
    tone: "warning",
    drilldown: {
      id: "commodity-delayed-table",
      title: "Delayed delivery",
      description: "Plans that missed the promised delivery window.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Commodity" },
        { label: "Value", align: "right" },
        { label: "Days late", align: "right" },
        { label: "Status" },
      ],
      rows: [
        [
          "CM-2044",
          "Titilayo Ojo",
          "Cement, 20 bags",
          money(620_000),
          "12",
          { badge: "Delayed", tone: "warning" },
        ],
        [
          "CM-2031",
          "Chidi Anyanwu",
          "Rice, 25kg",
          money(243_000),
          "9",
          { badge: "Delayed", tone: "warning" },
        ],
        [
          "CM-2019",
          "Zainab Lawal",
          "Maize, 200kg",
          money(625_000),
          "7",
          { badge: "Delayed", tone: "warning" },
        ],
        [
          "CM-2008",
          "Obinna Eze",
          "Gold, 1g",
          money(415_000),
          "4",
          { badge: "Delayed", tone: "warning" },
        ],
      ],
    },
  },
  {
    id: "commodity-pending-liquidation",
    label: "Pending liquidation",
    value: "9",
    note: "Awaiting your approval",
    tone: "gold",
    drilldown: {
      id: "commodity-pending-liquidation-table",
      title: "Pending liquidation, oldest first",
      description: "How long each request has been waiting.",
      columns: [
        { label: "Reference" },
        { label: "Customer" },
        { label: "Amount", align: "right" },
        { label: "Requested on" },
        { label: "Waiting" },
        { label: "Status" },
      ],
      rows: [
        [
          "CM-L-042",
          "Aisha Bello",
          money(486_000),
          "25 Jul 2026",
          "3 days",
          { badge: "Pending", tone: "warning" },
        ],
        [
          "CM-L-039",
          "Tunde Bakare",
          money(1_240_000),
          "26 Jul 2026",
          "2 days",
          { badge: "Pending", tone: "warning" },
        ],
        [
          "CM-L-035",
          "Ngozi Eze",
          money(312_500),
          "27 Jul 2026",
          "1 day",
          { badge: "Pending", tone: "warning" },
        ],
      ],
    },
  },
]

const COMMODITY_TABLES: TableSpec[] = [
  {
    id: "commodity-activity",
    title: "Commodity activity",
    description: "Last 5 contributions and deliveries.",
    columns: [
      { label: "Reference" },
      { label: "Customer" },
      { label: "Activity" },
      { label: "Amount", align: "right" },
      { label: "Date" },
      { label: "Status" },
    ],
    rows: [
      [
        "CM-2114",
        "Adebayo Ogundimu",
        "Contribution",
        money(48_600),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "CM-1904",
        "Kelechi Obi",
        "Delivery",
        money(452_000),
        "28 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "CM-2108",
        "Chinwe Okonkwo",
        "Contribution",
        money(124_000),
        "27 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "CM-2096",
        "Ibrahim Musa",
        "Contribution",
        money(31_250),
        "26 Jul 2026",
        { badge: "Successful", tone: "success" },
      ],
      [
        "CM-2079",
        "Emeka Nwosu",
        "Contribution",
        money(77_500),
        "25 Jul 2026",
        { badge: "Failed", tone: "danger" },
      ],
    ],
  },
]

const INITIAL_REQUESTS: Record<string, RequestRow[]> = {
  savings: [
    {
      id: "sv-w-412",
      reference: "SV-W-412",
      customer: "Aisha Bello",
      detail: "Flex save",
      amount: 680_000,
      requestedOn: "25 Jul 2026",
      status: "pending",
    },
    {
      id: "sv-w-408",
      reference: "SV-W-408",
      customer: "Tunde Bakare",
      detail: "Target save",
      amount: 145_500,
      requestedOn: "26 Jul 2026",
      status: "pending",
    },
    {
      id: "sv-w-401",
      reference: "SV-W-401",
      customer: "Ngozi Eze",
      detail: "Fixed save",
      amount: 1_250_000,
      requestedOn: "27 Jul 2026",
      status: "pending",
    },
    {
      id: "sv-w-396",
      reference: "SV-W-396",
      customer: "Yusuf Danjuma",
      detail: "Flex save",
      amount: 92_800,
      requestedOn: "28 Jul 2026",
      status: "pending",
    },
    {
      id: "sv-w-390",
      reference: "SV-W-390",
      customer: "Bukola Salami",
      detail: "Target save",
      amount: 415_000,
      requestedOn: "24 Jul 2026",
      status: "approved",
    },
  ],
  investment: [
    {
      id: "iv-l-118",
      reference: "IV-L-118",
      customer: "Aisha Bello",
      detail: "Money market",
      amount: 2_500_000,
      requestedOn: "24 Jul 2026",
      status: "pending",
    },
    {
      id: "iv-l-114",
      reference: "IV-L-114",
      customer: "Tunde Bakare",
      detail: "Treasury note",
      amount: 860_400,
      requestedOn: "26 Jul 2026",
      status: "pending",
    },
    {
      id: "iv-l-109",
      reference: "IV-L-109",
      customer: "Ngozi Eze",
      detail: "Fixed income",
      amount: 4_180_000,
      requestedOn: "27 Jul 2026",
      status: "pending",
    },
    {
      id: "iv-l-104",
      reference: "IV-L-104",
      customer: "Yusuf Danjuma",
      detail: "Money market",
      amount: 1_325_750,
      requestedOn: "28 Jul 2026",
      status: "pending",
    },
    {
      id: "iv-l-098",
      reference: "IV-L-098",
      customer: "Bukola Salami",
      detail: "Treasury note",
      amount: 3_060_000,
      requestedOn: "23 Jul 2026",
      status: "declined",
    },
  ],
  commodity: [
    {
      id: "cm-l-042",
      reference: "CM-L-042",
      customer: "Aisha Bello",
      detail: "Rice, 50kg",
      amount: 486_000,
      requestedOn: "25 Jul 2026",
      status: "pending",
    },
    {
      id: "cm-l-039",
      reference: "CM-L-039",
      customer: "Tunde Bakare",
      detail: "Cement, 40 bags",
      amount: 1_240_000,
      requestedOn: "26 Jul 2026",
      status: "pending",
    },
    {
      id: "cm-l-035",
      reference: "CM-L-035",
      customer: "Ngozi Eze",
      detail: "Maize, 100kg",
      amount: 312_500,
      requestedOn: "27 Jul 2026",
      status: "pending",
    },
    {
      id: "cm-l-031",
      reference: "CM-L-031",
      customer: "Yusuf Danjuma",
      detail: "Gold, 5g",
      amount: 2_075_000,
      requestedOn: "22 Jul 2026",
      status: "approved",
    },
  ],
}

const TABS: TabSpec[] = [
  {
    key: "loan",
    label: "Loan",
    icon: Banknote,
    kpis: LOAN_KPIS,
    due: {
      label: "Repayment due this week",
      note: "96 repayments scheduled across active accounts",
      amount: 42_800_000,
    },
    tables: LOAN_TABLES,
  },
  {
    key: "mortgage",
    label: "Mortgage",
    icon: Home,
    kpis: [
      ...MORTGAGE_KPIS,
      {
        id: "mortgage-savings",
        label: "Mortgage savings",
        value: "0",
        note: "",
        tone: "gold",
        special: "mortgage-savings",
      },
    ],
    due: {
      label: "Repayment due this week",
      note: "38 repayments scheduled across active accounts",
      amount: 186_400_000,
    },
    tables: MORTGAGE_TABLES,
  },
  {
    key: "savings",
    label: "Savings",
    icon: PiggyBank,
    kpis: SAVINGS_KPIS,
    due: {
      label: "Contribution due this week",
      note: "1,842 contributions scheduled across active plans",
      amount: 68_500_000,
    },
    tables: SAVINGS_TABLES,
    requests: {
      title: "Withdrawal request",
      description: "Approve or decline customer withdrawals.",
      detailLabel: "Plan",
    },
  },
  {
    key: "investment",
    label: "Investment",
    icon: TrendingUp,
    kpis: INVESTMENT_KPIS,
    due: {
      label: "Maturity due this week",
      note: "64 positions maturing across active investments",
      amount: 124_900_000,
    },
    tables: INVESTMENT_TABLES,
    requests: {
      title: "Liquidation request",
      description: "Approve or decline early liquidations.",
      detailLabel: "Instrument",
    },
  },
  {
    key: "commodity",
    label: "Commodity",
    icon: Package,
    kpis: COMMODITY_KPIS,
    due: {
      label: "Delivery due this week",
      note: "142 deliveries scheduled across active plans",
      amount: 18_600_000,
    },
    tables: COMMODITY_TABLES,
    requests: {
      title: "Liquidation request",
      description: "Approve or decline commodity cash-outs.",
      detailLabel: "Commodity",
    },
  },
]

/* -------------------------------------------------------------------------- */
/*  Presentational pieces                                                      */
/* -------------------------------------------------------------------------- */

function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        TONE_BADGE[tone],
      )}
    >
      {label}
    </span>
  )
}

function KpiCard({
  kpi,
  selected,
  onSelect,
}: {
  kpi: KpiSpec
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border px-5 py-4 text-left transition-colors",
        selected
          ? "border-[#B08D57] bg-[#F7EEDD]"
          : "border-[#E7E5E0] bg-white hover:border-[#D6D3CE] hover:bg-[#FAFAF9]",
      )}
    >
      <span className="flex items-center gap-2 text-[13px] text-[#78716C]">
        <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[kpi.tone])} />
        {kpi.label}
      </span>
      <span className="mt-2.5 block text-[26px] font-semibold leading-none text-[#1C1917]">
        {kpi.value}
      </span>
      <span className={cn("mt-2 block text-xs", TONE_NOTE[kpi.tone])}>{kpi.note}</span>
    </button>
  )
}

function DueCallout({ due }: { due: DueSpec }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E7E5E0] bg-[#F7EEDD] px-5 py-4">
      <div>
        <p className="text-sm font-medium text-[#96723F]">{due.label}</p>
        <p className="mt-0.5 text-xs text-[#78716C]">{due.note}</p>
      </div>
      <p className="text-xl font-semibold text-[#1C1917]">{money(due.amount)}</p>
    </div>
  )
}

function TableHead({ columns }: { columns: Column[] }) {
  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th
            key={column.label}
            className={cn(
              "border-b border-[#E7E5E0] px-3 pb-2.5 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-[#A8A29E]",
              column.align === "right" && "text-right",
            )}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function DataTable({ table }: { table: TableSpec }) {
  return (
    <section className={cn(CARD, "p-5 sm:p-6")}>
      <h2 className={HEADING}>{table.title}</h2>
      {table.description ? (
        <p className="mt-1 text-sm text-[#78716C]">{table.description}</p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <TableHead columns={table.columns} />
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.id}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${table.id}-${rowIndex}-${cellIndex}`}
                    className={cn(
                      "border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]",
                      table.columns[cellIndex]?.align === "right" && "text-right",
                    )}
                  >
                    {typeof cell === "string" ? cell : <Badge label={cell.badge} tone={cell.tone} />}
                  </td>
                ))}
              </tr>
            ))}
            {table.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-3 py-8 text-center text-sm text-[#78716C]"
                >
                  Nothing to show yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const REQUEST_BADGE: Record<RequestStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  declined: { label: "Declined", tone: "danger" },
}

function RequestTable({
  spec,
  rows,
  onResolve,
}: {
  spec: RequestTableSpec
  rows: RequestRow[]
  onResolve: (id: string, next: "approved" | "declined") => void
}) {
  return (
    <section className={cn(CARD, "p-5 sm:p-6")}>
      <h2 className={HEADING}>{spec.title}</h2>
      <p className="mt-1 text-sm text-[#78716C]">{spec.description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <TableHead
            columns={[
              { label: "Reference" },
              { label: "Customer" },
              { label: spec.detailLabel },
              { label: "Amount", align: "right" },
              { label: "Requested on" },
              { label: "Status" },
              { label: "Action", align: "right" },
            ]}
          />
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                  {row.reference}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                  {row.customer}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                  {row.detail}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-right text-[#1C1917]">
                  {money(row.amount)}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                  {row.requestedOn}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5">
                  <Badge
                    label={REQUEST_BADGE[row.status].label}
                    tone={REQUEST_BADGE[row.status].tone}
                  />
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-right">
                  {row.status === "pending" ? (
                    <span className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={APPROVE_BUTTON}
                        onClick={() => onResolve(row.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={OUTLINE_BUTTON}
                        onClick={() => onResolve(row.id, "declined")}
                      >
                        Decline
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-[#A8A29E]">No action needed</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#78716C]">
                  Nothing to review right now.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Mortgage savings panel                                                     */
/* -------------------------------------------------------------------------- */

type SavingsPanelTab = "pending" | "running" | "non-performing"

const SAVINGS_PANEL_TABS: { key: SavingsPanelTab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "running", label: "Running" },
  { key: "non-performing", label: "Non-performing" },
]

function MortgageSavingsPanel({
  appName,
  applications,
  plans,
  missed,
  remindersSent,
  onReview,
  onSendReminder,
}: {
  appName?: string
  applications: SavingsApplication[]
  plans: SavingsPlan[]
  missed: MissedSavingsPlan[]
  remindersSent: Record<string, boolean>
  onReview: (application: SavingsApplication) => void
  onSendReminder: (plan: MissedSavingsPlan) => void
}) {
  const [panelTab, setPanelTab] = useState<SavingsPanelTab>("pending")
  const pending = applications.filter((application) => application.status === "pending")

  const counts: Record<SavingsPanelTab, number> = {
    pending: pending.length,
    running: plans.length,
    "non-performing": missed.length,
  }

  return (
    <section className={cn(CARD, "mt-4 p-5 sm:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={HEADING}>Mortgage savings</h2>
          <p className="mt-1 text-sm text-[#78716C]">
            Customers saving towards a down payment on {appName || "your app"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[#E7E5E0] bg-[#FAFAF9] p-1">
          {SAVINGS_PANEL_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPanelTab(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                panelTab === tab.key
                  ? "bg-white text-[#96723F] shadow-sm"
                  : "text-[#78716C] hover:text-[#1C1917]",
              )}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {panelTab === "pending" ? (
          pending.length === 0 ? (
            <EmptyState message="No application is waiting for review." />
          ) : (
            pending.map((application) => (
              <div
                key={application.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E7E5E0] bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1917]">{application.customer}</p>
                  <p className="mt-0.5 text-xs text-[#78716C]">
                    {application.reference} · {application.property}
                  </p>
                  <p className="mt-1.5 text-xs text-[#78716C]">
                    Target {money(application.target)} · Monthly {money(application.monthly)} ·{" "}
                    {application.tenure} · Requested {application.submittedOn}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge label="Pending review" tone="warning" />
                  <button
                    type="button"
                    className={REVIEW_BUTTON}
                    onClick={() => onReview(application)}
                  >
                    Review
                  </button>
                </div>
              </div>
            ))
          )
        ) : null}

        {panelTab === "running" ? (
          plans.length === 0 ? (
            <EmptyState message="No savings plan is running yet." />
          ) : (
            plans.map((plan) => {
              const percent = Math.min(100, Math.round((plan.saved / plan.target) * 100))
              return (
                <div
                  key={plan.id}
                  className="rounded-xl border border-[#E7E5E0] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1C1917]">{plan.customer}</p>
                      <p className="mt-0.5 text-xs text-[#78716C]">
                        {plan.reference} · {plan.property}
                      </p>
                    </div>
                    <p className="text-sm text-[#1C1917]">
                      {money(plan.saved)}{" "}
                      <span className="text-[#78716C]">of {money(plan.target)}</span>
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F5F5F4]">
                    <div
                      className="h-full rounded-full bg-[#B08D57]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#78716C]">
                    {percent}% funded · Monthly {money(plan.monthly)} · Started {plan.startedOn}
                  </p>
                </div>
              )
            })
          )
        ) : null}

        {panelTab === "non-performing" ? (
          missed.length === 0 ? (
            <EmptyState message="Every savings plan is on schedule." />
          ) : (
            missed.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E7E5E0] bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1917]">{plan.customer}</p>
                  <p className="mt-0.5 text-xs text-[#78716C]">{plan.reference}</p>
                  <p className="mt-1.5 text-xs text-[#78716C]">
                    {plan.missed} missed contributions · Last paid {plan.lastPaidOn} · Monthly{" "}
                    {money(plan.monthly)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge label="Non-performing" tone="warning" />
                  {remindersSent[plan.id] ? (
                    <span className="text-xs font-medium text-[#157F5E]">Reminder sent</span>
                  ) : (
                    <button
                      type="button"
                      className={OUTLINE_BUTTON}
                      onClick={() => onSendReminder(plan)}
                    >
                      Send reminder
                    </button>
                  )}
                </div>
              </div>
            ))
          )
        ) : null}
      </div>
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#E7E5E0] bg-[#FAFAF9] px-4 py-10 text-center text-sm text-[#78716C]">
      {message}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Review modal                                                               */
/* -------------------------------------------------------------------------- */

function ReviewModal({
  application,
  onClose,
  onApprove,
  onDecline,
}: {
  application: SavingsApplication
  onClose: () => void
  onApprove: () => void
  onDecline: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const details: { label: string; value: string }[] = [
    { label: "Reference", value: application.reference },
    { label: "Customer", value: application.customer },
    { label: "Target property", value: application.property },
    { label: "Target amount", value: money(application.target) },
    { label: "Monthly contribution", value: money(application.monthly) },
    { label: "Tenure", value: application.tenure },
    { label: "Submitted on", value: application.submittedOn },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Review mortgage savings application"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-medium text-[#1C1917]">Review application</h2>
            <p className="mt-1 text-sm text-[#78716C]">
              Confirm the details before you create a savings plan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="rounded-lg border border-[#E7E5E0] p-1.5 text-[#78716C] transition-colors hover:bg-[#FAFAF9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-5 space-y-3">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-start justify-between gap-4 text-sm">
              <dt className="text-[#78716C]">{detail.label}</dt>
              <dd className="text-right font-medium text-[#1C1917]">{detail.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-[#E7E5E0] pt-4">
          <button
            type="button"
            className="rounded-lg border border-[#E7E5E0] bg-white px-4 py-2 text-sm font-medium text-[#78716C] transition-colors hover:bg-[#FAFAF9]"
            onClick={onDecline}
          >
            Decline
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#B08D57] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#96723F]"
            onClick={onApprove}
          >
            Approve &amp; create plan
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function ProductOverviewDashboard({ appName }: { appName?: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("loan")
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null)
  const [applications, setApplications] = useState<SavingsApplication[]>(
    INITIAL_SAVINGS_APPLICATIONS,
  )
  const [plans, setPlans] = useState<SavingsPlan[]>(INITIAL_SAVINGS_PLANS)
  const [remindersSent, setRemindersSent] = useState<Record<string, boolean>>({})
  const [requests, setRequests] = useState<Record<string, RequestRow[]>>(INITIAL_REQUESTS)
  const [reviewTarget, setReviewTarget] = useState<SavingsApplication | null>(null)

  const tab = useMemo(
    () => TABS.find((entry) => entry.key === activeTab) ?? TABS[0],
    [activeTab],
  )

  const pendingApplications = applications.filter(
    (application) => application.status === "pending",
  )

  const kpis: KpiSpec[] = tab.kpis.map((kpi) =>
    kpi.special === "mortgage-savings"
      ? {
          ...kpi,
          value: count(pendingApplications.length),
          note: `${count(pendingApplications.length)} pending review · ${count(plans.length)} running`,
        }
      : kpi,
  )

  const selected = kpis.find((kpi) => kpi.id === selectedKpi) ?? null
  const tabRequests = requests[tab.key] ?? []

  function handleTabChange(next: TabKey) {
    setActiveTab(next)
    setSelectedKpi(null)
  }

  function handleKpiSelect(id: string) {
    setSelectedKpi((current) => (current === id ? null : id))
  }

  function resolveRequest(id: string, next: "approved" | "declined") {
    const row = tabRequests.find((entry) => entry.id === id)
    setRequests((current) => ({
      ...current,
      [tab.key]: (current[tab.key] ?? []).map((entry) =>
        entry.id === id ? { ...entry, status: next } : entry,
      ),
    }))
    const description = row ? `${row.reference} · ${money(row.amount)}` : undefined
    if (next === "approved") {
      toast.success("Request approved", { description })
    } else {
      toast.info("Request declined", { description })
    }
  }

  function approveApplication(application: SavingsApplication) {
    setApplications((current) =>
      current.map((entry) =>
        entry.id === application.id ? { ...entry, status: "approved" } : entry,
      ),
    )
    setPlans((current) => [
      {
        id: application.id,
        reference: application.reference,
        customer: application.customer,
        property: application.property,
        saved: 0,
        target: application.target,
        monthly: application.monthly,
        startedOn: "31 Jul 2026",
      },
      ...current,
    ])
    setReviewTarget(null)
    toast.success("Savings plan created", {
      description: `${application.customer} · ${money(application.monthly)} monthly`,
    })
  }

  function declineApplication(application: SavingsApplication) {
    setApplications((current) =>
      current.map((entry) =>
        entry.id === application.id ? { ...entry, status: "declined" } : entry,
      ),
    )
    setReviewTarget(null)
    toast.info("Application declined", { description: application.reference })
  }

  function sendReminder(plan: MissedSavingsPlan) {
    setRemindersSent((current) => ({ ...current, [plan.id]: true }))
    toast.success("Reminder sent", { description: `${plan.customer} · ${plan.reference}` })
  }

  return (
    <div className="min-h-full w-full bg-[#FAFAF9] text-[#1C1917] tabular-nums">
      <div className="w-full px-6 pb-16 pt-5 sm:px-8">
        <header>
          <h1 className="text-2xl font-semibold text-[#1C1917]">Product overview</h1>
          <p className="mt-1.5 text-sm text-[#78716C]">
            Live activity across every product type {appName || "your app"} has published on Plata.
          </p>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Product type">
          {TABS.map((entry) => {
            const Icon = entry.icon
            const isActive = entry.key === activeTab
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => handleTabChange(entry.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-[#B08D57] bg-[#F7EEDD] text-[#96723F]"
                    : "border-[#E7E5E0] bg-white text-[#78716C] hover:border-[#D6D3CE] hover:text-[#1C1917]",
                )}
              >
                <Icon className="h-4 w-4" />
                {entry.label}
              </button>
            )
          })}
        </nav>

        <div
          className={cn(
            "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2",
            kpis.length > 4 ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4",
          )}
        >
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              selected={selectedKpi === kpi.id}
              onSelect={() => handleKpiSelect(kpi.id)}
            />
          ))}
        </div>

        {selected?.special === "mortgage-savings" ? (
          <MortgageSavingsPanel
            appName={appName}
            applications={applications}
            plans={plans}
            missed={MISSED_SAVINGS_PLANS}
            remindersSent={remindersSent}
            onReview={setReviewTarget}
            onSendReminder={sendReminder}
          />
        ) : null}

        {selected && !selected.special && selected.drilldown ? (
          <div className="mt-4">
            <DataTable table={selected.drilldown} />
          </div>
        ) : null}

        {tab.due ? <DueCallout due={tab.due} /> : null}

        <div className="mt-4 space-y-4">
          {tab.tables.map((table) => (
            <DataTable key={table.id} table={table} />
          ))}
          {tab.requests ? (
            <RequestTable spec={tab.requests} rows={tabRequests} onResolve={resolveRequest} />
          ) : null}
        </div>
      </div>

      {reviewTarget ? (
        <ReviewModal
          application={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onApprove={() => approveApplication(reviewTarget)}
          onDecline={() => declineApplication(reviewTarget)}
        />
      ) : null}
    </div>
  )
}
