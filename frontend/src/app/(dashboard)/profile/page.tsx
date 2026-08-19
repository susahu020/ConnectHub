'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Loader2, ShieldAlert } from 'lucide-react';
import ImageCropperModal from '../../../components/ImageCropperModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { ProfileHeader } from '../../../components/profile/ProfileHeader';
import { ProfileTabsNav } from '../../../components/profile/ProfileTabsNav';
import { OverviewTab } from '../../../components/profile/tabs/OverviewTab';
import { ActivityTab } from '../../../components/profile/tabs/ActivityTab';
import { SkillsTab } from '../../../components/profile/tabs/SkillsTab';
import { ExperienceTab } from '../../../components/profile/tabs/ExperienceTab';
import { EducationTab } from '../../../components/profile/tabs/EducationTab';
import { SecurityTab } from '../../../components/profile/tabs/SecurityTab';
import { EditBasicModal } from '../../../components/profile/modals/EditBasicModal';
import { AddSkillModal } from '../../../components/profile/modals/AddSkillModal';
import { AddExperienceModal } from '../../../components/profile/modals/AddExperienceModal';
import { AddEducationModal } from '../../../components/profile/modals/AddEducationModal';
import { AddCertModal } from '../../../components/profile/modals/AddCertModal';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const { user: currentUser, updateUser: syncCurrentUserStore } = useAuthStore();
  const isOwnProfile = !targetUserId || targetUserId === currentUser?.id;

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'security' && isOwnProfile ? 'security' : 'overview');
  const mfaSetupRequired = searchParams.get('mfaRequired') === 'true';

  // Profile data now goes through React Query (queryKey: ['profile', id]) so
  // it's covered by the generic data_update broadcast system (see
  // hooks/useSocket.tsx's MODULE_QUERY_KEYS['profile']) instead of the
  // bespoke 'profile_updated' socket event this page used to listen for
  // directly.
  const queryClient = useQueryClient();
  const profileUserId = targetUserId || currentUser?.id;
  const profileQueryKey = ['profile', profileUserId];
  const {
    data: profile,
    isLoading: loading,
    isError: profileLoadError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => (targetUserId ? api.getProfileById(targetUserId) : api.getProfile()),
    enabled: !!profileUserId,
  });

  useEffect(() => {
    if (profileLoadError) {
      toast.error('Failed to load profile details.');
    }
  }, [profileLoadError]);

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
    joiningDate: '',
    timezone: 'UTC',
    workingHours: '9:00 AM - 5:00 PM',
    managerId: '',
    departmentId: '',
    status: 'ONLINE',
    socialLinks: { linkedin: '', github: '', twitter: '', portfolio: '', instagram: '' },
  });

  const [skillForm, setSkillForm] = useState({
    skillName: '',
    level: 'INTERMEDIATE',
    yearsOfExp: 1,
    category: 'Engineering',
    order: 0,
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
    isCurrent: false,
  });

  const [eduForm, setEduForm] = useState({
    institution: '',
    degree: '',
    branch: '',
    startDate: '',
    endDate: '',
    grade: '',
  });

  const [certForm, setCertForm] = useState({
    name: '',
    issuedBy: '',
    issueDate: '',
    expiryDate: '',
    credentialUrl: '',
    certificateUrl: '',
  });

  // Timeline / Activity Logs
  const [activities, setActivities] = useState<any[]>([]);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityLoading, setActivityLoading] = useState(false);

  // File uploads
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Seed the basic-info edit form whenever the fetched profile changes
  // (initial load, refetch after a save, or a live update pushed in via the
  // data_update socket event from another tab/device).
  useEffect(() => {
    if (!profile) return;
    setBasicForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      designation: profile.designation || '',
      bio: profile.bio || '',
      location: profile.location || '',
      phone: profile.phone || '',
      employeeId: profile.employeeId || '',
      employmentType: profile.employmentType || 'FULL_TIME',
      officeLocation: profile.officeLocation || '',
      emergencyContact: profile.emergencyContact || '',
      birthday: profile.birthday ? profile.birthday.split('T')[0] : '',
      joiningDate: profile.joiningDate ? profile.joiningDate.split('T')[0] : '',
      timezone: profile.timezone || 'UTC',
      workingHours: profile.workingHours || '9:00 AM - 5:00 PM',
      managerId: profile.managerId || '',
      departmentId: profile.departmentId || '',
      status: profile.status || 'ONLINE',
      socialLinks: {
        linkedin: profile.socialLinks?.linkedin || '',
        github: profile.socialLinks?.github || '',
        twitter: profile.socialLinks?.twitter || '',
        portfolio: profile.socialLinks?.portfolio || '',
        instagram: profile.socialLinks?.instagram || '',
      },
    });
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'security' && !isOwnProfile) {
      setActiveTab('overview');
    }
  }, [activeTab, isOwnProfile]);

  // Load activities when activeTab changes
  useEffect(() => {
    if (activeTab === 'activity' && profile) {
      loadActivities();
    }
  }, [activeTab, activitySearch]);

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
      queryClient.setQueryData(profileQueryKey, res.user);
      if (isOwnProfile) {
        syncCurrentUserStore(res.user);
      }
      setEditingBasic(false);
      toast.success('Profile details updated successfully.');
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const valid = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!valid.includes(file.type)) {
      toast.error('Unsupported file format. Please upload PNG, JPG, or WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file exceeds 5MB size limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedAvatar = async (croppedFile: File) => {
    setCropperOpen(false);
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('avatar', croppedFile);

    try {
      const res = await api.uploadAvatar(formData);
      queryClient.setQueryData(profileQueryKey, (prev: any) => ({ ...prev, avatarUrl: res.avatarUrl }));
      if (isOwnProfile) {
        syncCurrentUserStore({ ...currentUser!, avatarUrl: res.avatarUrl });
      }
      toast.success('Avatar updated successfully.');
      refetchProfile();
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
      queryClient.setQueryData(profileQueryKey, (prev: any) => ({ ...prev, coverUrl: res.coverUrl }));
      toast.success('Cover banner updated successfully.');
      refetchProfile();
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
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add skill.');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await api.deleteSkill(id);
      toast.success('Skill removed.');
      refetchProfile();
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
        technologies: expForm.technologies.split(',').map((t) => t.trim()).filter(Boolean),
        endDate: expForm.isCurrent ? null : expForm.endDate,
      };
      await api.addExperience(payload);
      setAddingExp(false);
      setExpForm({
        company: '',
        designation: '',
        department: '',
        description: '',
        technologies: '',
        achievements: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
      });
      toast.success('Work experience record added.');
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add experience.');
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      await api.deleteExperience(id);
      toast.success('Experience record deleted.');
      refetchProfile();
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
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add education.');
    }
  };

  const handleDeleteEdu = async (id: string) => {
    try {
      await api.deleteEducation(id);
      toast.success('Education record deleted.');
      refetchProfile();
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
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add certification.');
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await api.deleteCertification(id);
      toast.success('Certification removed.');
      refetchProfile();
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
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        uploadingImage={uploadingImage}
        onAvatarClick={() => avatarInputRef.current?.click()}
        onCoverClick={() => coverInputRef.current?.click()}
        avatarInputRef={avatarInputRef}
        coverInputRef={coverInputRef}
        onAvatarChange={handleAvatarChange}
        onCoverChange={handleCoverChange}
        onEditProfile={() => setEditingBasic(true)}
        onStartChat={handleStartChat}
        completion={completion}
      />

      {mfaSetupRequired && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 dark:text-amber-300">Two-factor authentication is required</p>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              Your organization requires everyone to have 2FA enabled. Set it up below to continue using the rest of the app.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <ProfileTabsNav activeTab={activeTab} onChange={setActiveTab} isOwnProfile={isOwnProfile} />

        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'overview' && <OverviewTab profile={profile} userTasks={userTasks} loadingTasks={loadingTasks} isOwnProfile={isOwnProfile} />}

          {activeTab === 'activity' && (
            <ActivityTab
              activitySearch={activitySearch}
              onActivitySearchChange={setActivitySearch}
              activityLoading={activityLoading}
              activities={activities}
            />
          )}

          {activeTab === 'skills' && (
            <SkillsTab profile={profile} isOwnProfile={isOwnProfile} onAddSkill={() => setAddingSkill(true)} onDeleteSkill={handleDeleteSkill} />
          )}

          {activeTab === 'experience' && (
            <ExperienceTab
              profile={profile}
              isOwnProfile={isOwnProfile}
              onAddExperience={() => setAddingExp(true)}
              onDeleteExperience={handleDeleteExperience}
            />
          )}

          {activeTab === 'education' && (
            <EducationTab
              profile={profile}
              isOwnProfile={isOwnProfile}
              onAddEducation={() => setAddingEdu(true)}
              onDeleteEducation={handleDeleteEdu}
              onAddCert={() => setAddingCert(true)}
              onDeleteCert={handleDeleteCert}
            />
          )}

          {activeTab === 'security' && isOwnProfile && <SecurityTab profile={profile} />}
        </div>
      </div>

      <EditBasicModal
        open={editingBasic}
        onClose={() => setEditingBasic(false)}
        form={basicForm}
        onFormChange={setBasicForm}
        profile={profile}
        onSubmit={handleSaveBasic}
      />

      <AddSkillModal open={addingSkill} onClose={() => setAddingSkill(false)} form={skillForm} onFormChange={setSkillForm} onSubmit={handleAddSkill} />

      <AddExperienceModal open={addingExp} onClose={() => setAddingExp(false)} form={expForm} onFormChange={setExpForm} onSubmit={handleAddExperience} />

      <AddEducationModal open={addingEdu} onClose={() => setAddingEdu(false)} form={eduForm} onFormChange={setEduForm} onSubmit={handleAddEducation} />

      <AddCertModal open={addingCert} onClose={() => setAddingCert(false)} form={certForm} onFormChange={setCertForm} onSubmit={handleAddCert} />

      <ImageCropperModal isOpen={cropperOpen} imageSrc={cropperImageSrc} onClose={() => setCropperOpen(false)} onCrop={handleCroppedAvatar} />
    </div>
  );
}
