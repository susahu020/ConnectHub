'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Layers, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { settings: orgSettings } = useOrganizationSettings();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    // Auto-fill OTP in local development sandbox
    const devOtp = localStorage.getItem('dev_otp_auto_fill');
    if (devOtp) {
      setOtp(devOtp);
      localStorage.removeItem('dev_otp_auto_fill');
      toast.success(`[DEV MODE] Auto-filled verification OTP: ${devOtp}`, { duration: 6000 });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('OTP code must be 6 digits.');
      return;
    }

    setLoading(true);
    try {
      await api.verifyEmail({ email, otp });
      toast.success('Email verified successfully! You can now log in.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="flex flex-col items-center space-y-2 text-center">
        <Link href="/" className="flex items-center space-x-2 text-2xl font-bold tracking-tight mb-2">
          {orgSettings.logoUrl ? (
            <img src={orgSettings.logoUrl} alt={orgSettings.orgName} className="h-8 w-8 rounded object-contain" />
          ) : (
            <Layers className="h-8 w-8 text-primary" />
          )}
          <span>{orgSettings.orgName}</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Verify Your Email</h2>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit OTP code sent to <strong className="text-foreground">{email || 'your email'}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="otp">
            One-Time Password (OTP)
          </label>
          <input
            id="otp"
            type="text"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center text-2xl font-bold tracking-widest"
          />
        </div>

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full py-3 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying OTP...</span>
            </>
          ) : (
            <span>Verify & Continue</span>
          )}
        </button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Remembered your details?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
