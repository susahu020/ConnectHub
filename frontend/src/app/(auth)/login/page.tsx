'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Layers, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { api, API_BASE_URL } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';
import AuthBrandPanel from '../../../components/auth/AuthBrandPanel';
import { useRetryCountdown } from '../../../hooks/useRetryCountdown';
import { RetryCountdownBanner } from '../../../components/auth/RetryCountdownBanner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { settings: orgSettings } = useOrganizationSettings();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const ssoError = searchParams.get('ssoError');
    if (ssoError) {
      toast.error(ssoError);
    }
  }, [searchParams]);

  // Only ever redirect to a relative in-app path. A bare '/' prefix check
  // isn't enough on its own (e.g. '//evil.com' is parsed by browsers as a
  // protocol-relative external URL), so explicitly reject any target
  // starting with '//' or containing a scheme, and fall back to
  // '/dashboard' for anything that isn't a plain relative path.
  const getRedirectTarget = () => {
    const next = searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('://')) {
      return next;
    }
    return '/dashboard';
  };

  // 2FA step states
  const [require2fa, setRequire2fa] = useState(false);
  const [temp2faToken, setTemp2faToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // IP rate limiting (authRateLimiter, code RATE_LIMIT_EXCEEDED) and
  // per-account lockout after repeated failed attempts (code
  // ACCOUNT_LOCKED) both land here — one countdown covers either case
  // since the credentials form and the OTP form are mutually exclusive
  // steps of the same flow.
  const loginRetry = useRetryCountdown();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await api.login(values);
      
      if (response.require2fa) {
        setTemp2faToken(response.tempToken);
        setRequire2fa(true);
        toast.success('Credentials verified. Two-Factor Authentication required.');
      } else {
        setAuth(response.user, response.accessToken);
        toast.success(`Welcome back to ${orgSettings.orgName}!`);
        router.push(getRedirectTarget());
      }
    } catch (error: any) {
      if (error.retryAfterSeconds) {
        // RATE_LIMIT_EXCEEDED (429, too many attempts from this network) or
        // ACCOUNT_LOCKED (423, too many failed attempts on this account) —
        // both carry a real wait duration now, so show a live countdown
        // instead of a toast that goes stale the moment it renders.
        loginRetry.start(error.retryAfterSeconds);
        toast.error(error.message || 'Too many attempts. Please wait before trying again.');
      } else if (error.message.includes('not verified')) {
        toast.error('Account not verified. Redirecting to verification...');
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
      } else {
        toast.error(error.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !temp2faToken) return;

    setOtpLoading(true);
    try {
      const response = await api.verifyLogin2FA({
        tempToken: temp2faToken,
        code: otpCode,
      });

      setAuth(response.user, response.accessToken);
      toast.success(`Verification successful. Welcome to ${orgSettings.orgName}!`);
      router.push(getRedirectTarget());
    } catch (error: any) {
      if (error.retryAfterSeconds) {
        loginRetry.start(error.retryAfterSeconds);
      }
      toast.error(error.message || 'Invalid or expired 2FA code.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AuthBrandPanel
        orgName={orgSettings.orgName}
        logoUrl={orgSettings.logoUrl}
        heading="Welcome back to your workspace"
        subheading="Sign in to pick up right where your team left off — chat, tasks, files, and reporting, all in one place."
        bullets={[
          'Real-time chat, channels, and presence',
          'Kanban boards with due dates and priorities',
          'Enterprise-grade RBAC and audit logs',
        ]}
        quote={{
          text: `Switching to ${orgSettings.orgName} cut the number of tools our team juggles from five down to one.`,
          author: 'Priya Nathan',
          role: 'Head of Operations',
        }}
      />

      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-16 relative">
        <Link
          href="/"
          className="absolute top-6 left-6 lg:top-8 lg:left-8 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to home</span>
        </Link>

        <div className="w-full max-w-md space-y-8">
          {/* Compact logo header — shown only where the brand panel is hidden */}
          <Link href="/" className="lg:hidden flex items-center justify-center space-x-2 text-xl font-bold tracking-tight">
            {orgSettings.logoUrl ? (
              <img src={orgSettings.logoUrl} alt={orgSettings.orgName} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <Layers className="h-7 w-7 text-primary" />
            )}
            <span>{orgSettings.orgName}</span>
          </Link>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
              {require2fa ? 'Two-Factor Verification' : 'Sign in'}
            </h2>
            <p className="text-sm text-muted-foreground leading-normal">
              {require2fa 
                ? 'Enter the 6-digit code from your authenticator app or a backup recovery code.' 
                : 'Enter your credentials to access your workspace portal.'}
            </p>
          </div>

          {require2fa ? (
          /* 2FA CODE FORM */
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>Verification Code</span>
              </div>
              <input
                id="otpCode"
                type="text"
                required
                maxLength={8}
                placeholder="e.g. 123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 text-center font-mono text-lg tracking-widest"
              />
            </div>

            <div className="flex flex-col space-y-3">
              <RetryCountdownBanner secondsLeft={loginRetry.secondsLeft} message="Too many verification attempts." />
              <button
                type="submit"
                disabled={otpLoading || loginRetry.isBlocked}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : loginRetry.isBlocked ? (
                  <span>Try again in {loginRetry.secondsLeft}s</span>
                ) : (
                  <span>Verify & Sign In</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequire2fa(false);
                  setOtpCode('');
                  setTemp2faToken('');
                }}
                className="w-full py-2.5 px-4 border rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-all flex items-center justify-center space-x-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        ) : (
          /* STANDARD SIGN IN FORM */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {orgSettings.ssoGoogleAvailable && (
              <>
                <a
                  href={`${API_BASE_URL}/auth/sso/google`}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 border rounded-xl font-semibold text-sm hover:bg-muted transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </a>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">or sign in with email</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                {...register('email')}
                className={`w-full px-4 py-3 rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
                  errors.email ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''
                }`}
              />
              {errors.email && <p className="text-xs font-medium text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="password">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full pl-4 pr-10 py-3 rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
                    errors.password ? 'border-red-500 focus:ring-red-500/20' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs font-medium text-red-500">{errors.password.message}</p>}
            </div>

            <RetryCountdownBanner secondsLeft={loginRetry.secondsLeft} />
            <button
              type="submit"
              disabled={loading || loginRetry.isBlocked}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : loginRetry.isBlocked ? (
                <span>Try again in {loginRetry.secondsLeft}s</span>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        )}

        {(orgSettings.needsInitialSetup || orgSettings.registrationMode !== 'INVITE_ONLY') && (
          <div className="text-center text-sm text-muted-foreground">
            {orgSettings.needsInitialSetup ? (
              <>First time here? <Link href="/register" className="font-semibold text-primary hover:underline">Set up this workspace</Link></>
            ) : (
              <>Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Register Workspace
                </Link>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
