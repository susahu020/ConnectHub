'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Layers, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { api } from '../../../services/api';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';
import { passwordZodSchema, PASSWORD_HINT } from '../../../lib/passwordPolicy';
import AuthBrandPanel from '../../../components/auth/AuthBrandPanel';
import { PasswordStrengthMeter } from '../../../components/auth/PasswordStrengthMeter';
import { useRetryCountdown } from '../../../hooks/useRetryCountdown';
import { RetryCountdownBanner } from '../../../components/auth/RetryCountdownBanner';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  designation: z.string().min(1, 'Designation is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  password: passwordZodSchema,
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { settings: orgSettings } = useOrganizationSettings();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [invitedRole, setInvitedRole] = useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const registerRetry = useRetryCountdown();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      if (error.retryAfterSeconds) {
        registerRetry.start(error.retryAfterSeconds);
      }
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Verifying teammate invitation link...</p>
      </div>
    );
  }

  // No invite token, workspace already has an Admin, and this org has locked
  // registration to invite-only — there's nothing this page can do for a
  // walk-up visitor except point them at their administrator.
  const registrationBlocked = !token && !orgSettings.needsInitialSetup && orgSettings.registrationMode === 'INVITE_ONLY';
  if (registrationBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md space-y-5 bg-card p-8 rounded-3xl border shadow-sm text-center">
          <div className="flex flex-col items-center space-y-2">
            {orgSettings.logoUrl ? (
              <img src={orgSettings.logoUrl} alt={orgSettings.orgName} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <Layers className="h-10 w-10 text-primary" />
            )}
            <span className="text-xl font-bold">{orgSettings.orgName}</span>
          </div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>This workspace is invite-only</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {orgSettings.orgName} isn&apos;t open to public sign-ups. If you&apos;re joining a team here, ask an
            administrator or your manager to send you an invitation email — it'll bring you straight back to this
            page with everything pre-filled.
          </p>
          <Link href="/login" className="inline-block font-semibold text-primary hover:underline text-sm">
            Back to Sign In
          </Link>
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AuthBrandPanel
        orgName={orgSettings.orgName}
        logoUrl={orgSettings.logoUrl}
        heading={tokenVerified ? "You've been invited" : `Join ${orgSettings.orgName}`}
        subheading={
          tokenVerified
            ? 'Finish setting up your profile to start chatting, tracking tasks, and collaborating with your team.'
            : 'Bring your team\'s chat, tasks, files, and reporting into one workspace — set up in minutes.'
        }
        bullets={[
          'Unlimited channels and direct messages',
          'Kanban boards, calendars, and file storage',
          'Role-based access control out of the box',
        ]}
        quote={{
          text: 'The Kanban board and file explorer alone replaced two separate subscriptions for us.',
          author: 'Marcus Webb',
          role: 'Engineering Manager',
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

        <div className="w-full max-w-lg space-y-6">
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
              Create your account
            </h2>
            <p className="text-sm text-muted-foreground">
              Fill in the details below to join the collaboration network.
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
                className={`w-full px-4 py-2.5 rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
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
                className={`w-full px-4 py-2.5 rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
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
              tabIndex={tokenVerified ? -1 : 0}
              {...register('email')}
              className={`w-full px-4 py-2.5 rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
                errors.email ? 'border-red-500' : ''
              } ${tokenVerified ? 'opacity-70 bg-muted cursor-not-allowed pointer-events-none select-none' : ''}`}
            />
            {errors.email && <p className="text-xs font-medium text-red-500">{errors.email.message}</p>}
            {!tokenVerified && !orgSettings.needsInitialSetup && orgSettings.registrationMode === 'DOMAIN_RESTRICTED' && orgSettings.allowedDomains.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Self-signup is limited to: {orgSettings.allowedDomains.map((d) => `@${d}`).join(', ')}
              </p>
            )}
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
                className={`w-full px-4 py-2.5 rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
                  errors.designation ? 'border-red-500' : ''
                }`}
              />
              {errors.designation && <p className="text-xs font-medium text-red-500">{errors.designation.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Assigned Role
              </label>
              {/* The server always decides the role itself (see auth.controller.ts
                  register() / invitation.controller.ts completeOnboarding) — an
                  editable dropdown here would be misleading since nothing the
                  visitor picks is actually honored. Show what will really happen. */}
              <div className="w-full px-4 py-2.5 rounded-xl border bg-muted text-sm font-semibold text-muted-foreground">
                {tokenVerified
                  ? invitedRole === 'ADMIN' ? 'Administrator' : invitedRole === 'MANAGER' ? 'Manager' : 'Employee'
                  : orgSettings.needsInitialSetup
                    ? 'Administrator (first account sets up the workspace)'
                    : 'Employee'}
              </div>
              <input type="hidden" {...register('role')} />
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
                className="w-full px-4 py-2.5 rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
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
                  className={`w-full pl-4 pr-10 py-2.5 rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm ${
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
              {errors.password ? (
                <p className="text-xs font-medium text-red-500">{errors.password.message}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">{PASSWORD_HINT}</p>
              )}
              <PasswordStrengthMeter password={watch('password') || ''} />
            </div>
          </div>

          <RetryCountdownBanner secondsLeft={registerRetry.secondsLeft} />
          <button
            type="submit"
            disabled={loading || registerRetry.isBlocked}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Registering Account...</span>
              </>
            ) : registerRetry.isBlocked ? (
              <span>Try again in {registerRetry.secondsLeft}s</span>
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
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Loading workspace registration portal...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
