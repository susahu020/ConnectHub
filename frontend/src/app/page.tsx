'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  Globe,
  Award,
  Activity,
  TrendingUp,
  Send,
  Star,
  Quote,
  Github,
  Twitter,
  Linkedin,
  ArrowUp,
  KeyRound,
  Menu,
  X,
  UserPlus,
  Kanban,
  Rocket,
  Minus
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';
import { useOrganizationSettings } from '../hooks/useOrganizationSettings';

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { settings: orgSettings } = useOrganizationSettings();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mockupTab, setMockupTab] = useState<'tasks' | 'users' | 'chats'>('tasks');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#features', id: 'features', label: 'Features' },
    { href: '#about', id: 'about', label: 'About' },
    { href: '#pricing', id: 'pricing', label: 'Pricing' },
    { href: '#faq', id: 'faq', label: 'FAQs' },
    { href: '#contact', id: 'contact', label: 'Contact' },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  useEffect(() => {
    const sections = navLinks
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const trustedByOrgs = ['Northwind Traders', 'Acme Robotics', 'Vantage Labs', 'Blue Harbor Co', 'Nimbus Health', 'Aster & Finch'];

  const comparisonRows: { label: string; us: boolean | string; others: boolean | string }[] = [
    { label: 'Real-time chat & channels', us: true, others: true },
    { label: 'Kanban task boards', us: true, others: true },
    { label: 'File storage & sharing', us: true, others: true },
    { label: 'One unified login for chat, tasks & files', us: true, others: false },
    { label: 'Built-in HR & org-chart tools', us: true, others: false },
    { label: 'Cross-module analytics & audit logs', us: true, others: false },
    { label: 'Self-hosted, no vendor lock-in', us: true, others: false },
    { label: 'Per-seat pricing required', us: false, others: true },
  ];

  const testimonials = [
    {
      quote: `Switching to ${orgSettings.orgName} cut the number of tools our team juggles from five down to one. Onboarding new hires now takes an afternoon instead of a week.`,
      name: 'Priya Nathan',
      role: 'Head of Operations, Vantage Labs',
      initials: 'PN',
    },
    {
      quote: 'The Kanban board and file explorer alone replaced two separate subscriptions for us. Having audit logs baked in made our security review painless.',
      name: 'Marcus Webb',
      role: 'Engineering Manager, Northwind Traders',
      initials: 'MW',
    },
    {
      quote: "Presence indicators and instant chat sound small, but they've genuinely changed how fast our distributed team moves. It feels like everyone's in the same room.",
      name: 'Sara Kimathi',
      role: 'People Lead, Nimbus Health',
      initials: 'SK',
    },
  ];

  const faqs = [
    {
      q: 'Can I deploy this platform on free cloud tiers?',
      a: `Yes! The entire ${orgSettings.orgName} stack (NextJS, Node API, PostgreSQL, Redis, Cloudinary) is engineered to run seamlessly on the free tiers of Vercel, Render, Supabase, and Upstash.`,
    },
    {
      q: 'How is data security handled?',
      a: `${orgSettings.orgName} utilizes production-ready JWT authentication (rotating short-lived access tokens and refresh cookies), bcrypt password hashing, and Helmet headers to protect endpoints from cross-site vulnerabilities.`,
    },
    {
      q: 'Does the real-time system support desktop notification alerts?',
      a: 'Yes. Active presence indicators, direct message updates, and Kanban task reassignments trigger instant UI socket events and local browser notifications.',
    },
    {
      q: 'Can we migrate our existing data in, or export it later?',
      a: 'Administrators can export tasks, files, and audit history to PDF, CSV, or Excel at any time from the Analytics and Admin panels, so your data is never locked in.',
    },
    {
      q: 'Does it support single sign-on?',
      a: 'Google SSO is available out of the box, alongside standard email/password and one-time-passcode sign-in, so teams can enforce whichever policy fits their org.',
    },
    {
      q: 'What happens if we outgrow the free tier?',
      a: 'Because the stack is self-hosted and open source, scaling up is just a matter of upgrading your own infrastructure — there is no vendor lock-in or forced plan migration.',
    },
  ];

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
      icon: <FolderGit2 className="h-6 w-6 text-primary" />,
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
      cta: `Deploy ${orgSettings.orgName} Now`,
      popular: true,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" id="nav-logo-link" className="flex items-center space-x-2 text-xl font-bold tracking-tight">
            {orgSettings.logoUrl ? (
              <img src={orgSettings.logoUrl} alt={orgSettings.orgName} className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <Layers className="h-6 w-6 text-primary" />
            )}
            <span>{orgSettings.orgName}</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                id={`nav-${link.id}-link`}
                className={`transition-all ${activeSection === link.id ? 'text-primary font-semibold' : 'hover:text-foreground'}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              id="theme-toggle-btn"
              className="p-2 hover:bg-muted dark:hover:bg-card rounded-xl transition-all shrink-0"
              title="Toggle theme"
              type="button"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <Link href="/dashboard" id="nav-dashboard-btn" className="hidden sm:flex px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 transition-all shadow-md items-center space-x-1">
                <span>Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" id="nav-signin-btn" className="hidden sm:block text-sm font-semibold hover:text-primary transition-all">
                  Sign In
                </Link>
                <Link href="/register" id="nav-register-btn" className="hidden sm:block px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 transition-all shadow-md">
                  Register
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              id="mobile-menu-toggle-btn"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              type="button"
              className="md:hidden p-2 hover:bg-muted dark:hover:bg-card rounded-xl transition-all shrink-0"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden glass border-t overflow-hidden"
            >
              <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col space-y-1 text-sm font-medium">
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-2.5 px-2 rounded-lg transition-all ${activeSection === link.id ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground hover:bg-muted dark:hover:bg-card'}`}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-3 mt-2 border-t flex flex-col space-y-2 sm:hidden">
                  {isAuthenticated ? (
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg text-center shadow-md">
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 text-sm font-semibold border rounded-lg text-center">
                        Sign In
                      </Link>
                      <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg text-center shadow-md">
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-warm/5">
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
              Enterprise Hub for <span className="text-primary bg-gradient-to-r from-primary to-warm bg-clip-text text-transparent">Seamless</span> Collaboration
            </h1>
            <p className="text-lg text-muted-foreground">
              A comprehensive communication platform merging instant messaging, file drives, Kanban workflows, and administrative audits into a single portal.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="/register" id="hero-register-btn" className="px-6 py-3 text-base font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 transition-all shadow-lg flex items-center space-x-2">
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
            className="relative glass rounded-2xl border p-4 shadow-2xl bg-card/70 dark:bg-card/50"
          >
            <div className="h-72 md:h-96 w-full bg-muted dark:bg-card rounded-xl flex items-center justify-center relative overflow-hidden border">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-warm/10" />
              {/* Dashboard Placeholder Mockup */}
              <div className="absolute top-4 left-4 right-4 bg-card dark:bg-card rounded-lg shadow-lg border p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-red-400 rounded-full" />
                    <div className="h-3 w-3 bg-yellow-400 rounded-full" />
                    <div className="h-3 w-3 bg-green-400 rounded-full" />
                  </div>
                  <div className="h-4 w-32 bg-secondary dark:bg-card rounded" />
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
                        ? 'bg-primary/10 border-primary shadow-sm scale-[1.02]'
                        : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                    }`}
                  >
                    <span className="text-[9px] text-muted-foreground font-bold">Open Chats</span>
                    <span className="text-base font-black text-primary leading-none">8</span>
                  </div>
                </div>

                {/* Simulated Content Window */}
                {mockupTab === 'tasks' && (
                  <div className="h-28 bg-muted dark:bg-card border rounded-xl p-3 flex flex-col justify-between text-left text-[10px] space-y-1.5 overflow-hidden animate-fade-in">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-bold text-[11px] text-foreground dark:text-foreground">Live Task Kanban Simulator</span>
                      <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Engineering</span>
                    </div>
                    <div className="space-y-1 text-muted-foreground dark:text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span className="truncate">✓ Design {orgSettings.orgName} DB Schema</span>
                        <span className="text-[8px] bg-green-500/10 text-green-500 px-1 rounded font-bold shrink-0">COMPLETED</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="truncate">✓ Build Socket.IO presence indicators</span>
                        <span className="text-[8px] bg-amber-500/10 text-amber-550 px-1 rounded font-bold shrink-0">IN PROGRESS</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="truncate">✓ Finalize global permissions gates</span>
                        <span className="text-[8px] bg-muted dark:bg-card px-1 rounded font-bold shrink-0">TO DO</span>
                      </div>
                    </div>
                  </div>
                )}

                {mockupTab === 'users' && (
                  <div className="h-28 bg-muted dark:bg-card border rounded-xl p-3 flex flex-col justify-between text-left text-[10px] space-y-1.5 overflow-hidden animate-fade-in">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-bold text-[11px] text-foreground dark:text-foreground">Active Presence Directory</span>
                      <span className="text-[8px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold uppercase">Online Now</span>
                    </div>
                    <div className="space-y-1 text-muted-foreground dark:text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-[8px] uppercase shrink-0">AS</div>
                        <span className="truncate flex-1 font-bold text-foreground dark:text-foreground">Alice Smith <span className="font-normal text-[8px] text-muted-foreground">(Admin)</span></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-[8px] uppercase shrink-0">BJ</div>
                        <span className="truncate flex-1 font-bold text-foreground dark:text-foreground">Bob Jones <span className="font-normal text-[8px] text-muted-foreground">(Manager)</span></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-[8px] uppercase shrink-0">CB</div>
                        <span className="truncate flex-1 font-bold text-foreground dark:text-foreground">Charlie Brown <span className="font-normal text-[8px] text-muted-foreground">(Staff)</span></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      </div>
                    </div>
                  </div>
                )}

                {mockupTab === 'chats' && (
                  <div className="h-28 bg-muted dark:bg-card border rounded-xl p-3 flex flex-col justify-between text-left text-[10px] space-y-1.5 overflow-hidden animate-fade-in">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-bold text-[11px] text-foreground dark:text-foreground">Live Team Messaging Lounge</span>
                      <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">General Chat</span>
                    </div>
                    <div className="space-y-1.5 text-muted-foreground dark:text-muted-foreground overflow-y-auto">
                      <p className="leading-tight"><strong className="text-foreground dark:text-foreground">Alice:</strong> Hi team, did you review the project permissions report?</p>
                      <p className="leading-tight"><strong className="text-foreground dark:text-foreground">Bob:</strong> Yes, looks solid. Charlie is deploying presence check tools.</p>
                      <p className="leading-tight"><strong className="text-foreground dark:text-foreground">Charlie:</strong> Live clock hooks and sidebar collapses are operational! 👍</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trusted By Strip */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="py-10 border-y bg-card dark:bg-card"
      >
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">
            Trusted by fast-moving teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {trustedByOrgs.map((org) => (
              <span key={org} className="text-sm md:text-base font-bold tracking-tight text-muted-foreground/70 dark:text-muted-foreground/60 select-none">
                {org}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider">
              Get Started
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Up and Running in Three Steps</h2>
            <p className="text-muted-foreground text-lg">
              No lengthy onboarding calls or setup fees — most teams are chatting and assigning tasks within the hour.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-border" />
            {[
              {
                icon: <UserPlus className="h-6 w-6" />,
                step: '01',
                title: 'Create your workspace',
                description: 'Register your organization, invite your team by email, and set roles in under two minutes.',
              },
              {
                icon: <Kanban className="h-6 w-6" />,
                step: '02',
                title: 'Set up your channels & boards',
                description: 'Spin up department channels, import your first Kanban board, and connect your file drive.',
              },
              {
                icon: <Rocket className="h-6 w-6" />,
                step: '03',
                title: 'Start collaborating',
                description: 'Chat in real time, assign tasks, share files, and track progress from one shared dashboard.',
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative text-center space-y-4"
              >
                <div className="relative z-10 mx-auto h-16 w-16 rounded-2xl bg-card dark:bg-card border-2 border-primary/20 shadow-sm flex items-center justify-center text-primary">
                  {s.icon}
                </div>
                <span className="text-xs font-black text-primary/50 tracking-widest">STEP {s.step}</span>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-muted dark:bg-card/40">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything You Need in One Place</h2>
            <p className="text-muted-foreground text-lg">
              No need to switch between Slack, Trello, and Google Drive anymore. {orgSettings.orgName} incorporates everything you need to keep teams aligned.
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
                className="bg-card dark:bg-card p-6 rounded-2xl border shadow-sm space-y-4 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-muted dark:bg-card w-fit rounded-xl">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider">
              What Teams Say
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Loved by the People Who Use It Daily</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="bg-card dark:bg-card p-6 rounded-2xl border shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Quote className="h-6 w-6 text-primary/40" />
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className="h-3.5 w-3.5 text-warm fill-warm" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-muted dark:bg-card/40">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider">
              Why Switch
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">One Workspace vs. a Pile of Subscriptions</h2>
            <p className="text-muted-foreground text-lg">
              Most teams stitch together a chat app, a task board, and a file drive separately. Here&apos;s what changes when they live in one place.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-card dark:bg-card border rounded-3xl shadow-sm overflow-hidden"
          >
            <div className="grid grid-cols-3 border-b bg-muted/60 dark:bg-card/60">
              <div className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Capability</div>
              <div className="p-4 text-center text-xs font-black text-primary uppercase tracking-wider border-l">{orgSettings.orgName}</div>
              <div className="p-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider border-l">Typical Multi-Tool Stack</div>
            </div>
            {comparisonRows.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 ${i !== comparisonRows.length - 1 ? 'border-b' : ''}`}>
                <div className="p-4 text-sm font-medium text-foreground flex items-center">{row.label}</div>
                <div className="p-4 flex items-center justify-center border-l bg-primary/5">
                  {row.us === true ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : row.us === false ? (
                    <Minus className="h-5 w-5 text-muted-foreground/50" />
                  ) : (
                    <span className="text-xs font-bold text-foreground">{row.us}</span>
                  )}
                </div>
                <div className="p-4 flex items-center justify-center border-l">
                  {row.others === true ? (
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground/60" />
                  ) : row.others === false ? (
                    <Minus className="h-5 w-5 text-muted-foreground/50" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">{row.others}</span>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 relative overflow-hidden bg-card dark:bg-card border-b">
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
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground dark:text-foreground">
                Pioneering the Next Generation of Workspaces
              </h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {orgSettings.orgName} was born out of a simple realization: modern teams waste too much time jumping between disjointed apps. By merging communication, project tracking, file storage, and analytics into a single high-velocity interface, we help organizations work smarter and faster.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Our secure-by-default architecture guarantees data integrity, while our elegant UI minimizes friction so teams can focus on what matters most: creating great results.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="border-l-4 border-primary pl-4 space-y-1">
                  <h4 className="text-2xl font-extrabold text-foreground dark:text-foreground">99.99%</h4>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Uptime</p>
                </div>
                <div className="border-l-4 border-primary pl-4 space-y-1">
                  <h4 className="text-2xl font-extrabold text-foreground dark:text-foreground">2.5x</h4>
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
                <div className="bg-muted dark:bg-card p-6 rounded-2xl border space-y-3 hover:shadow-md transition-all">
                  <Award className="h-6 w-6 text-primary" />
                  <h3 className="font-bold text-sm">Security First</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">JWT rotating sessions, secure bcrypt hashing, and complete data encryption.</p>
                </div>
                <div className="bg-muted dark:bg-card p-6 rounded-2xl border space-y-3 hover:shadow-md transition-all">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                  <h3 className="font-bold text-sm">Scale Fast</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Engineered for lightweight deployment on cost-free tiers with zero overhead.</p>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="bg-muted dark:bg-card p-6 rounded-2xl border space-y-3 hover:shadow-md transition-all">
                  <Activity className="h-6 w-6 text-primary" />
                  <h3 className="font-bold text-sm">Real-time Sync</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Socket-based channels, active status tracking, and instant alerts.</p>
                </div>
                <div className="bg-muted dark:bg-card p-6 rounded-2xl border space-y-3 hover:shadow-md transition-all">
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
              <span className={`text-xs font-extrabold transition-all ${billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>Monthly Billing</span>
              <button
                type="button"
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="w-12 h-6 bg-secondary dark:bg-card rounded-full p-1 transition-all flex items-center relative"
                aria-label="Toggle billing cycle"
              >
                <div className={`h-4 w-4 bg-primary rounded-full transition-all shadow-sm ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <span className={`text-xs font-extrabold transition-all flex items-center space-x-1.5 ${billingCycle === 'yearly' ? 'text-primary' : 'text-muted-foreground'}`}>
                <span>Yearly Billing</span>
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-black tracking-wide uppercase">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricing.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`bg-card dark:bg-card border rounded-3xl p-8 flex flex-col justify-between shadow-sm relative ${
                  plan.popular ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 right-6 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-bold uppercase">
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
                        <span className="text-lg text-muted-foreground line-through font-bold">
                          {plan.name === 'Starter' ? '$108' : '$228'}
                        </span>
                      )}
                      <span className="text-5xl font-extrabold text-foreground dark:text-foreground">
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
                  <ul className="space-y-3 text-sm font-medium text-muted-foreground dark:text-muted-foreground">
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
                        ? 'bg-primary text-primary-foreground hover:bg-primary/95'
                        : 'border hover:bg-muted/30'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-muted dark:bg-card/40">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Have questions about {orgSettings.orgName}? We have answers.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                id={`faq-card-${i}`}
                className="bg-card dark:bg-card border p-5 rounded-2xl shadow-sm cursor-pointer hover:border-primary/45 transition-all text-left space-y-2 select-none"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-bold text-base text-foreground">{faq.q}</h3>
                  {activeFaq === i ? <ChevronUp className="h-4.5 w-4.5 text-primary shrink-0" /> : <ChevronDown className="h-4.5 w-4.5 text-muted-foreground shrink-0" />}
                </div>
                <AnimatePresence initial={false}>
                  {activeFaq === i && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-muted-foreground text-xs leading-relaxed pr-6 overflow-hidden"
                    >
                      {faq.a}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-muted dark:bg-card/40 relative overflow-hidden border-t border-b">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider">
              Get In Touch
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground dark:text-foreground animate-fade-in">We'd Love to Hear From You</h2>
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
              className="md:col-span-2 bg-card dark:bg-card border p-8 rounded-3xl shadow-sm space-y-8 flex flex-col justify-between"
            >
              <div className="space-y-6 text-left">
                <h3 className="text-xl font-bold text-foreground dark:text-foreground">Contact Information</h3>
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground leading-relaxed">
                  Our professional support team responds within 24 hours to help you optimize your {orgSettings.orgName} deployment.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider block">Email Us</span>
                    <p className="text-xs font-bold text-foreground dark:text-foreground">{orgSettings.supportEmail || 'support@connecthub.com'}</p>
                  </div>
                </div>

                {orgSettings.supportPhone && (
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-500 shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider block">Call Us</span>
                      <p className="text-xs font-bold text-foreground dark:text-foreground">{orgSettings.supportPhone}</p>
                    </div>
                  </div>
                )}

                {orgSettings.address && (
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider block">Visit Us</span>
                      <p className="text-xs font-bold text-foreground dark:text-foreground">{orgSettings.address}</p>
                    </div>
                  </div>
                )}

                {orgSettings.website && (
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-500 shrink-0">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider block">Visit Online</span>
                      <p className="text-xs font-bold text-foreground dark:text-foreground">{orgSettings.website.replace(/^https?:\/\//, '')}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider text-left">
                MIT Licensed • Community Driven
              </div>
            </motion.div>

            {/* Interactive Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="md:col-span-3 bg-card dark:bg-card border p-8 rounded-3xl shadow-sm relative text-left"
            >
              {contactSubmitted ? (
                <div className="absolute inset-0 bg-card/95 dark:bg-card/95 z-10 rounded-3xl flex flex-col items-center justify-center space-y-4 p-6 text-center animate-fade-in">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full animate-bounce">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground dark:text-foreground">Message Sent Successfully!</h3>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground max-w-xs leading-relaxed">
                    Thank you for reaching out, {contactName}. Our team will review your message and contact you at {contactEmail} shortly.
                  </p>
                  <button
                    onClick={() => {
                      setContactSubmitted(false);
                      setContactName('');
                      setContactEmail('');
                      setContactMessage('');
                    }}
                    className="px-4 py-2 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card rounded-xl text-xs font-bold transition-all text-foreground dark:text-foreground"
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
                  <label htmlFor="contact-name" className="text-[10px] font-black text-muted-foreground dark:text-muted-foreground uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border bg-muted dark:bg-card focus:bg-card dark:focus:bg-card border-border dark:border-border focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all text-foreground dark:text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-email" className="text-[10px] font-black text-muted-foreground dark:text-muted-foreground uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    id="contact-email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border bg-muted dark:bg-card focus:bg-card dark:focus:bg-card border-border dark:border-border focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all text-foreground dark:text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-message" className="text-[10px] font-black text-muted-foreground dark:text-muted-foreground uppercase tracking-wider block">Message</label>
                  <textarea
                    id="contact-message"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border bg-muted dark:bg-card focus:bg-card dark:focus:bg-card border-border dark:border-border focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all text-foreground dark:text-foreground resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-xl shadow-md shadow-primary/10 hover:shadow-lg transition-all flex items-center justify-center space-x-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Message</span>
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 border-t">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-primary/10 via-card to-warm/10 dark:from-primary/15 dark:via-card dark:to-warm/10 border rounded-3xl p-8 md:p-10 text-center space-y-5"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight">Get Product Updates in Your Inbox</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Occasional notes on new features and releases. No spam, unsubscribe any time.
              </p>
            </div>

            {newsletterSubmitted ? (
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-500 py-2.5">
                <CheckCircle2 className="h-5 w-5" />
                <span>You&apos;re on the list — thanks for subscribing!</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newsletterEmail) {
                    toast.error('Please enter your email address.');
                    return;
                  }
                  setNewsletterLoading(true);
                  api.sendContactMessage({
                    name: 'Newsletter Signup',
                    email: newsletterEmail,
                    message: `Please add ${newsletterEmail} to the product updates newsletter.`,
                  })
                    .then(() => {
                      setNewsletterSubmitted(true);
                      toast.success('Subscribed to product updates!');
                    })
                    .catch(() => toast.error('Something went wrong. Please try again.'))
                    .finally(() => setNewsletterLoading(false));
                }}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  required
                  className="flex-1 px-4 py-3 text-sm rounded-xl border bg-card focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all text-foreground"
                />
                <button
                  type="submit"
                  disabled={newsletterLoading}
                  className="px-5 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/95 transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-1.5 shrink-0"
                >
                  {newsletterLoading ? 'Subscribing…' : 'Subscribe'}
                  {!newsletterLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card dark:bg-card border-t">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center space-x-2 text-foreground font-bold text-lg">
                {orgSettings.logoUrl ? (
                  <img src={orgSettings.logoUrl} alt={orgSettings.orgName} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <Layers className="h-6 w-6 text-primary" />
                )}
                <span>{orgSettings.orgName}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                {orgSettings.tagline}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a href="#" aria-label="GitHub" className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                  <Github className="h-4 w-4" />
                </a>
                <a href="#" aria-label="Twitter / X" className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" aria-label="LinkedIn" className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product</h4>
              <div className="flex flex-col space-y-2.5 text-sm text-muted-foreground">
                <a href="#features" className="hover:text-foreground transition-all w-fit">Features</a>
                <a href="#pricing" className="hover:text-foreground transition-all w-fit">Pricing</a>
                <a href="#faq" className="hover:text-foreground transition-all w-fit">FAQs</a>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company</h4>
              <div className="flex flex-col space-y-2.5 text-sm text-muted-foreground">
                <a href="#about" className="hover:text-foreground transition-all w-fit">About</a>
                <a href="#contact" className="hover:text-foreground transition-all w-fit">Contact</a>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Legal</h4>
              <div className="flex flex-col space-y-2.5 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-all w-fit">Privacy Policy</a>
                <a href="#" className="hover:text-foreground transition-all w-fit">Terms of Service</a>
                <a href="#" className="hover:text-foreground transition-all w-fit flex items-center gap-1.5">
                  <KeyRound className="h-3 w-3" /> Security
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} {orgSettings.orgName}. Licensed under MIT.</span>
            <span>Built for modern, fast-moving teams.</span>
          </div>
        </div>
      </footer>

      {/* Scroll To Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
            className="fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
