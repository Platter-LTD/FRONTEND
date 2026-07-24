'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const FORGOT_PASSWORD_EMAIL_KEY = 'plata_mobile_forgot_password_email';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      sessionStorage.setItem(FORGOT_PASSWORD_EMAIL_KEY, trimmed);
      toast.success('If an account exists for this email, you will receive reset instructions shortly.');
      router.push('/mobile-v2/auth/forgot-password/sent');
    } catch {
      toast.error('Could not continue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-[#FAFAFA] p-6 pt-12 text-[#1E293B]">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/mobile-v2/auth/login" className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Forgot Password</h1>
        <div className="w-8" />
      </div>

      <div className="mb-10 text-left">
        <p className="max-w-[90%] text-[20px] font-bold leading-tight text-[#1E1B4B]">
          Enter your email and we’ll send you a link to reset your password.
        </p>
      </div>

      <div className="flex-1 space-y-6">
        <div className="relative group">
          <input
            type="email"
            id="email"
            placeholder=" "
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
          <label
            htmlFor="email"
            className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-gray-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400"
          >
            Email
          </label>
        </div>
      </div>

      <div className="mb-4 mt-auto">
        <Button
          type="button"
          disabled={submitting}
          onClick={() => void handleContinue()}
          className="h-14 w-full rounded-[20px] bg-[#1E40AF] text-base font-medium text-white shadow-lg shadow-blue-900/20 hover:bg-[#1e3a8a]"
        >
          {submitting ? 'Please wait…' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
