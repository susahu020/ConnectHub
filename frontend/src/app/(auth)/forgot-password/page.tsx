'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Layers, Loader2, Mail } from 'lucide-react';
import { api } from '../../../services/api';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { settings: orgSettings } = useOrganizationSettings();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      await api.forgotPassword(values);
      setSubmitted(true);
      toast.success('Password reset link dispatched!');
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12">
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
          <h2 className="text-2xl font-bold tracking-tight">Recovery Password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive a password reset link
          </p>
        </div>

        {submitted ? (
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border text-center space-y-4">
            <div className="p-3 bg-primary/10 w-fit mx-auto rounded-full text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Check Your Email</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If an account matches your email address, we have dispatched a password reset link. Please check your inbox and spam folders.
            </p>
            <Link
              href="/login"
              className="block w-full py-2.5 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-md"
            >
              Return to Login
            </Link>
          </div>
        ) : (
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
                  errors.email ? 'border-red-500' : ''
                }`}
              />
              {errors.email && <p className="text-xs font-medium text-red-500">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <span>Request Reset Link</span>
              )}
            </button>
          </form>
        )}

        {!submitted && (
          <div className="text-center text-sm text-muted-foreground">
            Remembered your details?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
