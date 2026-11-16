"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
    AlertTriangle,
    Globe,
    KeyRound,
    LifeBuoy,
    Mail,
    MessageCircle,
    MonitorSmartphone,
    Power,
    ShieldCheck,
    UserRound,
} from "lucide-react"
import {
    PasswordInput,
    PasswordStrength,
    ProfileSummary,
    SessionItem,
    SessionsSkeleton,
    SettingsCard,
    SettingsEmpty,
    SettingsField,
    SettingsShell,
    SettingsSubmit,
    settingsDangerButtonClass,
    settingsInputClass,
    useSettingsTab,
    type SettingsNavItem,
} from "@/components/settings/settings-ui"
import { cn } from "@/lib/utils"
import { CountrySelect } from "@/components/ui/country-select"
import { useCountries } from "@/hooks/useCountries"
import { toast } from "sonner"
import APIKeysSection from "@/components/APIKeysSection"
import { usePermissions } from "@/hooks/usePermissions"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useMerchantSettings } from "@/hooks/queries/merchantSettings"

const SETTINGS_SECTIONS: SettingsNavItem[] = [
    { id: "account-settings", label: "Account", description: "Profile and email", icon: UserRound },
    { id: "login-security", label: "Login & security", description: "Password, sessions, API keys", icon: ShieldCheck },
    { id: "contact-support", label: "Contact support", description: "Get help from PLATA", icon: LifeBuoy },
    { id: "account-control", label: "Account control", description: "Deactivate account", icon: Power, tone: "danger" },
]

const SUPPORT_CHANNELS = [
    { label: "Customer support", description: "Chat with our support team about your account.", icon: LifeBuoy },
    { label: "Website", description: "Guides, documentation and service status.", icon: Globe },
    { label: "WhatsApp", description: "Message us for quick questions.", icon: MessageCircle },
]

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useSettingsTab(SETTINGS_SECTIONS, "account-settings")
    // Profile + sessions (React Query); sessions only load on the Login & security tab.
    const settings = useMerchantSettings({ sessionsEnabled: activeTab === "login-security" })
    const [revokingId, setRevokingId] = useState<string | null>(null)
    const [deactivateOpen, setDeactivateOpen] = useState(false)
    const router = useRouter()
    const { actions } = usePermissions()
    const canManageApiKeys = actions.manageApiKeys

    const {
        fullName,
        currentEmail,
        phone,
        country,
        newEmail,
        confirmEmail,
        emailCurrentPassword,
        passwordCurrent,
        passwordNew,
        passwordConfirm,
        sessions,
        profileLoading,
        profileSaving,
        emailSaving,
        passwordSaving,
        sessionsLoading,
        deactivating,
        setAccountFields,
        setEmailFields,
        setPasswordFields,
    } = settings

    const { countries } = useCountries()
    const resolvedCountryCode = useMemo(() => {
        const raw = (country ?? "").trim().toLowerCase()
        if (!raw) return ""
        if (countries.some((c) => c.code === raw)) return raw
        const matchByName = countries.find((c) => c.name.toLowerCase() === raw)
        return matchByName?.code ?? raw
    }, [country, countries])

    const selectedDialCode = useMemo(() => {
        if (!resolvedCountryCode) return ""
        return countries.find((c) => c.code === resolvedCountryCode)?.dialCode ?? ""
    }, [countries, resolvedCountryCode])

    // Some REST Countries records can return "+2" root for Nigeria depending on the IDD shape.
    // Force Nigeria to the expected "+234" so the UI prefix + stored phone number are consistent.
    const normalizedDialCode = useMemo(() => {
        if (resolvedCountryCode === "ng") return "+234"
        return selectedDialCode
    }, [resolvedCountryCode, selectedDialCode])

    useEffect(() => {
        if (settings.profileError) toast.error(settings.profileError.message)
    }, [settings.profileError])

    const handleUpdateProfile = async () => {
        const name = fullName.trim().replace(/\s+/g, " ")
        const [firstName, ...rest] = name.split(" ")
        const lastName = rest.join(" ")
        const body = {
            first_name: firstName || "",
            last_name: lastName || "",
            phone: normalizedDialCode ? `${normalizedDialCode}${phone}` : phone,
            country: resolvedCountryCode,
        }
        try {
            await settings.updateProfile(body)
            toast.success("Profile updated")
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e))
        }
    }

    const handleUpdateEmail = async () => {
        if (!newEmail || !confirmEmail) {
            toast.error("Enter and confirm your new email")
            return
        }
        if (newEmail !== confirmEmail) {
            toast.error("New email and confirmation do not match")
            return
        }
        try {
            await settings.updateEmail({
                    newEmail,
                    confirmEmail,
                    currentPassword: emailCurrentPassword,
                })
            toast.success("Email update submitted")
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e))
        }
    }

    const handleChangePassword = async () => {
        if (!passwordCurrent || !passwordNew || !passwordConfirm) {
            toast.error("Fill in all password fields")
            return
        }
        if (passwordNew !== passwordConfirm) {
            toast.error("New password and confirmation do not match")
            return
        }
        try {
            await settings.changePassword({ currentPassword: passwordCurrent, newPassword: passwordNew })
            toast.success("Password updated")
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e))
        }
    }

    const handleRevokeSession = async (sessionId: string) => {
        try {
            setRevokingId(sessionId)
            await settings.revokeSession(sessionId)
            toast.success("Signed out of that device")
        } catch {
            toast.error("Could not sign out of that device.")
        } finally {
            setRevokingId(null)
        }
    }

    const handleDeactivate = async () => {
        try {
            await settings.deactivateAccount()
            toast.success("Account deactivated")
            setDeactivateOpen(false)
            router.push("/signin")
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e))
        }
    }

    const emailMismatch = !!confirmEmail && newEmail !== confirmEmail
    const emailReady = !!newEmail && !!confirmEmail && !emailMismatch && !!emailCurrentPassword
    const passwordMismatch = !!passwordConfirm && passwordNew !== passwordConfirm
    const passwordReady = !!passwordCurrent && !!passwordNew && !!passwordConfirm && !passwordMismatch

    return (
        <SettingsShell
            description="Manage your account, security and API access."
            items={SETTINGS_SECTIONS}
            active={activeTab}
            onChange={setActiveTab}
        >
            {activeTab === "account-settings" && (
                <>
                    <ProfileSummary name={fullName} email={currentEmail} loading={profileLoading && !currentEmail} />

                    <SettingsCard
                        icon={UserRound}
                        title="Personal information"
                        description="Your name and contact details."
                        footer={
                            <SettingsSubmit busy={profileSaving} onClick={() => void handleUpdateProfile()}>
                                Save changes
                            </SettingsSubmit>
                        }
                    >
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <SettingsField label="Full name" htmlFor="fullName" className="md:col-span-2">
                                <input
                                    id="fullName"
                                    placeholder="e.g. Ada Okafor"
                                    value={fullName}
                                    onChange={(e) => setAccountFields({ fullName: e.target.value })}
                                    className={settingsInputClass}
                                    autoComplete="name"
                                />
                            </SettingsField>
                            <SettingsField label="Country">
                                <CountrySelect
                                    value={resolvedCountryCode}
                                    onValueChange={(value) => setAccountFields({ country: value })}
                                    placeholder="Select country"
                                    triggerClassName={settingsInputClass}
                                />
                            </SettingsField>
                            <SettingsField label="Phone number" htmlFor="phone">
                                <div className="flex h-11 overflow-hidden rounded-lg border border-gray-300 bg-white shadow-xs transition-[box-shadow,border-color] focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/20 hover:border-gray-400">
                                    <span className="flex min-w-[4rem] items-center justify-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                                        {normalizedDialCode || "+"}
                                    </span>
                                    <input
                                        id="phone"
                                        inputMode="tel"
                                        placeholder="801 234 5678"
                                        value={phone}
                                        onChange={(e) => setAccountFields({ phone: e.target.value })}
                                        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                                        autoComplete="tel-national"
                                    />
                                </div>
                            </SettingsField>
                        </div>
                    </SettingsCard>

                    <SettingsCard
                        icon={Mail}
                        title="Email address"
                        description="Confirm your password and enter the new address."
                        footer={
                            <SettingsSubmit
                                busy={emailSaving}
                                disabled={!emailReady || profileSaving}
                                onClick={() => void handleUpdateEmail()}
                            >
                                Change email
                            </SettingsSubmit>
                        }
                    >
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <SettingsField label="Current email" htmlFor="email" className="md:col-span-2 md:max-w-[calc(50%-0.625rem)]">
                                <input id="email" type="email" value={currentEmail} readOnly className={settingsInputClass} />
                            </SettingsField>
                            <SettingsField label="New email" htmlFor="newEmail">
                                <input
                                    id="newEmail"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={newEmail}
                                    onChange={(e) => setEmailFields({ newEmail: e.target.value })}
                                    className={settingsInputClass}
                                    autoComplete="email"
                                />
                            </SettingsField>
                            <SettingsField
                                label="Confirm new email"
                                htmlFor="confirmEmail"
                                error={emailMismatch ? "Emails don't match" : undefined}
                            >
                                <input
                                    id="confirmEmail"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={confirmEmail}
                                    onChange={(e) => setEmailFields({ confirmEmail: e.target.value })}
                                    className={cn(settingsInputClass, emailMismatch && "border-red-400")}
                                />
                            </SettingsField>
                            <SettingsField
                                label="Current password"
                                htmlFor="emailCurrentPassword"
                                hint="Required to confirm it's you."
                                className="md:col-span-2 md:max-w-[calc(50%-0.625rem)]"
                            >
                                <PasswordInput
                                    id="emailCurrentPassword"
                                    value={emailCurrentPassword}
                                    onChange={(v) => setEmailFields({ emailCurrentPassword: v })}
                                    placeholder="Enter your password"
                                />
                            </SettingsField>
                        </div>
                    </SettingsCard>
                </>
            )}

            {activeTab === "login-security" && (
                <>
                    <SettingsCard
                        icon={KeyRound}
                        title="Password"
                        description="Use a strong password you don't use anywhere else."
                        footer={
                            <SettingsSubmit
                                busy={passwordSaving}
                                disabled={!passwordReady}
                                onClick={() => void handleChangePassword()}
                            >
                                Update password
                            </SettingsSubmit>
                        }
                    >
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <SettingsField label="Current password" htmlFor="passwordCurrent" className="md:col-span-2 md:max-w-[calc(50%-0.625rem)]">
                                <PasswordInput
                                    id="passwordCurrent"
                                    value={passwordCurrent}
                                    onChange={(v) => setPasswordFields({ passwordCurrent: v })}
                                    placeholder="Enter current password"
                                />
                            </SettingsField>
                            <SettingsField label="New password" htmlFor="passwordNew">
                                <PasswordInput
                                    id="passwordNew"
                                    value={passwordNew}
                                    onChange={(v) => setPasswordFields({ passwordNew: v })}
                                    placeholder="Enter new password"
                                    autoComplete="new-password"
                                />
                            </SettingsField>
                            <SettingsField
                                label="Confirm new password"
                                htmlFor="passwordConfirm"
                                error={passwordMismatch ? "Passwords don't match" : undefined}
                            >
                                <PasswordInput
                                    id="passwordConfirm"
                                    value={passwordConfirm}
                                    onChange={(v) => setPasswordFields({ passwordConfirm: v })}
                                    placeholder="Re-enter new password"
                                    autoComplete="new-password"
                                />
                            </SettingsField>
                            <div className="md:col-span-2">
                                <PasswordStrength password={passwordNew} />
                            </div>
                        </div>
                    </SettingsCard>

                    <SettingsCard
                        icon={MonitorSmartphone}
                        title="Active sessions"
                        description="Devices currently signed in to your account. Sign out of any you don't recognise."
                    >
                        {sessionsLoading ? (
                            <SessionsSkeleton />
                        ) : sessions.length === 0 ? (
                            <SettingsEmpty icon={MonitorSmartphone} title="No active sessions" />
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {[...sessions]
                                    .sort((a, b) => Number(!!b.isCurrent) - Number(!!a.isCurrent))
                                    .map((s) => (
                                        <SessionItem
                                            key={s.id}
                                            device={s.deviceInfo || "Unknown device"}
                                            ip={s.ipAddress || undefined}
                                            lastActive={s.lastActiveAt ? (Number.isNaN(Date.parse(s.lastActiveAt)) ? s.lastActiveAt : new Date(s.lastActiveAt).toLocaleString()) : undefined}
                                            isCurrent={s.isCurrent}
                                            revoking={revokingId === s.id}
                                            onRevoke={() => void handleRevokeSession(s.id)}
                                        />
                                    ))}
                            </ul>
                        )}
                    </SettingsCard>

                    {canManageApiKeys ? (
                        <APIKeysSection
                            className="w-full"
                            footerNote={
                                <>
                                    Account-wide keys for your merchant on the Plata gateway. Prefer no
                                    expiry for integrator keys; rotate by create → update consumers →
                                    revoke old.
                                </>
                            }
                        />
                    ) : (
                        <SettingsCard
                            icon={KeyRound}
                            title="API keys"
                            description="API key management requires Admin access. Contact an Admin or the account owner if you need keys created or rotated."
                        />
                    )}
                </>
            )}

            {activeTab === "contact-support" && (
                <SettingsCard
                    icon={LifeBuoy}
                    title="Contact support"
                    description="Find answers to common questions or reach the PLATA team."
                >
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {SUPPORT_CHANNELS.map(({ label, description, icon: Icon }) => (
                            <li key={label} className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                                    <Icon className="size-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{label}</p>
                                    <p className="mt-0.5 text-xs text-gray-500">{description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </SettingsCard>
            )}

            {activeTab === "account-control" && (
                <SettingsCard
                    icon={Power}
                    tone="danger"
                    title="Deactivate account"
                    description="Temporarily switch off your account. Your data is kept and you can come back any time by signing in."
                    footer={
                        <button type="button" className={settingsDangerButtonClass} onClick={() => setDeactivateOpen(true)}>
                            <Power className="size-4" />
                            Deactivate account
                        </button>
                    }
                >
                    <p className="mb-3 text-sm font-medium text-gray-900">What happens when you deactivate</p>
                    <ul className="space-y-2.5 text-sm text-gray-600">
                        {[
                            "Your profile won't be visible to others.",
                            "Active subscriptions are paused.",
                            "You can reactivate within 90 days by signing in.",
                            "After 90 days, your account may be permanently deleted.",
                        ].map((line) => (
                            <li key={line} className="flex items-start gap-2.5">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                                {line}
                            </li>
                        ))}
                    </ul>
                </SettingsCard>
            )}

            <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <AlertTriangle className="size-5" />
                        </div>
                        <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You&apos;ll be signed out and your subscriptions paused. You can reactivate within 90 days by signing in again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="h-10 rounded-lg">Keep account</AlertDialogCancel>
                        <SettingsSubmit
                            variant="danger"
                            busy={deactivating}
                            busyLabel="Deactivating…"
                            onClick={() => void handleDeactivate()}
                        >
                            Yes, deactivate
                        </SettingsSubmit>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SettingsShell>
    )
}
