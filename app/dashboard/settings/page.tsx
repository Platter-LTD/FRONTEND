"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, CircleHelp, Copy, Flag, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Tabs from "@/components/Tabs"
import { CountrySelect } from "@/components/ui/country-select"
import { useCountries } from "@/hooks/useCountries"
import { toast } from "sonner"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
    changeMerchantPasswordThunk,
    deactivateMerchantAccountThunk,
    fetchMerchantProfileThunk,
    fetchMerchantSessionsThunk,
    revokeMerchantSessionThunk,
    setAccountFields,
    setEmailFields,
    setPasswordFields,
    updateMerchantEmailThunk,
    updateMerchantProfileThunk,
} from "@/store/merchantSettingsSlice"
import APIKeysSection from "@/components/APIKeysSection"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** Primary actions — Plata brand brown (matches compliance / dashboard CTAs). */
const PLATA_PRIMARY_BTN =
    "bg-[#9A813F] text-white hover:bg-[#8A7335] focus-visible:ring-2 focus-visible:ring-[#9A813F]/40 rounded-md px-6"

export default function SettingsPage() {
    const dispatch = useAppDispatch()
    const [activeTab, setActiveTab] = useState("account-settings")
    const [deactivateOpen, setDeactivateOpen] = useState(false)
    const router = useRouter()

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
    } = useAppSelector((s) => s.merchantSettings)

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

    const tabs = [
        { id: "account-settings", label: "Account Settings" },
        { id: "login-security", label: "Login & Security" },
        { id: "contact-support", label: "Contact Support" },
        { id: "account-control", label: "Account Control" },
    ]

    useEffect(() => {
        void dispatch(fetchMerchantProfileThunk())
            .unwrap()
            .catch((e) => toast.error(String(e)))
    }, [dispatch])

    useEffect(() => {
        if (activeTab !== "login-security") return
        void dispatch(fetchMerchantSessionsThunk())
            .unwrap()
            .catch(() => {
                /* optional: toast */
            })
    }, [activeTab, dispatch])

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
            await dispatch(updateMerchantProfileThunk(body)).unwrap()
            toast.success("Profile updated")
        } catch (e) {
            toast.error(String(e))
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
            await dispatch(
                updateMerchantEmailThunk({
                    newEmail,
                    confirmEmail,
                    currentPassword: emailCurrentPassword,
                }),
            ).unwrap()
            toast.success("Email update submitted")
        } catch (e) {
            toast.error(String(e))
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
            await dispatch(
                changeMerchantPasswordThunk({ currentPassword: passwordCurrent, newPassword: passwordNew }),
            ).unwrap()
            toast.success("Password updated")
        } catch (e) {
            toast.error(String(e))
        }
    }

    const handleRevokeSession = async (sessionId: string) => {
        try {
            await dispatch(revokeMerchantSessionThunk(sessionId)).unwrap()
        } catch {
            /* ignore */
        }
    }

    const handleDeactivate = async () => {
        try {
            await dispatch(deactivateMerchantAccountThunk()).unwrap()
            toast.success("Account deactivated")
            setDeactivateOpen(false)
            router.push("/signin")
        } catch (e) {
            toast.error(String(e))
        }
    }

    return (
        <div className="px-8 pb-4 bg-white min-h-full w-full max-w-full">
            <div className="flex flex-col space-y-4 w-full">
             

                {/* Header with Tabs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-0 w-full">
                    <div className="flex-1 w-full min-w-0">
                        <Tabs
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            containerClassName="border-b-0"
                            activeTabClassName="border-[#9A813F] text-[#9A813F]"
                        />
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === "account-settings" && (
                    <div className="space-y-6 w-full max-w-full">
                          <div>
                                <h3 className="text-lg font-semibold text-gray-900">Update Account</h3>
                                <p className="text-sm text-gray-500">Update your account information.</p>
                            </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-gray-600 font-normal">
                                    Full name
                                </Label>
                                <Input
                                    id="fullName"
                                    placeholder="Please enter your full name"
                                    value={fullName}
                                    onChange={(e) => dispatch(setAccountFields({ fullName: e.target.value }))}
                                    className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-600 font-normal">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={currentEmail}
                                    readOnly
                                    className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="country" className="text-gray-600 font-normal">
                                    Country
                                </Label>
                                <div className="grid grid-cols-1 gap-3">
                                    <CountrySelect
                                        value={resolvedCountryCode}
                                        onValueChange={(value) => dispatch(setAccountFields({ country: value }))}
                                        placeholder="Select Country"
                                        triggerClassName="w-full !h-12 bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-gray-600 font-normal">
                                    Phone number
                                </Label>
                                <div className="flex w-full min-w-0">
                                    <div className="flex items-center justify-center bg-[#F0F2F5] px-3 rounded-l-md border-r border-gray-300 text-gray-500 h-12 min-w-[56px] w-[56px] shrink-0">
                                        {normalizedDialCode || "+"}
                                    </div>
                                    <Input
                                        id="phone"
                                        placeholder="Please enter your phone number"
                                        value={phone}
                                        onChange={(e) => dispatch(setAccountFields({ phone: e.target.value }))}
                                        className="flex-1 min-w-0 bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12 rounded-l-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Button
                                className={PLATA_PRIMARY_BTN}
                                onClick={() => void handleUpdateProfile()}
                                disabled={profileSaving}
                            >
                                {profileSaving ? "Updating..." : "Update Profile"}
                            </Button>
                        </div>

                        <div className="rounded-lg py-6 space-y-4 w-full">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Update Email</h3>
                                <p className="text-sm text-gray-500">Confirm your password and provide the new email.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                                <div className="space-y-2 w-full min-w-0">
                                    <Label htmlFor="newEmail" className="text-gray-600 font-normal">
                                        New email
                                    </Label>
                                    <Input
                                        id="newEmail"
                                        type="email"
                                        placeholder="Please enter your new email"
                                        value={newEmail}
                                        onChange={(e) => dispatch(setEmailFields({ newEmail: e.target.value }))}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12 w-full"
                                    />
                                </div>
                                <div className="space-y-2 w-full min-w-0">
                                    <Label htmlFor="confirmEmail" className="text-gray-600 font-normal">
                                        Confirm new email
                                    </Label>
                                    <Input
                                        id="confirmEmail"
                                        type="email"
                                        placeholder="Please confirm your new email"
                                        value={confirmEmail}
                                        onChange={(e) => dispatch(setEmailFields({ confirmEmail: e.target.value }))}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12 w-full"
                                    />
                                </div>

                                <div className="space-y-2 w-full min-w-0 md:col-span-2 xl:col-span-1">
                                    <Label htmlFor="emailCurrentPassword" className="text-gray-600 font-normal">
                                        Current password
                                    </Label>
                                    <Input
                                        id="emailCurrentPassword"
                                        type="password"
                                        placeholder="Enter your current password"
                                        value={emailCurrentPassword}
                                        onChange={(e) => dispatch(setEmailFields({ emailCurrentPassword: e.target.value }))}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12 w-full"
                                    />
                                </div>
                            </div>

                            <Button
                                className={PLATA_PRIMARY_BTN}
                                onClick={() => void handleUpdateEmail()}
                                disabled={emailSaving || profileSaving}
                            >
                                {emailSaving ? "Updating..." : "Update Email"}
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === "login-security" && (
                    <div className="space-y-10 w-full max-w-full">
                        {/* Change Password Section */}
                        <section>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                                <p className="text-sm text-gray-500">Update your password to keep your account secure</p>
                            </div>
                            <div className="space-y-6 w-full max-w-full">
                                <Input
                                    placeholder="Enter Current Password"
                                    type="password"
                                    value={passwordCurrent}
                                    onChange={(e) => dispatch(setPasswordFields({ passwordCurrent: e.target.value }))}
                                    className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12 w-full max-w-full"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                    <Input
                                        placeholder="Enter New Password"
                                        type="password"
                                        value={passwordNew}
                                        onChange={(e) => dispatch(setPasswordFields({ passwordNew: e.target.value }))}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12 w-full min-w-0"
                                    />
                                    <Input
                                        placeholder="Confirm New Password"
                                        type="password"
                                        value={passwordConfirm}
                                        onChange={(e) => dispatch(setPasswordFields({ passwordConfirm: e.target.value }))}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12 w-full min-w-0"
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-6">
                                <Button
                                    className={PLATA_PRIMARY_BTN}
                                    onClick={() => void handleChangePassword()}
                                    disabled={passwordSaving}
                                >
                                    {passwordSaving ? "Updating..." : "Update Password"}
                                </Button>
                            </div>
                        </section>

                        {/* Active Sessions Section */}
                        <section>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
                                <p className="text-sm text-gray-500">Manage your active login sessions across devices.</p>
                            </div>
                            <div className="bg-[#F0F2F5] rounded-lg p-6 space-y-4 w-full">
                                {sessionsLoading ? (
                                    <p className="text-sm text-gray-500">Loading sessions...</p>
                                ) : sessions.length === 0 ? (
                                    <p className="text-sm text-gray-500">No active sessions.</p>
                                ) : (
                                    sessions.map((s) => (
                                        <div key={s.id} className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm">
                                            <div>
                                                <p className="font-medium text-gray-900">{s.deviceInfo || "Unknown device"}</p>
                                                <p className="text-sm text-gray-500">
                                                    {s.ipAddress ? `${s.ipAddress} • ` : ""}
                                                    {s.lastActiveAt ? `Last active: ${s.lastActiveAt}` : "Active"}
                                                </p>
                                            </div>
                                            {s.isCurrent ? (
                                                <span className="text-green-600 text-sm font-medium">Current</span>
                                            ) : (
                                                <button
                                                    className="text-red-500 text-sm font-medium hover:text-red-600"
                                                    onClick={() => void handleRevokeSession(s.id)}
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* API Keys — integration keys (per-app keys live under each app's Settings) */}
                        <APIKeysSection className="w-full" />
                    </div>
                )}

                {activeTab === "contact-support" && (
                    <div className="w-full max-w-full">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
                            <p className="text-sm text-gray-500">Find answers to common questions about PLATA</p>
                        </div>
                        <div className="bg-[#F0F2F5] rounded-lg p-6 space-y-4 w-full">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm border border-transparent hover:border-[#9A813F]/35 hover:bg-[#FFF9EB]/80 transition-colors group"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-8 h-8 shrink-0 rounded-full bg-[#9A813F] flex items-center justify-center">
                                        <CircleHelp className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium text-gray-900 truncate">Customer Support</span>
                                </div>
                                <ChevronRight className="w-5 h-5 shrink-0 text-[#9A813F]/70 group-hover:text-[#9A813F]" />
                            </button>

                            <button
                                type="button"
                                className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm border border-transparent hover:border-[#9A813F]/35 hover:bg-[#FFF9EB]/80 transition-colors group"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-8 h-8 shrink-0 rounded-full bg-[#9A813F] flex items-center justify-center">
                                        <CircleHelp className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium text-gray-900 truncate">Website</span>
                                </div>
                                <ChevronRight className="w-5 h-5 shrink-0 text-[#9A813F]/70 group-hover:text-[#9A813F]" />
                            </button>

                            <button
                                type="button"
                                className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm border border-transparent hover:border-[#9A813F]/35 hover:bg-[#FFF9EB]/80 transition-colors group"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-8 h-8 shrink-0 rounded-full bg-[#9A813F] flex items-center justify-center">
                                        <Flag className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium text-gray-900 truncate">WhatsApp</span>
                                </div>
                                <ChevronRight className="w-5 h-5 shrink-0 text-[#9A813F]/70 group-hover:text-[#9A813F]" />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "account-control" && (
                    <div className="w-full max-w-full">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Deactivate Account</h2>
                        </div>
                        <div className="bg-[#F0F2F5] rounded-lg p-8 w-full">
                            <p className="text-gray-600 mb-6">
                                Temporarily deactivate your account. Your data will be preserved and you can reactivate anytime by logging back in. Your subscription will be paused during deactivation.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-8">
                                <li>Your profile will not be visible to others.</li>
                                <li>Active subscriptions will be paused.</li>
                                <li>You can reactivate within 90 days.</li>
                                <li>After 90 days, your account may be permanently deleted.</li>
                            </ul>
                            <Button
                                onClick={() => setDeactivateOpen(true)}
                                className="bg-[#FF4D4F] hover:bg-[#FF7875] text-white border-none px-6"
                            >
                                Deactivate Account
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Deactivate account confirmation modal */}
            <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
                <AlertDialogContent className="sm:max-w-md text-center">
                    <AlertDialogHeader>
                        <div className="flex justify-center mb-2">
                            <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
                                <X className="w-7 h-7 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <AlertDialogTitle className="text-xl">Deactivate</AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-gray-600">
                            Are you sure to deactivate your account?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-3 sm:justify-center mt-6">
                        <AlertDialogCancel className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 px-6">
                            No, Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-[#FF4D4F] hover:bg-[#FF7875] text-white px-6"
                                    onClick={() => void handleDeactivate()}
                                    disabled={deactivating}
                        >
                                    {deactivating ? "Deactivating..." : "Yes"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
