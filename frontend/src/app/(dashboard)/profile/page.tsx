'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  User, 
  MapPin, 
  Phone, 
  Tag, 
  Loader2, 
  Compass, 
  Plus, 
  X, 
  Layers, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Shield, 
  Settings, 
  Activity, 
  Calendar, 
  Mail, 
  FileText, 
  CheckCircle, 
  Clock, 
  Globe, 
  ArrowRight, 
  Upload, 
  Pencil, 
  Trash2, 
  ShieldAlert, 
  Key, 
  HelpCircle,
  MessageSquare,
  PhoneCall,
  Check,
  ChevronRight,
  ExternalLink,
  Lock,
  ChevronDown,
  Trello
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');
  
  const { user: currentUser, updateUser: syncCurrentUserStore } = useAuthStore();
  const isOwnProfile = !targetUserId || targetUserId === currentUser?.id;
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: userTasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['profile-tasks', profile?.id],
    queryFn: () => api.getTasks(`assigneeId=${profile.id}`),
    enabled: !!profile?.id,
  });
  
  // Modals state
  const [editingBasic, setEditingBasic] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [addingExp, setAddingExp] = useState(false);
  const [addingEdu, setAddingEdu] = useState(false);
  const [addingCert, setAddingCert] = useState(false);
  
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  
  // Edit forms states
  const [basicForm, setBasicForm] = useState({
    firstName: '',
    lastName: '',
    designation: '',
    bio: '',
    location: '',
    phone: '',
    employeeId: '',
    employmentType: 'FULL_TIME',
    officeLocation: '',
    emergencyContact: '',
    birthday: '',
    timezone: 'UTC',
    workingHours: '9:00 AM - 5:00 PM',
    managerId: '',
    departmentId: '',
    status: 'ONLINE',
    socialLinks: { linkedin: '', github: '', twitter: '', portfolio: '', instagram: '' }
  });
  
  const [skillForm, setSkillForm] = useState({
    skillName: '',
    level: 'INTERMEDIATE',
    yearsOfExp: 1,
    category: 'Engineering',
    order: 0
  });

  const [expForm, setExpForm] = useState({
    company: '',
    designation: '',
    department: '',
    description: '',
    technologies: '',
    achievements: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  });

  const [eduForm, setEduForm] = useState({
    institution: '',
    degree: '',
    branch: '',
    startDate: '',
    endDate: '',
    grade: ''
  });

  const [certForm, setCertForm] = useState({
    name: '',
    issuedBy: '',
    issueDate: '',
    expiryDate: '',
    credentialUrl: '',
    certificateUrl: ''
  });

  // Timeline / Activity Logs
  const [activities, setActivities] = useState<any[]>([]);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityLoading, setActivityLoading] = useState(false);

  // File uploads
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Managers directory list for picker
  const [colleaguesList, setColleaguesList] = useState<any[]>([]);

  // Fetch full profile info
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = targetUserId 
        ? await api.getProfileById(targetUserId)
        : await api.getProfile();
      setProfile(data);
      
      // Seed basic edit form
      setBasicForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        designation: data.designation || '',
        bio: data.bio || '',
        location: data.location || '',
        phone: data.phone || '',
        employeeId: data.employeeId || '',
        employmentType: data.employmentType || 'FULL_TIME',
        officeLocation: data.officeLocation || '',
        emergencyContact: data.emergencyContact || '',
        birthday: data.birthday ? data.birthday.split('T')[0] : '',
        timezone: data.timezone || 'UTC',
        workingHours: data.workingHours || '9:00 AM - 5:00 PM',
        managerId: data.managerId || '',
        departmentId: data.departmentId || '',
        status: data.status || 'ONLINE',
        socialLinks: {
          linkedin: data.socialLinks?.linkedin || '',
          github: data.socialLinks?.github || '',
          twitter: data.socialLinks?.twitter || '',
          portfolio: data.socialLinks?.portfolio || '',
          instagram: data.socialLinks?.instagram || '',
        }
      });
    } catch (err) {
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetUserId]);

  // Load activities when activeTab changes
  useEffect(() => {
    if (activeTab === 'activity' && profile) {
      loadActivities();
    }
  }, [activeTab, activitySearch]);

  // Fetch colleagues directory and departments list
  useEffect(() => {
    if (isOwnProfile) {
      const loadColleaguesAndDeps = async () => {
        try {
          const res = await api.getDirectory('limit=100');
          setColleaguesList(res.users || []);
          const resDeps = await api.getDepartments();
          setDepartmentsList(resDeps || []);
        } catch (err) {
          console.error(err);
        }
      };
      loadColleaguesAndDeps();
    }
  }, [isOwnProfile]);

  const loadActivities = async () => {
    setActivityLoading(true);
    try {
      const params = `userId=${profile.id}&search=${activitySearch}`;
      const res = await api.getUserActivity(params);
      setActivities(res.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  // Profile completion helper
  const getCompletionStats = (p: any) => {
    if (!p) return { score: 0, missing: [] };
    let score = 0;
    const missing = [];
    if (p.avatarUrl) score += 10; else missing.push('Avatar Photo');
    if (p.coverUrl) score += 5; else missing.push('Cover Banner');
    if (p.bio) score += 10; else missing.push('Personal Bio');
    if (p.userSkills && p.userSkills.length > 0) score += 15; else missing.push('Competency Skills');
    if (p.experiences && p.experiences.length > 0) score += 15; else missing.push('Work Experiences');
    if (p.educations && p.educations.length > 0) score += 10; else missing.push('Education Records');
    if (p.phone || p.location) score += 10; else missing.push('Contact Details');
    if (p.employeeId) score += 10; else missing.push('Employee ID');
    if (p.settings) score += 5; else missing.push('Preferences Settings');
    if (p.twoFactorEnabled) score += 10; else missing.push('Enable 2FA Security');
    return { score, missing };
  };

  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...basicForm,
        birthday: basicForm.birthday ? new Date(basicForm.birthday).toISOString() : null,
      };
      const res = await api.updateProfile(payload);
      setProfile(res.user);
      if (isOwnProfile) {
        syncCurrentUserStore(res.user);
      }
      setEditingBasic(false);
      toast.success('Profile details updated successfully.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate format
    const valid = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!valid.includes(file.type)) {
      toast.error('Unsupported file format. Please upload PNG, JPG, or WEBP.');
      return;
    }
    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file exceeds 5MB size limit.');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const res = await api.uploadAvatar(formData);
      setProfile((prev: any) => ({ ...prev, avatarUrl: res.avatarUrl }));
      if (isOwnProfile) {
        syncCurrentUserStore({ ...currentUser!, avatarUrl: res.avatarUrl });
      }
      toast.success('Avatar updated successfully.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Avatar upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const valid = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!valid.includes(file.type)) {
      toast.error('Unsupported cover photo format.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Cover photo exceeds 8MB size limit.');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('cover', file);

    try {
      const res = await api.uploadCover(formData);
      setProfile((prev: any) => ({ ...prev, coverUrl: res.coverUrl }));
      toast.success('Cover banner updated successfully.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Cover photo upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Skill handles
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addSkill(skillForm);
      setAddingSkill(false);
      setSkillForm({ skillName: '', level: 'INTERMEDIATE', yearsOfExp: 1, category: 'Engineering', order: 0 });
      toast.success('Skill added successfully.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add skill.');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await api.deleteSkill(id);
      toast.success('Skill removed.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete skill.');
    }
  };

  // Experience handles
  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...expForm,
        technologies: expForm.technologies.split(',').map(t => t.trim()).filter(Boolean),
        endDate: expForm.isCurrent ? null : expForm.endDate
      };
      await api.addExperience(payload);
      setAddingExp(false);
      setExpForm({ company: '', designation: '', department: '', description: '', technologies: '', achievements: '', startDate: '', endDate: '', isCurrent: false });
      toast.success('Work experience record added.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add experience.');
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      await api.deleteExperience(id);
      toast.success('Experience record deleted.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete experience.');
    }
  };

  // Education handles
  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addEducation(eduForm);
      setAddingEdu(false);
      setEduForm({ institution: '', degree: '', branch: '', startDate: '', endDate: '', grade: '' });
      toast.success('Education record added.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add education.');
    }
  };

  const handleDeleteEdu = async (id: string) => {
    try {
      await api.deleteEducation(id);
      toast.success('Education record deleted.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete education.');
    }
  };

  // Certification handles
  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addCertification(certForm);
      setAddingCert(false);
      setCertForm({ name: '', issuedBy: '', issueDate: '', expiryDate: '', credentialUrl: '', certificateUrl: '' });
      toast.success('Certification credential added.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add certification.');
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await api.deleteCertification(id);
      toast.success('Certification removed.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove certification.');
    }
  };

  const handleStartChat = () => {
    if (profile) {
      router.push(`/chat?userId=${profile.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-semibold">Retrieving workspace profile information...</p>
      </div>
    );
  }

  const completion = getCompletionStats(profile);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Cover image & Profile header */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm relative group">
        {/* Cover Photo */}
        <div className="h-44 md:h-64 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
          {profile?.coverUrl ? (
            <img src={profile.coverUrl} alt="Cover Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-sky-400 to-indigo-500 opacity-80" />
          )}
          {isOwnProfile && (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-md"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Change Cover</span>
            </button>
          )}
          <input 
            type="file" 
            ref={coverInputRef} 
            onChange={handleCoverChange} 
            className="hidden" 
            accept="image/*"
          />
        </div>

        {/* Avatar, Info, Action details bar */}
        <div className="p-6 md:p-8 pt-0 relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          {/* Avatar layer overlap */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-5 -mt-16 md:-mt-20">
            <div className="relative group/avatar">
              <div className="h-28 w-28 md:h-36 md:w-36 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-4xl font-black uppercase text-slate-500 overflow-hidden border-4 border-white dark:border-slate-900 shadow-lg relative">
                {uploadingImage ? (
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white"
                >
                  <Upload className="h-6 w-6" />
                </button>
              )}
              <input 
                type="file" 
                ref={avatarInputRef} 
                onChange={handleAvatarChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
            
            {/* User Meta info */}
            <div className="text-center md:text-left space-y-1 pb-1">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {profile?.firstName} {profile?.lastName}
                </h1>
                <span className={`h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                  profile?.status === 'ONLINE' ? 'bg-green-500' :
                  profile?.status === 'AWAY' ? 'bg-amber-500' :
                  profile?.status === 'BUSY' ? 'bg-red-500' :
                  profile?.status === 'DND' ? 'bg-rose-600' :
                  profile?.status === 'IN_MEETING' ? 'bg-indigo-500' :
                  profile?.status === 'ON_LEAVE' ? 'bg-sky-500' :
                  'bg-slate-400'
                }`} />
              </div>
              <p className="text-sm font-extrabold text-primary uppercase tracking-wider">{profile?.designation || 'Specialist'}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground font-semibold">
                {profile?.department && (
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-slate-405" />
                    {profile.department.name}
                  </span>
                )}
                {profile?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-405" />
                    {profile.location}
                  </span>
                )}
                {profile?.employeeId && (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase">
                    ID: {profile.employeeId}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center justify-center gap-3">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => setEditingBasic(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-sm border border-slate-200 dark:border-slate-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Profile</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartChat}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-sm shadow-primary/20"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Send Message</span>
                </button>
                <button
                  onClick={() => toast.success('Calling feature simulation initiated.')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 border dark:border-slate-700"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>Voice Call</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Completion box (Only show on own profile) */}
        {isOwnProfile && completion.score < 100 && (
          <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-primary/5 to-indigo-500/5 border border-primary/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase text-primary tracking-wider">Profile Strength</span>
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">{completion.score}% Complete</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold">
                {completion.missing.length > 0 
                  ? `Tip: Add your ${completion.missing.slice(0, 3).join(', ')} to stand out.`
                  : 'Your workspace profile is fully completed!'}
              </p>
            </div>
            <div className="w-full md:w-64 bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden shrink-0">
              <div className="bg-gradient-to-r from-primary to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${completion.score}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Main Tabbed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Tab Selector Column */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-4 space-y-1.5 shadow-sm">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'activity', label: 'Activity Timeline', icon: Activity },
            { id: 'skills', label: 'Expertise Skills', icon: Tag },
            { id: 'experience', label: 'Work Experience', icon: Briefcase },
            { id: 'education', label: 'Education & Certs', icon: GraduationCap },
            { id: 'security', label: 'Security & Sessions', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all text-xs font-bold ${
                  active 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Content Panel */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Bio description */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">About Me</h3>
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium italic">
                  {profile?.bio || '"No bio information has been updated yet. Click edit profile to add details about your role, achievements, or workspace highlights."'}
                </p>
              </div>

              {/* Quick Details specs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Employee Information</h3>
                  <div className="space-y-3 text-xs font-semibold">
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">Office Location</span>
                      <span className="text-slate-800 dark:text-slate-205">{profile?.officeLocation || 'Main HQ'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">Employment Type</span>
                      <span className="text-slate-800 dark:text-slate-205 uppercase text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {profile?.employmentType || 'FULL_TIME'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">Working Hours</span>
                      <span className="text-slate-850 dark:text-slate-200">{profile?.workingHours || '9:00 AM - 5:00 PM'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">Timezone</span>
                      <span className="text-slate-850 dark:text-slate-200">{profile?.timezone || 'UTC'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">Emergency Contact</span>
                      <span className="text-slate-850 dark:text-slate-200">{profile?.emergencyContact || 'Not Specified'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">Last Login</span>
                      <span className="text-slate-850 dark:text-slate-200">
                        {profile?.lastLoginAt 
                          ? new Date(profile.lastLoginAt).toLocaleString() 
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Contact & Social Channels</h3>
                  <div className="space-y-3 text-xs font-semibold">
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">Work Email</span>
                      <span className="text-slate-850 dark:text-slate-200">{profile?.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">Contact Phone</span>
                      <span className="text-slate-850 dark:text-slate-200">{profile?.phone || 'Not Specified'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">LinkedIn</span>
                      {profile?.socialLinks?.linkedin ? (
                        <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          View profile <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Not Linked</span>
                      )}
                    </div>
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">GitHub</span>
                      {profile?.socialLinks?.github ? (
                        <a href={profile.socialLinks.github} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          View repository <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Not Linked</span>
                      )}
                    </div>
                    <div className="flex justify-between py-1 border-b dark:border-slate-800">
                      <span className="text-muted-foreground">Portfolio</span>
                      {profile?.socialLinks?.portfolio ? (
                        <a href={profile.socialLinks.portfolio} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          Visit Site <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Not Linked</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Task Allocations Card */}
                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider flex items-center space-x-1.5">
                      <Trello className="h-4 w-4 text-primary" />
                      <span>Task Allocations</span>
                    </h3>

                    {loadingTasks ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs font-semibold">
                        <div className="flex justify-between py-1 border-b dark:border-slate-800">
                          <span className="text-muted-foreground">Total Assigned</span>
                          <span className="text-slate-850 dark:text-slate-200">{userTasks?.length || 0} tasks</span>
                        </div>
                        <div className="flex justify-between py-1 border-b dark:border-slate-800">
                          <span className="text-muted-foreground">In Progress</span>
                          <span className="text-blue-500 font-bold">{userTasks?.filter((t: any) => t.status === 'IN_PROGRESS').length || 0} tasks</span>
                        </div>
                        <div className="flex justify-between py-1 border-b dark:border-slate-800">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="text-green-500 font-bold">{userTasks?.filter((t: any) => t.status === 'COMPLETED').length || 0} tasks</span>
                        </div>
                        <div className="flex justify-between py-1 border-b dark:border-slate-800">
                          <span className="text-muted-foreground">Under Review</span>
                          <span className="text-amber-500 font-bold">{userTasks?.filter((t: any) => t.status === 'UNDER_REVIEW').length || 0} tasks</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {!loadingTasks && userTasks && userTasks.length > 0 && (
                    <div className="pt-2">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                          style={{ 
                            width: `${(userTasks.filter((t: any) => t.status === 'COMPLETED').length / userTasks.length * 100).toFixed(0)}%` 
                          }} 
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
                        <span>Task Completion rate</span>
                        <span>{(userTasks.filter((t: any) => t.status === 'COMPLETED').length / userTasks.length * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Organization reporting structures chart */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Reporting Hierarchy</h3>
                
                <div className="space-y-4">
                  {/* Reporting Manager node */}
                  {profile?.manager ? (
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Reporting Manager</span>
                      <div 
                        onClick={() => router.push(`/profile?userId=${profile.manager.id}`)}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border dark:border-slate-700/60 rounded-2xl cursor-pointer transition-all w-full md:w-80"
                      >
                        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex items-center justify-center font-bold text-slate-500 uppercase">
                          {profile.manager.avatarUrl ? (
                            <img src={profile.manager.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            `${profile.manager.firstName[0]}${profile.manager.lastName[0]}`
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{profile.manager.firstName} {profile.manager.lastName}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{profile.manager.designation || 'Manager'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground font-medium italic">No manager hierarchy specified.</p>
                  )}

                  {/* Direct Reports nodes */}
                  {profile?.directReports && profile.directReports.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Direct Reports ({profile.directReports.length})</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.directReports.map((report: any) => (
                          <div 
                            key={report.id}
                            onClick={() => router.push(`/profile?userId=${report.id}`)}
                            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border dark:border-slate-700/60 rounded-2xl cursor-pointer transition-all"
                          >
                            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex items-center justify-center font-bold text-slate-500 uppercase">
                              {report.avatarUrl ? (
                                <img src={report.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                `${report.firstName[0]}${report.lastName[0]}`
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold">{report.firstName} {report.lastName}</p>
                              <p className="text-[10px] text-muted-foreground font-semibold">{report.designation || 'Staff Colleague'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACTIVITY TIMELINE */}
          {activeTab === 'activity' && (
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Workspace Activity</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Logs of recent profile shifts, uploads, and edits.</p>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="pl-8 pr-4 py-2 border dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 focus:outline-none w-48 font-semibold"
                  />
                  <Compass className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {activityLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : activities.length > 0 ? (
                <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-6">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      {/* Circle bullet */}
                      <span className="absolute -left-[30px] top-1.5 h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      <div className="space-y-1 text-xs font-semibold">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">{act.action}</p>
                          <span className="text-[9px] text-slate-400">{new Date(act.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">{act.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-12 font-semibold">No recent activity logs matched this search.</p>
              )}
            </div>
          )}

          {/* TAB: SKILLS */}
          {activeTab === 'skills' && (
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Expertise & Competencies</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Verified tags, skill categories, and years of experience indicators.</p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => setAddingSkill(true)}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Skill</span>
                  </button>
                )}
              </div>

              {profile?.userSkills && profile.userSkills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.userSkills.map((sk: any) => (
                    <div 
                      key={sk.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-900 dark:text-white">{sk.skillName}</p>
                          <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">
                            {sk.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                          <span>{sk.yearsOfExp} Years Exp</span>
                          {sk.category && (
                            <>
                              <span className="h-1 w-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                              <span>{sk.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isOwnProfile && (
                        <button
                          onClick={() => handleDeleteSkill(sk.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-12 font-semibold">No expertise skills have been logged yet.</p>
              )}
            </div>
          )}

          {/* TAB: WORK EXPERIENCE */}
          {activeTab === 'experience' && (
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Professional Work History</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Timeline track of companies, designations, and achievements.</p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => setAddingExp(true)}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Experience</span>
                  </button>
                )}
              </div>

              {profile?.experiences && profile.experiences.length > 0 ? (
                <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-8">
                  {profile.experiences.map((exp: any) => (
                    <div key={exp.id} className="relative group">
                      <span className="absolute -left-[30px] top-1 h-4 w-4 rounded-full bg-white dark:bg-slate-900 border-2 border-primary flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      
                      <div className="space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 text-xs">
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{exp.designation}</h4>
                            <p className="text-primary font-bold text-xs mt-0.5">{exp.company} {exp.department ? `· ${exp.department}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-muted-foreground font-bold">
                              {new Date(exp.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })} – {
                                exp.isCurrent ? 'Present' : new Date(exp.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
                              }
                            </span>
                            {isOwnProfile && (
                              <button
                                onClick={() => handleDeleteExperience(exp.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {exp.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{exp.description}</p>
                        )}
                        
                        {exp.achievements && (
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-[10px] uppercase text-slate-400 tracking-wider block mb-0.5">Key Achievements</span>
                            <p className="italic">{exp.achievements}</p>
                          </div>
                        )}

                        {exp.technologies && exp.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {exp.technologies.map((tech: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[9px] font-bold">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-12 font-semibold">No work experiences registered on this profile.</p>
              )}
            </div>
          )}

          {/* TAB: EDUCATION & CERTS */}
          {activeTab === 'education' && (
            <div className="space-y-6">
              
              {/* Education section */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Education Credentials</h3>
                  {isOwnProfile && (
                    <button
                      onClick={() => setAddingEdu(true)}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Education</span>
                    </button>
                  )}
                </div>

                {profile?.educations && profile.educations.length > 0 ? (
                  <div className="space-y-5">
                    {profile.educations.map((edu: any) => (
                      <div key={edu.id} className="flex items-start justify-between border-b dark:border-slate-800 last:border-0 pb-4 last:pb-0 gap-4">
                        <div className="space-y-1 text-xs">
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{edu.institution}</h4>
                          <p className="text-primary font-bold">{edu.degree} {edu.branch ? `in ${edu.branch}` : ''}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                            {edu.grade && <span>Grade: {edu.grade}</span>}
                            {(edu.startDate || edu.endDate) && (
                              <span>
                                {edu.startDate ? new Date(edu.startDate).getFullYear() : ''} – {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
                              </span>
                            )}
                          </div>
                        </div>
                        {isOwnProfile && (
                          <button
                            onClick={() => handleDeleteEdu(edu.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8 font-semibold">No educational history recorded.</p>
                )}
              </div>

              {/* Certifications section */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Professional Certifications</h3>
                  {isOwnProfile && (
                    <button
                      onClick={() => setAddingCert(true)}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Certificate</span>
                    </button>
                  )}
                </div>

                {profile?.certifications && profile.certifications.length > 0 ? (
                  <div className="space-y-4">
                    {profile.certifications.map((cert: any) => (
                      <div key={cert.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                        <div className="space-y-1 text-xs">
                          <p className="font-extrabold text-slate-900 dark:text-white text-sm">{cert.name}</p>
                          <p className="text-slate-500 font-bold text-xs">Issued by: {cert.issuedBy}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">
                            Issued: {new Date(cert.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {cert.credentialUrl && (
                            <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="p-1.5 text-primary hover:bg-primary/10 rounded-lg">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {isOwnProfile && (
                            <button
                              onClick={() => handleDeleteCert(cert.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8 font-semibold">No certifications logged.</p>
                )}
              </div>

            </div>
          )}

          {/* TAB: SECURITY & SESSIONS */}
          {activeTab === 'security' && (
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Account Credentials & Security</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Manage session tokens, password rules, and 2FA status.</p>
              </div>

              <div className="space-y-4">
                {/* 2FA Quick Status */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border dark:border-slate-800 text-xs font-semibold">
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-[10px]">Two-Factor Authentication (2FA)</p>
                    <p className="text-muted-foreground font-medium">Adds an extra layer of verify locks to your login entries.</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                    profile?.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {profile?.twoFactorEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="p-4 border dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-450">
                    <Shield className="h-4 w-4" />
                    <span>Security Settings Links</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                    To modify your login passcodes, enable OTP double lockouts, or disconnect old device sessions, visit the main settings page.
                  </p>
                  <button
                    onClick={() => router.push('/settings')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-extrabold transition-all"
                  >
                    Go to Settings Console
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* DIALOG MODAL: EDIT BASIC DETAILS */}
      {editingBasic && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5 text-xs font-semibold">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Profile Details</h3>
              <button onClick={() => setEditingBasic(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBasic} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">First Name</label>
                  <input
                    type="text"
                    required
                    value={basicForm.firstName}
                    onChange={(e) => setBasicForm({ ...basicForm, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Last Name</label>
                  <input
                    type="text"
                    required
                    value={basicForm.lastName}
                    onChange={(e) => setBasicForm({ ...basicForm, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Designation</label>
                  <input
                    type="text"
                    value={basicForm.designation}
                    onChange={(e) => setBasicForm({ ...basicForm, designation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Employee ID</label>
                  <input
                    type="text"
                    value={basicForm.employeeId}
                    onChange={(e) => setBasicForm({ ...basicForm, employeeId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Office Location</label>
                  <input
                    type="text"
                    value={basicForm.officeLocation}
                    onChange={(e) => setBasicForm({ ...basicForm, officeLocation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Employment Type</label>
                  <select
                    value={basicForm.employmentType}
                    onChange={(e) => setBasicForm({ ...basicForm, employmentType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    value={basicForm.phone}
                    onChange={(e) => setBasicForm({ ...basicForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Emergency Contact</label>
                  <input
                    type="text"
                    value={basicForm.emergencyContact}
                    onChange={(e) => setBasicForm({ ...basicForm, emergencyContact: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Birthday</label>
                  <input
                    type="date"
                    value={basicForm.birthday}
                    onChange={(e) => setBasicForm({ ...basicForm, birthday: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Reporting Manager</label>
                  <select
                    value={basicForm.managerId}
                    onChange={(e) => setBasicForm({ ...basicForm, managerId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  >
                    <option value="">No Manager Selected</option>
                    {colleaguesList.filter(u => u.id !== profile?.id).map((colleague) => (
                      <option key={colleague.id} value={colleague.id}>
                        {colleague.firstName} {colleague.lastName} ({colleague.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Timezone</label>
                  <input
                    type="text"
                    value={basicForm.timezone}
                    onChange={(e) => setBasicForm({ ...basicForm, timezone: e.target.value })}
                    placeholder="e.g. Asia/Kolkata, UTC"
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Working Hours</label>
                  <input
                    type="text"
                    value={basicForm.workingHours}
                    onChange={(e) => setBasicForm({ ...basicForm, workingHours: e.target.value })}
                    placeholder="e.g. 9:00 AM - 5:00 PM"
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Department</label>
                  <select
                    value={basicForm.departmentId}
                    onChange={(e) => setBasicForm({ ...basicForm, departmentId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-850 dark:border-slate-700 focus:outline-none text-slate-800 dark:text-slate-200"
                  >
                    <option value="">No Department</option>
                    {departmentsList.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Presence Status</label>
                  <select
                    value={basicForm.status}
                    onChange={(e) => setBasicForm({ ...basicForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-850 dark:border-slate-700 focus:outline-none text-slate-800 dark:text-slate-200"
                  >
                    <option value="ONLINE">ONLINE (Available)</option>
                    <option value="AWAY">AWAY</option>
                    <option value="BUSY">BUSY</option>
                    <option value="DND">DO NOT DISTURB</option>
                    <option value="IN_MEETING">IN MEETING</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                    <option value="OFFLINE">OFFLINE (Invisible)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider">Personal Bio / About</label>
                <textarea
                  value={basicForm.bio}
                  onChange={(e) => setBasicForm({ ...basicForm, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-2 border-t dark:border-slate-800 pt-3">
                <span className="text-[10px] font-black uppercase text-slate-450 block">Social URLs</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 text-[9px]">LinkedIn URL</label>
                    <input
                      type="url"
                      value={basicForm.socialLinks.linkedin}
                      onChange={(e) => setBasicForm({
                        ...basicForm,
                        socialLinks: { ...basicForm.socialLinks, linkedin: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 text-[9px]">GitHub URL</label>
                    <input
                      type="url"
                      value={basicForm.socialLinks.github}
                      onChange={(e) => setBasicForm({
                        ...basicForm,
                        socialLinks: { ...basicForm.socialLinks, github: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBasic(false)}
                  className="px-4 py-2 border dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-xl shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG MODAL: ADD EXPERTISE SKILL */}
      {addingSkill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs font-semibold">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Add Professional Skill</h3>
              <button onClick={() => setAddingSkill(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddSkill} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Skill Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React, PostgreSQL, Docker"
                  value={skillForm.skillName}
                  onChange={(e) => setSkillForm({ ...skillForm, skillName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Expertise Level</label>
                  <select
                    value={skillForm.level}
                    onChange={(e) => setSkillForm({ ...skillForm, level: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Years Experience</label>
                  <input
                    type="number"
                    min={0}
                    value={skillForm.yearsOfExp}
                    onChange={(e) => setSkillForm({ ...skillForm, yearsOfExp: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Skill Category</label>
                <input
                  type="text"
                  placeholder="e.g. Frontend, Backend, UI/UX"
                  value={skillForm.category}
                  onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button type="button" onClick={() => setAddingSkill(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl">Add Skill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG MODAL: ADD WORK EXPERIENCE */}
      {addingExp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 text-xs font-semibold">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Add Work Experience</h3>
              <button onClick={() => setAddingExp(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddExperience} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Company Name</label>
                  <input
                    type="text"
                    required
                    value={expForm.company}
                    onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Role / Designation</label>
                  <input
                    type="text"
                    required
                    value={expForm.designation}
                    onChange={(e) => setExpForm({ ...expForm, designation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Department (Optional)</label>
                <input
                  type="text"
                  value={expForm.department}
                  onChange={(e) => setExpForm({ ...expForm, department: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Start Date</label>
                  <input
                    type="date"
                    required
                    value={expForm.startDate}
                    onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">End Date</label>
                  <input
                    type="date"
                    disabled={expForm.isCurrent}
                    value={expForm.endDate}
                    onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={expForm.isCurrent}
                  onChange={(e) => setExpForm({ ...expForm, isCurrent: e.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="isCurrent" className="text-xs text-slate-750 dark:text-slate-300">I am currently working in this role</label>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Technologies (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. React, Node.js, TypeScript"
                  value={expForm.technologies}
                  onChange={(e) => setExpForm({ ...expForm, technologies: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Role Description</label>
                <textarea
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Key Achievements</label>
                <input
                  type="text"
                  placeholder="e.g. Delivered 40% performance enhancement on backend REST gateways"
                  value={expForm.achievements}
                  onChange={(e) => setExpForm({ ...expForm, achievements: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button type="button" onClick={() => setAddingExp(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl">Save Experience</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG MODAL: ADD EDUCATION */}
      {addingEdu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs font-semibold">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Add Education History</h3>
              <button onClick={() => setAddingEdu(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddEducation} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Institution / School</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stanford University"
                  value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Degree / Qualification</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bachelor of Science"
                    value={eduForm.degree}
                    onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Branch / Field of Study</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={eduForm.branch}
                    onChange={(e) => setEduForm({ ...eduForm, branch: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Start Date</label>
                  <input
                    type="date"
                    value={eduForm.startDate}
                    onChange={(e) => setEduForm({ ...eduForm, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">End Date</label>
                  <input
                    type="date"
                    value={eduForm.endDate}
                    onChange={(e) => setEduForm({ ...eduForm, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Grade / GPA (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 3.8 / A+"
                  value={eduForm.grade}
                  onChange={(e) => setEduForm({ ...eduForm, grade: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button type="button" onClick={() => setAddingEdu(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl">Save Education</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG MODAL: ADD CERTIFICATION */}
      {addingCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs font-semibold">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Add Professional Certificate</h3>
              <button onClick={() => setAddingCert(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCert} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Certificate Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Certified Solutions Architect"
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Issued By</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amazon Web Services, Google"
                  value={certForm.issuedBy}
                  onChange={(e) => setCertForm({ ...certForm, issuedBy: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={certForm.issueDate}
                    onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={certForm.expiryDate}
                    onChange={(e) => setCertForm({ ...certForm, expiryDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Credential URL</label>
                <input
                  type="url"
                  placeholder="e.g. https://badges.aws.amazon.com/..."
                  value={certForm.credentialUrl}
                  onChange={(e) => setCertForm({ ...certForm, credentialUrl: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button type="button" onClick={() => setAddingCert(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl">Add Certificate</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
