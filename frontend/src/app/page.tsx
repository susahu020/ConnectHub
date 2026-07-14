'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { 
  MessageSquare, 
  Trello, 
  FolderGit2, 
  ShieldAlert, 
  BarChart3, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Layers,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  Award,
  Activity,
  TrendingUp,
  Send
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mockupTab, setMockupTab] = useState<'tasks' | 'users' | 'chats'>('tasks');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

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
          <Link href="/" id="nav-logo-link" className="flex items-center space-x-2 text-xl font-bold tracking-tight">
            <Layers className="h-6 w-6 text-primary" />
            <span>ConnectHub</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
            <a href="#features" id="nav-features-link" className="hover:text-foreground transition-all">Features</a>
            <a href="#about" id="nav-about-link" className="hover:text-foreground transition-all">About</a>
            <a href="#pricing" id="nav-pricing-link" className="hover:text-foreground transition-all">Pricing</a>
            <a href="#faq" id="nav-faq-link" className="hover:text-foreground transition-all">FAQs</a>
            <a href="#contact" id="nav-contact-link" className="hover:text-foreground transition-all">Contact</a>
          </nav>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              id="theme-toggle-btn"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0"
              title="Toggle theme"
              type="button"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <Link href="/dashboard" id="nav-dashboard-btn" className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1">
                <span>Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" id="nav-signin-btn" className="text-sm font-semibold hover:text-primary transition-all">
                  Sign In
                </Link>
                <Link href="/register" id="nav-register-btn" className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/95 transition-all shadow-md">
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
              <Link href="/register" id="hero-register-btn" className="px-6 py-3 text-base font-semibold bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-lg flex items-center space-x-2">
                <span>Start Collaborating</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#features" id="hero-learn-more-btn" className="px-6 py-3 text-base font-semibold border rounded-xl hover:bg-muted/30 transition-all">
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
                <div className="grid grid-cols-3 gap-2 select-none">
                  <div 
                    onClick={() => setMockupTab('tasks')}
                    className={`h-16 rounded border p-2 flex flex-col justify-between cursor-pointer transition-all ${
                      mockupTab === 'tasks'
                        ? 'bg-primary/10 border-primary shadow-sm scale-[1.02]'
                        : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                    }`}
                  >
                    <span className="text-[9px] text-muted-foreground font-bold">Active Tasks</span>
                    <span className="text-base font-black text-primary leading-none">12</span>
                  </div>
                  <div 
                    onClick={() => setMockupTab('users')}
                    className={`h-16 rounded border p-2 flex flex-col justify-between cursor-pointer transition-all ${
                      mockupTab === 'users'
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-sm scale-[1.02]'
                        : 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                    }`}
                  >
                    <span className="text-[9px] text-muted-foreground font-bold">Online Users</span>
                    <span className="text-base font-black text-emerald-500 leading-none">148</span>
                  </div>
                  <div 
                    onClick={() => setMockupTab('chats')}
                    className={`h-16 rounded border p-2 flex flex-col justify-between cursor-pointer transition-all ${
                      mockupTab === 'chats'
                        ? 'bg-indigo-500/10 border-indigo-500 shadow-sm scale-[1.02]'
                        : 'bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10'
                    }`}
                  >
                    <span className="text-[9px] text-muted-foreground font-bold">Open Chats</span>
                    <span className="text-base font-black text-indigo-500 leading-none">8</span>
                  </div>
                </div>

                {/* Simulated Content Window */}
                {mockupTab === 'tasks' && (
                  <div className="h-28 bg-slate-50 dark:bg-slate-900 border rounded-xl p-3 flex flex-col justify-between text-left text-[10px] space-y-1.5 overflow-hidden animate-fade-in">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100">Live Task Kanban Simulator</span>
                      <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Engineering</span>
                    </div>
                    <div className="space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="truncate">✓ Design ConnectHub DB Schema</span>
                        <span className="text-[8px] bg-green-500/10 text-green-500 px-1 rounded font-bold shrink-0">COMPLETED</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="truncate">✓ Build Socket.IO presence indicators</span>
                        <span className="text-[8px] bg-amber-500/10 text-amber-550 px-1 rounded font-bold shrink-0">IN PROGRESS</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="truncate">✓ Finalize global permissions gates</span>
                        <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1 rounded font-bold shrink-0">TO DO</span>
                      </div>
                    </div>
                  </div>
                )}

                {mockupTab === 'users' && (
                  <div className="h-28 bg-slate-50 dark:bg-slate-900 border rounded-xl p-3 flex flex-col justify-between text-left text-[10px] space-y-1.5 overflow-hidden animate-fade-in">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100">Active Presence Directory</span>
                      <span className="text-[8px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold uppercase">Online Now</span>
                    </div>
                    <div className="space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-[8px] uppercase shrink-0">AS</div>
                        <span className="truncate flex-1 font-bold text-slate-700 dark:text-slate-300">Alice Smith <span className="font-normal text-[8px] text-muted-foreground">(Admin)</span></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-[8px] uppercase shrink-0">BJ</div>
                        <span className="truncate flex-1 font-bold text-slate-700 dark:text-slate-300">Bob Jones <span className="font-normal text-[8px] text-muted-foreground">(Manager)</span></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-[8px] uppercase shrink-0">CB</div>
                        <span className="truncate flex-1 font-bold text-slate-700 dark:text-slate-300">Charlie Brown <span className="font-normal text-[8px] text-muted-foreground">(Staff)</span></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      </div>
                    </div>
                  </div>
                )}

                {mockupTab === 'chats' && (
                  <div className="h-28 bg-slate-50 dark:bg-slate-900 border rounded-xl p-3 flex flex-col justify-between text-left text-[10px] space-y-1.5 overflow-hidden animate-fade-in">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100">Live Team Messaging Lounge</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded font-bold uppercase">General Chat</span>
                    </div>
                    <div className="space-y-1.5 text-slate-650 dark:text-slate-400 overflow-y-auto">
                      <p className="leading-tight"><strong className="text-slate-750 dark:text-slate-200">Alice:</strong> Hi team, did you review the project permissions report?</p>
                      <p className="leading-tight"><strong className="text-slate-750 dark:text-slate-200">Bob:</strong> Yes, looks solid. Charlie is deploying presence check tools.</p>
                      <p className="leading-tight"><strong className="text-slate-750 dark:text-slate-200">Charlie:</strong> Live clock hooks and sidebar collapses are operational! 👍</p>
                    </div>
                  </div>
                )}
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

      {/* About Section */}
      <section id="about" className="py-24 relative overflow-hidden bg-white dark:bg-slate-900 border-b">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider">
                Our Story
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Pioneering the Next Generation of Workspaces
              </h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                ConnectHub was born out of a simple realization: modern teams waste too much time jumping between disjointed apps. By merging communication, project tracking, file storage, and analytics into a single high-velocity interface, we help organizations work smarter and faster.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Our secure-by-default architecture guarantees data integrity, while our elegant UI minimizes friction so teams can focus on what matters most: creating great results.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="border-l-4 border-primary pl-4 space-y-1">
                  <h4 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">99.99%</h4>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Uptime</p>
                </div>
                <div className="border-l-4 border-indigo-500 pl-4 space-y-1">
                  <h4 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">2.5x</h4>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team Velocity Boost</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border space-y-3 hover:shadow-md transition-all">
                  <Award className="h-6 w-6 text-primary" />
                  <h3 className="font-bold text-sm">Security First</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">JWT rotating sessions, secure bcrypt hashing, and complete data encryption.</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border space-y-3 hover:shadow-md transition-all">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                  <h3 className="font-bold text-sm">Scale Fast</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Engineered for lightweight deployment on cost-free tiers with zero overhead.</p>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border space-y-3 hover:shadow-md transition-all">
                  <Activity className="h-6 w-6 text-indigo-500" />
                  <h3 className="font-bold text-sm">Real-time Sync</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Socket-based channels, active status tracking, and instant alerts.</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border space-y-3 hover:shadow-md transition-all">
                  <Users className="h-6 w-6 text-yellow-500" />
                  <h3 className="font-bold text-sm">Team Harmony</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Shared spaces, Kanban pipelines, and fluid colleague directories.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Flexible Plans For Teams of All Sizes</h2>
              <p className="text-muted-foreground text-lg">
                Enjoy all professional grade platforms completely free of charge. No hidden fees or credit cards required.
              </p>
            </div>

            {/* BILLING TOGGLE PILL SWITCHER */}
            <div className="flex items-center justify-center space-x-3 select-none">
              <span className={`text-xs font-extrabold transition-all ${billingCycle === 'monthly' ? 'text-primary' : 'text-slate-400'}`}>Monthly Billing</span>
              <button
                type="button"
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded-full p-1 transition-all flex items-center relative"
                aria-label="Toggle billing cycle"
              >
                <div className={`h-4 w-4 bg-primary rounded-full transition-all shadow-sm ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <span className={`text-xs font-extrabold transition-all flex items-center space-x-1.5 ${billingCycle === 'yearly' ? 'text-primary' : 'text-slate-400'}`}>
                <span>Yearly Billing</span>
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-black tracking-wide uppercase">Save 20%</span>
              </span>
            </div>
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
                  
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-baseline space-x-2">
                      {billingCycle === 'yearly' && (
                        <span className="text-lg text-slate-400 line-through font-bold">
                          {plan.name === 'Starter' ? '$108' : '$228'}
                        </span>
                      )}
                      <span className="text-5xl font-extrabold text-slate-900 dark:text-slate-100">
                        {plan.name === 'Starter'
                          ? (billingCycle === 'monthly' ? '$9' : '$80')
                          : (billingCycle === 'monthly' ? '$19' : '$180')}
                      </span>
                      <span className="text-muted-foreground text-sm font-semibold">
                        / {billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    <span className="text-[9px] text-emerald-500 font-black tracking-wider uppercase leading-none">
                      {billingCycle === 'yearly' ? 'billed annually (save 20%)' : 'billed monthly'}
                    </span>
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
                    id={`pricing-cta-${plan.name.toLowerCase().replace(' ', '-')}`}
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

          <div className="space-y-4">
            {/* FAQ 1 */}
            <div 
              onClick={() => setActiveFaq(activeFaq === 0 ? null : 0)}
              id="faq-card-0"
              className="bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-sm cursor-pointer hover:border-primary/45 transition-all text-left space-y-2 select-none"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground">Can I deploy this platform on free cloud tiers?</h3>
                {activeFaq === 0 ? <ChevronUp className="h-4.5 w-4.5 text-primary shrink-0 animate-fade-in" /> : <ChevronDown className="h-4.5 w-4.5 text-slate-400 shrink-0" />}
              </div>
              {activeFaq === 0 && (
                <p className="text-muted-foreground text-xs leading-relaxed animate-fade-in pr-6">
                  Yes! The entire ConnectHub stack (NextJS, Node API, PostgreSQL, Redis, Cloudinary) is engineered to run seamlessly on the free tiers of Vercel, Render, Supabase, and Upstash.
                </p>
              )}
            </div>

            {/* FAQ 2 */}
            <div 
              onClick={() => setActiveFaq(activeFaq === 1 ? null : 1)}
              id="faq-card-1"
              className="bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-sm cursor-pointer hover:border-primary/45 transition-all text-left space-y-2 select-none"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground">How is data security handled?</h3>
                {activeFaq === 1 ? <ChevronUp className="h-4.5 w-4.5 text-primary shrink-0 animate-fade-in" /> : <ChevronDown className="h-4.5 w-4.5 text-slate-400 shrink-0" />}
              </div>
              {activeFaq === 1 && (
                <p className="text-muted-foreground text-xs leading-relaxed animate-fade-in pr-6">
                  ConnectHub utilizes production-ready JWT authentication (rotating short-lived access tokens and refresh cookies), bcrypt password hashing, and Helmet headers to protect endpoints from cross-site vulnerabilities.
                </p>
              )}
            </div>

            {/* FAQ 3 */}
            <div 
              onClick={() => setActiveFaq(activeFaq === 2 ? null : 2)}
              id="faq-card-2"
              className="bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-sm cursor-pointer hover:border-primary/45 transition-all text-left space-y-2 select-none"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground">Does the real-time system support desktop notification alerts?</h3>
                {activeFaq === 2 ? <ChevronUp className="h-4.5 w-4.5 text-primary shrink-0 animate-fade-in" /> : <ChevronDown className="h-4.5 w-4.5 text-slate-400 shrink-0" />}
              </div>
              {activeFaq === 2 && (
                <p className="text-muted-foreground text-xs leading-relaxed animate-fade-in pr-6">
                  Yes. Active presence indicators, direct message updates, and Kanban task reassignments trigger instant UI socket events and local browser notifications.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-slate-50 dark:bg-slate-950/40 relative overflow-hidden border-t border-b">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider">
              Get In Touch
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-105 animate-fade-in">We'd Love to Hear From You</h2>
            <p className="text-muted-foreground text-sm">
              Have questions, feedback, or need deployment support? Fill out the form or reach us via our details.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-12 max-w-5xl mx-auto">
            {/* Contact Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-2 bg-white dark:bg-slate-900 border p-8 rounded-3xl shadow-sm space-y-8 flex flex-col justify-between"
            >
              <div className="space-y-6 text-left">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Contact Information</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  Our professional support team responds within 24 hours to help you optimize your ConnectHub deployment.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Email Us</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">support@connecthub.com</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-500 shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Call Us</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">+1 (800) 555-CHAT</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-500 shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Visit Us</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">San Francisco, CA, USA</p>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider text-left">
                MIT Licensed • Community Driven
              </div>
            </motion.div>

            {/* Interactive Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="md:col-span-3 bg-white dark:bg-slate-900 border p-8 rounded-3xl shadow-sm relative text-left"
            >
              {contactSubmitted ? (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-10 rounded-3xl flex flex-col items-center justify-center space-y-4 p-6 text-center animate-fade-in">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full animate-bounce">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Message Sent Successfully!</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                    Thank you for reaching out, {contactName}. Our team will review your message and contact you at {contactEmail} shortly.
                  </p>
                  <button
                    onClick={() => {
                      setContactSubmitted(false);
                      setContactName('');
                      setContactEmail('');
                      setContactMessage('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all text-slate-700 dark:text-slate-350"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : null}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (contactName && contactEmail && contactMessage) {
                    api.sendContactMessage({
                      name: contactName,
                      email: contactEmail,
                      message: contactMessage
                    })
                    .then(() => {
                      setContactSubmitted(true);
                      toast.success('Message sent to administrator!');
                      setTimeout(() => {
                        setContactSubmitted(false);
                        setContactName('');
                        setContactEmail('');
                        setContactMessage('');
                      }, 5000);
                    })
                    .catch(() => {
                      toast.error('Failed to send message. Please try again.');
                    });
                  } else {
                    toast.error('Please fill in all contact fields.');
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label htmlFor="contact-name" className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border-slate-150 dark:border-slate-850 focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-email" className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    id="contact-email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border-slate-150 dark:border-slate-850 focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-message" className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Message</label>
                  <textarea
                    id="contact-message"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border-slate-150 dark:border-slate-850 focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all text-slate-800 dark:text-slate-200 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/10 hover:shadow-lg transition-all flex items-center justify-center space-x-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Message</span>
                </button>
              </form>
            </motion.div>
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
