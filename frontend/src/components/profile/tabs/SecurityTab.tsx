import React from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export function SecurityTab({ profile }: { profile: any }) {
  const router = useRouter();

  return (
    <div className="bg-card dark:bg-card border dark:border-border rounded-3xl p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">Account Credentials & Security</h3>
        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Manage session tokens, password rules, and 2FA status.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted dark:bg-card/40 rounded-2xl border dark:border-border text-xs font-semibold">
          <div className="space-y-1">
            <p className="font-extrabold text-foreground uppercase tracking-wider text-[10px]">Two-Factor Authentication (2FA)</p>
            <p className="text-muted-foreground font-medium">Adds an extra layer of verify locks to your login entries.</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${profile?.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {profile?.twoFactorEnabled ? 'Active' : 'Disabled'}
          </span>
        </div>

        <div className="p-4 border dark:border-border rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Security Settings Links</span>
          </div>
          <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
            To modify your login passcodes, enable OTP double lockouts, or disconnect old device sessions, visit the main settings page.
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="px-3.5 py-2 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card text-foreground dark:text-foreground rounded-xl text-xs font-extrabold transition-all"
          >
            Go to Settings Console
          </button>
        </div>
      </div>
    </div>
  );
}
