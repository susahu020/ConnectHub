'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Layers, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { api } from '../../../services/api';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  designation: z.string().min(1, 'Designation is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [invitedRole, setInvitedRole] = useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'EMPLOYEE',
      designation: 'Engineer',
    },
  });

  useEffect(() => {
    if (token) {
      setVerifyingToken(true);
      api.verifyInvitation(token)
        .then((res: any) => {
          setInvitedEmail(res.email);
          setInvitedRole(res.role);
          setValue('email', res.email);
          setValue('role', res.role);
          setTokenVerified(true);
          toast.success('Invitation token verified!');
        })
        .catch((err: any) => {
          toast.error(err.message || 'Invalid or expired invitation link.');
          router.replace('/register');
        })
        .finally(() => {
          setVerifyingToken(false);
        });
    }
  }, [token, setValue, router]);

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      if (token) {
        await api.completeOnboarding({
          token,
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password,
          designation: values.designation,
          location: 'Remote',
          skills: [],
        });
        toast.success('Onboarding complete! You can now log in.');
        router.push('/login');
      } else {
        const response = await api.register(values);
        if (response && response.otp) {
          localStorage.setItem('dev_otp_auto_fill', response.otp);
        }
        toast.success('Registration successful. OTP sent to your email.');
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-slate-500 animate-pulse">Verifying teammate invitation link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12">
      <div className="w-full max-w-lg space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="flex flex-col items-center space-y-2 text-center">
          <Link href="/" className="flex items-center space-x-2 text-2xl font-bold tracking-tight mb-2">
            <Layers className="h-8 w-8 text-primary" />
            <span>ConnectHub</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Register New Workspace Profile</h2>
          <p className="text-sm text-muted-foreground">
            Fill in the details below to join the collaboration network
          </p>
        </div>

        {tokenVerified && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center space-x-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold leading-snug">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="font-bold">Teammate Invitation Active</p>
              <p className="text-[10px] opacity-90">Pre-authorized as <strong className="uppercase">{invitedRole}</strong>. Email verification bypassed.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="firstName">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="John"
                {...register('firstName')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
                  errors.firstName ? 'border-red-500' : ''
                }`}
              />
              {errors.firstName && <p className="text-xs font-medium text-red-500">{errors.firstName.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="lastName">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Doe"
                {...register('lastName')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
                  errors.lastName ? 'border-red-500' : ''
                }`}
              />
              {errors.lastName && <p className="text-xs font-medium text-red-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              readOnly={tokenVerified}
              {...register('email')}
              className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
                errors.email ? 'border-red-500' : ''
              } ${tokenVerified ? 'opacity-70 bg-slate-100 dark:bg-slate-900/60 cursor-not-allowed' : ''}`}
            />
            {errors.email && <p className="text-xs font-medium text-red-500">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="designation">
                Designation
              </label>
              <input
                id="designation"
                type="text"
                placeholder="e.g. Lead Engineer"
                {...register('designation')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
                  errors.designation ? 'border-red-500' : ''
                }`}
              />
              {errors.designation && <p className="text-xs font-medium text-red-500">{errors.designation.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="role">
                Assigned Role
              </label>
              {tokenVerified ? (
                <div className="w-full px-4 py-2.5 rounded-xl border bg-slate-100 dark:bg-slate-900/60 opacity-80 text-sm font-bold text-slate-700 dark:text-slate-350 select-none">
                  {invitedRole === 'ADMIN' ? 'Administrator' : invitedRole === 'MANAGER' ? 'Manager' : 'Employee'} (Authorized)
                  <input type="hidden" value={invitedRole} {...register('role')} />
                </div>
              ) : (
                <select
                  id="role"
                  {...register('role')}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="text"
                placeholder="+15550000"
                {...register('phone')}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full pl-4 pr-10 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
                    errors.password ? 'border-red-500' : ''
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Registering Account...</span>
              </>
            ) : (
              <span>Register Workspace Profile</span>
            )}
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-slate-500 animate-pulse">Loading workspace registration portal...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
