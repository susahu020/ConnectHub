'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Trello, 
  FolderGit2, 
  ShieldAlert, 
  BarChart3, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';
import { useAuthStore } from '../lib/store';

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  const features = [
    {
      icon: <MessageSquare className="h-6 w-6 text-primary" />,
      title: 'Real-time Chat & Channels',
      description: 'Instant direct messaging, typing indicators, read receipts, and custom group channels for departments.',
    },
    {
      icon: <Trello className="h-6 w-6 text-emerald-500" />,
      title: 'Kanban Task Board',
      description: 'Organize team tasks across statuses, manage assignees, priority indicators, and progress meters.',
    },
    {
      icon: <FolderGit2 className="h-6 w-6 text-indigo-500" />,
      title: 'Secure File Explorer',
      description: 'Hierarchical file folders, version logs, inline file previews, and cloud backups.',
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-yellow-500" />,
      title: 'Department Analytics',
      description: 'Actionable reports showing department task velocities, engagement logs, and active sessions.',
    },
    {
      icon: <ShieldAlert className="h-6 w-6 text-red-500" />,
      title: 'Enterprise Security & RBAC',
      description: 'Strict Role-Based Access Control, session revocation, secure JWT rotation, and audit logs.',
    },
    {
      icon: <Users className="h-6 w-6 text-purple-500" />,
      title: 'Active Presence Directory',
      description: 'Filter directory by roles, department, and see online/offline presence indicators instantly.',
    },
  ];

  const pricing = [
    {
      name: 'Starter',
      price: '$0',
      description: 'Ideal for small startups and trial teams looking to coordinate.',
      features: [
        'Up to 10 team members',
        'Direct messaging & group chats',
        'Standard Kanban task boards',
        'Basic local file uploads (2MB)',
        '30 days of message history logs',
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      name: 'Business Pro',
      price: '$0',
      description: 'All premium collaboration features deployed on free service tiers.',
      features: [
        'Unlimited team members',
        'Custom department & project channels',
        'Advanced Kanban with due dates',
        'Cloudinary backups (50MB uploads)',
        'Full administrative audit log tracing',
        'Export reports in PDF, CSV, Excel',
      ],
      cta: 'Deploy ConnectHub Now',
      popular: true,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight">
            <Layers className="h-6 w-6 text-primary" />
            <span>ConnectHub</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-all">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-all">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-all">FAQs</a>
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1">
                <span>Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold hover:text-primary transition-all">
                  Sign In
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/95 transition-all shadow-md">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-indigo-500/5">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider">
              Version 1.0 Live
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Enterprise Hub for <span className="text-primary bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Seamless</span> Collaboration
            </h1>
            <p className="text-lg text-muted-foreground">
              A comprehensive communication platform merging instant messaging, file drives, Kanban workflows, and administrative audits into a single portal.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="/register" className="px-6 py-3 text-base font-semibold bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-lg flex items-center space-x-2">
                <span>Start Collaborating</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#features" className="px-6 py-3 text-base font-semibold border rounded-xl hover:bg-muted/30 transition-all">
                Learn More
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative glass rounded-2xl border p-4 shadow-2xl bg-white/70 dark:bg-slate-900/50"
          >
            <div className="h-72 md:h-96 w-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden border">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-indigo-500/10" />
              {/* Dashboard Placeholder Mockup */}
              <div className="absolute top-4 left-4 right-4 bg-white dark:bg-slate-950 rounded-lg shadow-lg border p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-red-400 rounded-full" />
                    <div className="h-3 w-3 bg-yellow-400 rounded-full" />
                    <div className="h-3 w-3 bg-green-400 rounded-full" />
                  </div>
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 bg-primary/5 rounded border border-primary/20 p-2 flex flex-col justify-between">
                    <span className="text-[10px] text-muted-foreground">Active Tasks</span>
                    <span className="text-lg font-bold text-primary">12</span>
                  </div>
                  <div className="h-16 bg-emerald-500/5 rounded border border-emerald-500/20 p-2 flex flex-col justify-between">
                    <span className="text-[10px] text-muted-foreground">Online Users</span>
                    <span className="text-lg font-bold text-emerald-500">148</span>
                  </div>
                  <div className="h-16 bg-indigo-500/5 rounded border border-indigo-500/20 p-2 flex flex-col justify-between">
                    <span className="text-[10px] text-muted-foreground">Open Chats</span>
                    <span className="text-lg font-bold text-indigo-500">8</span>
                  </div>
                </div>
                <div className="h-24 bg-slate-50 dark:bg-slate-900 border rounded p-2 flex items-center space-x-3">
                  <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50 dark:bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything You Need in One Place</h2>
            <p className="text-muted-foreground text-lg">
              No need to switch between Slack, Trello, and Google Drive anymore. ConnectHub incorporates everything you need to keep teams aligned.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm space-y-4 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-slate-50 dark:bg-slate-800 w-fit rounded-xl">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Flexible Plans For Teams of All Sizes</h2>
            <p className="text-muted-foreground text-lg">
              Enjoy all professional grade platforms completely free of charge. No hidden fees or credit cards required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricing.map((plan, i) => (
              <div
                key={i}
                className={`bg-white dark:bg-slate-900 border rounded-3xl p-8 flex flex-col justify-between shadow-sm relative ${
                  plan.popular ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 right-6 bg-primary text-white text-xs px-3 py-1 rounded-full font-bold uppercase">
                    Most Popular
                  </span>
                )}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-5xl font-extrabold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/ month</span>
                  </div>
                  <hr />
                  <ul className="space-y-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {plan.features.map((feat, j) => (
                      <li key={j} className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/register"
                    className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all shadow-md ${
                      plan.popular
                        ? 'bg-primary text-white hover:bg-primary/95'
                        : 'border hover:bg-muted/30'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-slate-50 dark:bg-slate-950/40">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Have questions about ConnectHub? We have answers.</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm">
              <h3 className="font-semibold text-lg">Can I deploy this platform on free cloud tiers?</h3>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                Yes! The entire ConnectHub stack (NextJS, Node API, PostgreSQL, Redis, Cloudinary) is engineered to run seamlessly on the free tiers of Vercel, Render, Supabase, and Upstash.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm">
              <h3 className="font-semibold text-lg">How is data security handled?</h3>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                ConnectHub utilizes production-ready JWT authentication (rotating short-lived access tokens and refresh cookies), bcrypt password hashing, and Helmet headers to protect endpoints from cross-site vulnerabilities.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm">
              <h3 className="font-semibold text-lg">Does the real-time system support desktop notification alerts?</h3>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                Yes. Active presence indicators, direct message updates, and Kanban task reassignments trigger instant UI socket events and local browser notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2 text-foreground font-bold">
            <Layers className="h-5 w-5 text-primary" />
            <span>ConnectHub</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} ConnectHub. Licensed under MIT.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
