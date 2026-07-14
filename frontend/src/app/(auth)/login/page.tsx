'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Layers, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA step states
  const [require2fa, setRequire2fa] = useState(false);
  const [temp2faToken, setTemp2faToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

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
        toast.success('Welcome back to ConnectHub!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      if (error.message.includes('not verified')) {
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
      toast.success('Verification successful. Welcome to ConnectHub!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Invalid or expired 2FA code.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-xl relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute -top-24 -right-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="flex flex-col items-center space-y-2 text-center">
          <Link href="/" className="flex items-center space-x-2 text-2xl font-bold tracking-tight mb-2">
            <Layers className="h-8 w-8 text-primary" />
            <span>ConnectHub</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">
            {require2fa ? 'Two-Factor Verification' : 'Sign In to ConnectHub'}
          </h2>
          <p className="text-sm text-muted-foreground leading-normal">
            {require2fa 
              ? 'Enter the 6-digit code from your authenticator app or a backup recovery code.' 
              : 'Enter your credentials to access your workspace portal'}
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
                className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 text-center font-mono text-lg tracking-widest"
              />
            </div>

            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={otpLoading}
                className="w-full py-3 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
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
                className="w-full py-2.5 px-4 border rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center space-x-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        ) : (
          /* STANDARD SIGN IN FORM */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                {...register('email')}
                className={`w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
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
                  className={`w-full pl-4 pr-10 py-3 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Register Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
