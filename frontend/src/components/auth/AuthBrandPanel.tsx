import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Quote } from 'lucide-react';

interface AuthBrandPanelProps {
  orgName: string;
  logoUrl?: string;
  heading: string;
  subheading: string;
  bullets: string[];
  quote?: {
    text: string;
    author: string;
    role: string;
  };
}

/**
 * Left-hand branding panel shown alongside the login/register forms on
 * desktop. Hidden on smaller screens, where the form takes the full width
 * and a compact logo header stands in for it.
 */
export default function AuthBrandPanel({ orgName, logoUrl, heading, subheading, bullets, quote }: AuthBrandPanelProps) {
  return (
    <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark text-primary-foreground flex-col justify-between p-12 xl:p-16">
      {/* Decorative dot-grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* Soft depth orbs */}
      <div className="absolute -top-32 -right-20 h-72 w-72 rounded-full bg-warm/25 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />

      <Link href="/" className="relative z-10 flex items-center space-x-2.5 w-fit hover:opacity-85 transition-opacity">
        {logoUrl ? (
          <img src={logoUrl} alt={orgName} className="h-8 w-8 rounded-full object-cover ring-1 ring-primary-foreground/25 shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-primary-foreground/15 flex items-center justify-center font-black text-sm">
            {orgName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-lg font-bold tracking-tight">{orgName}</span>
      </Link>

      <div className="relative z-10 space-y-8 max-w-md">
        <div className="space-y-4">
          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            {heading}
          </h1>
          <p className="text-primary-foreground/80 text-sm leading-relaxed">{subheading}</p>
        </div>

        <ul className="space-y-3.5">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary-foreground/90" />
              <span className="text-primary-foreground/90 leading-snug pt-0.5">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {quote ? (
        <div className="relative z-10 space-y-3 max-w-sm">
          <Quote className="h-6 w-6 text-primary-foreground/40" />
          <p className="text-sm text-primary-foreground/90 leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
          <div className="text-xs text-primary-foreground/70">
            <span className="font-bold text-primary-foreground/90">{quote.author}</span> — {quote.role}
          </div>
        </div>
      ) : (
        <div className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
          MIT Licensed • Self-Hosted • No Vendor Lock-In
        </div>
      )}
    </div>
  );
}
