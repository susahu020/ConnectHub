'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
      <div className="p-4 bg-red-500/10 text-red-500 rounded-3xl border border-red-500/20 shadow-sm">
        <ShieldAlert className="h-12 w-12 stroke-1" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h2 className="text-2xl font-black tracking-tight">Access Restricted</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You do not have the required role permissions to view this administrative workspace. If this is an error, please contact your workspace administrator.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
