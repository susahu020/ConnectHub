'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';

function SsoCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      setError('Missing sign-in token. Please try signing in again.');
      return;
    }

    // Two-step: put the token in the store first (as a placeholder user) so
    // api.getProfile()'s Authorization header — which reads the token out of
    // the auth store — actually has something to send, then swap in the real
    // profile once fetched.
    setAuth({ id: '', firstName: '', lastName: '', email: '', role: 'EMPLOYEE' } as any, accessToken);

    api
      .getProfile()
      .then((profile: any) => {
        setAuth(profile, accessToken);
        // Clear the token out of the URL bar rather than leaving it visible/bookmarkable.
        router.replace('/dashboard');
      })
      .catch(() => {
        useAuthStore.getState().logout();
        setError('Could not complete sign-in. Please try again.');
      });
  }, [searchParams, setAuth, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 space-y-4 px-6 text-center">
        <p className="text-sm font-bold text-red-500">{error}</p>
        <button
          onClick={() => router.replace('/login')}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm font-bold text-slate-500 animate-pulse">Finishing sign-in...</p>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SsoCallbackInner />
    </Suspense>
  );
}
